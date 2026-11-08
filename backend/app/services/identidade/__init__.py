import os
from dataclasses import asdict, dataclass

NIVEL_NAO_VERIFICADO = "nao_verificado"
NIVEL_EMAIL = "email"
NIVEL_GOVBR_BRONZE = "govbr_bronze"
NIVEL_GOVBR_PRATA = "govbr_prata"
NIVEL_GOVBR_OURO = "govbr_ouro"

ORDEM_NIVEIS = [NIVEL_NAO_VERIFICADO, NIVEL_EMAIL, NIVEL_GOVBR_BRONZE, NIVEL_GOVBR_PRATA, NIVEL_GOVBR_OURO]

DESCRICAO_NIVEIS = {
    NIVEL_NAO_VERIFICADO: "Não verificado",
    NIVEL_EMAIL: "E-mail confirmado",
    NIVEL_GOVBR_BRONZE: "gov.br bronze",
    NIVEL_GOVBR_PRATA: "gov.br prata",
    NIVEL_GOVBR_OURO: "gov.br ouro",
}


def nivel_maior(atual: str | None, novo: str) -> str:
    if atual not in ORDEM_NIVEIS:
        return novo
    return novo if ORDEM_NIVEIS.index(novo) > ORDEM_NIVEIS.index(atual) else atual


@dataclass
class ResultadoIdentidade:
    cpf: str
    nome: str
    nivel: str
    provedor: str

    def como_dict(self) -> dict:
        return asdict(self)


class ProvedorIdentidade:
    nome = "base"

    def disponivel(self) -> bool:
        raise NotImplementedError

    def url_login(self, *, retorno_url: str, estado: str) -> str:
        raise NotImplementedError

    def concluir(self, *, codigo: str, retorno_url: str) -> ResultadoIdentidade:
        raise NotImplementedError


def provedor_atual() -> ProvedorIdentidade | None:
    if os.getenv("IDENTIDADE_PROVEDOR", "").strip().lower() == "govbr":
        from .govbr import GovBr
        p = GovBr()
        return p if p.disponivel() else None
    return None
