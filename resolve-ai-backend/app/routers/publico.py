from fastapi import APIRouter

from .. import schemas
from ..services import criticidade, geo, roteamento

router = APIRouter(prefix="/api/publico", tags=["Público"])


@router.get("/opcoes")
def opcoes():
    return {
        "categorias": [
            {"nome": nome, "peso": peso, "departamento": roteamento.ROTAS.get(nome)}
            for nome, peso in criticidade.PESOS_CATEGORIA.items()
        ],
        "status": schemas.STATUS,
        "faixas": schemas.FAIXAS,
        "bairros": sorted(geo.BAIRROS),
        "centro_mapa": geo.CENTRO_ANAPOLIS,
    }

