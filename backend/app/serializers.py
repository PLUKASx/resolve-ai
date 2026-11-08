import hashlib

from sqlalchemy.orm import Session

from . import models, schemas
from .security import SECRET_KEY
from .services import criticidade


def protocolo(oc: models.Ocorrencia) -> str:
    return f"OC-{2000 + oc.id_ocorrencia}"


def referencia_anonima(cidadao: models.Cidadao) -> str:
    digest = hashlib.sha256(f"{SECRET_KEY}:{cidadao.id_cidadao}".encode()).hexdigest()
    return f"Cidadão #{digest[:6].upper()}"


def resumo(oc: models.Ocorrencia) -> schemas.OcorrenciaResumo:
    return schemas.OcorrenciaResumo(
        id=oc.id_ocorrencia,
        protocolo=protocolo(oc),
        categoria=oc.categoria,
        bairro=oc.bairro,
        status=oc.status,
        indice_criticidade=oc.indice_criticidade,
        faixa=criticidade.faixa(oc.indice_criticidade),
        dias_espera=criticidade.dias_espera(oc),
        data_registro=oc.data_registro,
        departamento=oc.departamento.nome_setor if oc.departamento else None,
        latitude=oc.latitude,
        longitude=oc.longitude,
    )


def detalhe(db: Session, oc: models.Ocorrencia, para_gestor: bool) -> schemas.OcorrenciaDetalhe:
    base = resumo(oc).model_dump()
    comp = None
    if para_gestor:
        recorrencias = criticidade.contar_recorrencias(db, oc)
        comp = criticidade.composicao(oc, recorrencias)
        if oc.status in criticidade.STATUS_FINAIS:
            comp["congelado"] = True
            comp["total"] = oc.indice_criticidade
            comp["faixa"] = criticidade.faixa(oc.indice_criticidade)
    return schemas.OcorrenciaDetalhe(
        **base,
        descricao=oc.descricao,
        precisao_gps=oc.precisao_gps,
        foto_url=oc.foto_url,
        data_atualizacao=oc.data_atualizacao,
        data_resolucao=oc.data_resolucao,
        historico=[
            schemas.HistoricoOut(status=h.status, observacao=h.observacao, autor=h.autor, data=h.data)
            for h in oc.historico
        ],
        composicao_indice=comp,
        denunciante_ref=referencia_anonima(oc.cidadao) if para_gestor else None,
        denunciante_nivel=oc.cidadao.nivel_identidade if para_gestor else None,
    )


def ponto(oc: models.Ocorrencia) -> schemas.PontoMapa:
    return schemas.PontoMapa(
        id=oc.id_ocorrencia,
        protocolo=protocolo(oc),
        latitude=round(oc.latitude, 5),
        longitude=round(oc.longitude, 5),
        categoria=oc.categoria,
        status=oc.status,
        bairro=oc.bairro,
        indice_criticidade=oc.indice_criticidade,
        faixa=criticidade.faixa(oc.indice_criticidade),
    )
