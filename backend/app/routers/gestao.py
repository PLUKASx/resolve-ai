from collections import Counter, defaultdict

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from .. import models, schemas, serializers
from ..database import get_db
from ..security import get_gestor_atual
from ..services import criticidade
from ..tempo import agora as agora_br

router = APIRouter(prefix="/api/gestao", tags=["Gestão"], dependencies=[Depends(get_gestor_atual)])


def _filtrar(db: Session, categoria: str | None, status_: str | None, faixa: str | None, bairro: str | None):
    criticidade.atualizar_indices(db)
    q = db.query(models.Ocorrencia)
    if categoria:
        q = q.filter(models.Ocorrencia.categoria == categoria)
    if status_ == "Em aberto":
        q = q.filter(models.Ocorrencia.status.notin_(criticidade.STATUS_FINAIS))
    elif status_:
        q = q.filter(models.Ocorrencia.status == status_)
    if bairro:
        q = q.filter(models.Ocorrencia.bairro == bairro)
    ocorrencias = q.order_by(models.Ocorrencia.indice_criticidade.desc(), models.Ocorrencia.data_registro).all()
    if faixa:
        ocorrencias = [oc for oc in ocorrencias if criticidade.faixa(oc.indice_criticidade) == faixa]
    return ocorrencias


@router.get("/ocorrencias", response_model=list[schemas.OcorrenciaResumo])
def listar(
    categoria: str | None = None,
    status: str | None = None,
    faixa: str | None = None,
    bairro: str | None = None,
    db: Session = Depends(get_db),
):
    return [serializers.resumo(oc) for oc in _filtrar(db, categoria, status, faixa, bairro)]


@router.get("/ocorrencias/{id_ocorrencia}", response_model=schemas.OcorrenciaDetalhe)
def detalhe(id_ocorrencia: int, db: Session = Depends(get_db)):
    oc = db.get(models.Ocorrencia, id_ocorrencia)
    if oc is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Ocorrência não encontrada.")
    return serializers.detalhe(db, oc, para_gestor=True)


@router.patch("/ocorrencias/{id_ocorrencia}/status", response_model=schemas.OcorrenciaDetalhe)
def atualizar_status(
    id_ocorrencia: int,
    dados: schemas.AtualizarStatus,
    gestor: models.Gestor = Depends(get_gestor_atual),
    db: Session = Depends(get_db),
):
    oc = db.get(models.Ocorrencia, id_ocorrencia)
    if oc is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Ocorrência não encontrada.")
    if dados.status == oc.status and not dados.observacao.strip():
        raise HTTPException(422, "A ocorrência já está com este status.")

    agora = agora_br()
    if oc.status not in criticidade.STATUS_FINAIS:
        criticidade.recalcular(db, oc)
    oc.status = dados.status
    oc.data_atualizacao = agora
    oc.data_resolucao = agora if dados.status in criticidade.STATUS_FINAIS else None
    oc.historico.append(models.HistoricoStatus(
        status=dados.status,
        observacao=dados.observacao.strip(),
        autor=gestor.nome,
        data=agora,
    ))
    db.commit()
    db.refresh(oc)
    return serializers.detalhe(db, oc, para_gestor=True)


@router.get("/mapa", response_model=list[schemas.PontoMapa])
def mapa(categoria: str | None = None, status: str | None = None, faixa: str | None = None, db: Session = Depends(get_db)):
    return [serializers.ponto(oc) for oc in _filtrar(db, categoria, status, faixa, None)]


@router.get("/dashboard")
def dashboard(db: Session = Depends(get_db)):
    criticidade.atualizar_indices(db)
    todas = db.query(models.Ocorrencia).all()
    abertas = [oc for oc in todas if oc.status not in criticidade.STATUS_FINAIS]
    resolvidas = [oc for oc in todas if oc.status == "Resolvida"]

    def media(valores):
        valores = list(valores)
        return round(sum(valores) / len(valores), 1) if valores else 0

    por_bairro = defaultdict(list)
    for oc in abertas:
        por_bairro[oc.bairro].append(oc.indice_criticidade)
    bairros_criticos = sorted(
        (
            {"nome": nome, "total": len(idx), "criticidade_media": media(idx), "pontuacao": sum(idx)}
            for nome, idx in por_bairro.items()
        ),
        key=lambda b: b["pontuacao"],
        reverse=True,
    )[:8]

    contagem_status = Counter(oc.status for oc in todas)
    contagem_categoria = Counter(oc.categoria for oc in abertas)
    contagem_faixa = Counter(criticidade.faixa(oc.indice_criticidade) for oc in abertas)
    recentes = sorted(todas, key=lambda oc: oc.data_registro, reverse=True)[:6]

    return {
        "total": len(todas),
        "em_aberto": len(abertas),
        "resolvidas": len(resolvidas),
        "criticas": contagem_faixa.get("Alta", 0),
        "tempo_medio_espera": media(criticidade.dias_espera(oc) for oc in abertas),
        "tempo_medio_resolucao": media(criticidade.dias_espera(oc) for oc in resolvidas),
        "por_categoria": [{"nome": n, "total": t} for n, t in contagem_categoria.most_common()],
        "por_status": [{"nome": s, "total": contagem_status.get(s, 0)} for s in schemas.STATUS],
        "por_faixa": [{"nome": f, "total": contagem_faixa.get(f, 0)} for f in schemas.FAIXAS],
        "bairros_criticos": bairros_criticos,
        "recentes": [serializers.resumo(oc) for oc in recentes],
    }
