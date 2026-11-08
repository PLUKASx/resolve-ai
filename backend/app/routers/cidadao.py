import os
import time
import uuid

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from .. import models, schemas, serializers
from ..database import BASE_DIR, get_db
from ..security import get_cidadao_atual
from ..services import criticidade, geo, roteamento
from ..tempo import agora as agora_br

router = APIRouter(prefix="/api/ocorrencias", tags=["Cidadão"])

UPLOAD_DIR = BASE_DIR / "uploads"
TAMANHO_MAX_FOTO = 5 * 1024 * 1024
MARCAS_HEIC = {b"heic", b"heix", b"hevc", b"hevx", b"heim", b"heis", b"mif1", b"msf1"}

IDADE_MAXIMA_GPS_S = 5 * 60
DESCRICAO_MINIMA = 10


def precisao_maxima_m() -> int:
    try:
        return max(1, int(os.getenv("GPS_PRECISAO_MAXIMA_M", "1000")))
    except ValueError:
        return 1000


def _validar_gps(latitude: float, longitude: float, precisao: float, capturado_em: int) -> None:
    if not (-90 <= latitude <= 90 and -180 <= longitude <= 180) or (latitude == 0 and longitude == 0):
        raise HTTPException(422, "Coordenadas de GPS inválidas.")
    limite = precisao_maxima_m()
    if precisao <= 0 or precisao > limite:
        raise HTTPException(
            422,
            "A localização está aproximada. Permita a localização exata do celular e tente novamente.",
        )
    idade_s = abs(time.time() - capturado_em / 1000)
    if idade_s > IDADE_MAXIMA_GPS_S:
        raise HTTPException(
            422,
            "A localização precisa ser capturada no momento da denúncia. Atualize o GPS e envie novamente.",
        )


def _tipo_da_imagem(conteudo: bytes) -> str | None:
    if conteudo.startswith(b"\xff\xd8\xff"):
        return ".jpg"
    if conteudo.startswith(b"\x89PNG\r\n\x1a\n"):
        return ".png"
    if conteudo[:4] == b"RIFF" and conteudo[8:12] == b"WEBP":
        return ".webp"
    if conteudo[4:8] == b"ftyp" and conteudo[8:12] in MARCAS_HEIC:
        return ".heic"
    return None


def _salvar_foto(foto: UploadFile) -> str:
    conteudo = foto.file.read(TAMANHO_MAX_FOTO + 1)
    if len(conteudo) > TAMANHO_MAX_FOTO:
        raise HTTPException(status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, "A foto deve ter no máximo 5 MB.")
    ext = _tipo_da_imagem(conteudo)
    if ext is None:
        raise HTTPException(422, "A foto deve ser JPG, PNG, WEBP ou HEIC.")
    UPLOAD_DIR.mkdir(exist_ok=True)
    nome = f"{uuid.uuid4().hex}{ext}"
    (UPLOAD_DIR / nome).write_bytes(conteudo)
    return f"/uploads/{nome}"


@router.post("", response_model=schemas.OcorrenciaDetalhe, status_code=201)
def registrar_ocorrencia(
    categoria: str = Form(...),
    descricao: str = Form("", max_length=1000),
    latitude: float = Form(...),
    longitude: float = Form(...),
    precisao: float = Form(...),
    capturado_em: int = Form(..., description="Timestamp (ms) da leitura do GPS"),
    foto: UploadFile | None = File(None),
    cidadao: models.Cidadao = Depends(get_cidadao_atual),
    db: Session = Depends(get_db),
):
    if categoria not in criticidade.PESOS_CATEGORIA:
        raise HTTPException(422, "Categoria inválida.")
    descricao = descricao.strip()
    if len(descricao) < DESCRICAO_MINIMA:
        raise HTTPException(422, f"Descreva o problema com pelo menos {DESCRICAO_MINIMA} caracteres.")
    _validar_gps(latitude, longitude, precisao, capturado_em)
    if foto is None or not foto.filename:
        raise HTTPException(422, "Tire uma foto do problema para registrar a denúncia.")

    foto_url = _salvar_foto(foto)
    departamento = roteamento.departamento_para(db, categoria)
    agora = agora_br()

    oc = models.Ocorrencia(
        categoria=categoria,
        descricao=descricao,
        latitude=latitude,
        longitude=longitude,
        precisao_gps=round(precisao, 1),
        bairro=geo.bairro_mais_proximo(latitude, longitude),
        status="Aberta",
        foto_url=foto_url,
        data_registro=agora,
        data_atualizacao=agora,
        cidadao=cidadao,
        departamento=departamento,
    )
    db.add(oc)
    db.flush()
    criticidade.recalcular(db, oc)
    destino = departamento.nome_setor if departamento else "triagem manual"
    oc.historico.append(models.HistoricoStatus(
        status="Aberta",
        observacao=f"Ocorrência registrada e encaminhada automaticamente para {destino}.",
        autor="Sistema",
        data=agora,
    ))
    db.commit()
    db.refresh(oc)
    return serializers.detalhe(db, oc, para_gestor=False)


@router.get("/minhas", response_model=list[schemas.OcorrenciaResumo])
def minhas_ocorrencias(cidadao: models.Cidadao = Depends(get_cidadao_atual), db: Session = Depends(get_db)):
    ocorrencias = (
        db.query(models.Ocorrencia)
        .filter_by(id_cidadao=cidadao.id_cidadao)
        .order_by(models.Ocorrencia.data_registro.desc())
        .all()
    )
    return [serializers.resumo(oc) for oc in ocorrencias]


@router.get("/minhas/mapa", response_model=list[schemas.PontoMapa])
def mapa_minhas_ocorrencias(cidadao: models.Cidadao = Depends(get_cidadao_atual), db: Session = Depends(get_db)):
    ocorrencias = db.query(models.Ocorrencia).filter_by(id_cidadao=cidadao.id_cidadao).all()
    return [serializers.ponto(oc) for oc in ocorrencias]


@router.get("/minhas/{id_ocorrencia}", response_model=schemas.OcorrenciaDetalhe)
def detalhe_minha_ocorrencia(
    id_ocorrencia: int,
    cidadao: models.Cidadao = Depends(get_cidadao_atual),
    db: Session = Depends(get_db),
):
    oc = db.get(models.Ocorrencia, id_ocorrencia)
    if oc is None or oc.id_cidadao != cidadao.id_cidadao:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Ocorrência não encontrada.")
    return serializers.detalhe(db, oc, para_gestor=False)
