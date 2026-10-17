import math
from datetime import datetime

from sqlalchemy.orm import Session

from .. import models

PESOS_CATEGORIA = {
    "Vazamento de água": 60,
    "Esgoto a céu aberto": 55,
    "Buraco na via": 50,
    "Árvore caída": 50,
    "Iluminação pública": 45,
    "Sinalização danificada": 40,
    "Lixo e entulho": 30,
}

PONTOS_POR_DIA = 1.5
TETO_TEMPO = 30
PONTOS_POR_RECORRENCIA = 3
TETO_RECORRENCIA = 10
RAIO_RECORRENCIA_M = 300

STATUS_FINAIS = {"Resolvida", "Improcedente"}


def faixa(indice: int) -> str:
    if indice >= 70:
        return "Alta"
    if indice >= 40:
        return "Média"
    return "Baixa"


def dias_espera(oc: models.Ocorrencia, agora: datetime | None = None) -> int:
    fim = oc.data_resolucao if oc.status in STATUS_FINAIS and oc.data_resolucao else (agora or datetime.now())
    return max(0, (fim - oc.data_registro).days)


def distancia_m(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    r = 6_371_000
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp, dl = p2 - p1, math.radians(lon2 - lon1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))


def contar_recorrencias(db: Session, oc: models.Ocorrencia) -> int:
    vizinhas = (
        db.query(models.Ocorrencia.latitude, models.Ocorrencia.longitude)
        .filter(
            models.Ocorrencia.categoria == oc.categoria,
            models.Ocorrencia.id_ocorrencia != oc.id_ocorrencia,
            models.Ocorrencia.status.notin_(STATUS_FINAIS),
        )
        .all()
    )
    return sum(
        1 for lat, lon in vizinhas
        if distancia_m(oc.latitude, oc.longitude, lat, lon) <= RAIO_RECORRENCIA_M
    )


def composicao(oc: models.Ocorrencia, recorrencias: int, agora: datetime | None = None) -> dict:
    peso = PESOS_CATEGORIA.get(oc.categoria, 30)
    dias = dias_espera(oc, agora)
    tempo = min(round(dias * PONTOS_POR_DIA), TETO_TEMPO)
    recorrencia = min(recorrencias * PONTOS_POR_RECORRENCIA, TETO_RECORRENCIA)
    total = min(peso + tempo + recorrencia, 100)
    return {
        "peso_categoria": peso,
        "tempo_espera": tempo,
        "dias_espera": dias,
        "recorrencia": recorrencia,
        "ocorrencias_proximas": recorrencias,
        "total": total,
        "faixa": faixa(total),
    }


def recalcular(db: Session, oc: models.Ocorrencia) -> dict:
    comp = composicao(oc, contar_recorrencias(db, oc))
    oc.indice_criticidade = comp["total"]
    return comp


def atualizar_indices(db: Session) -> None:
    abertas = db.query(models.Ocorrencia).filter(models.Ocorrencia.status.notin_(STATUS_FINAIS)).all()
    for oc in abertas:
        recalcular(db, oc)
    db.commit()
