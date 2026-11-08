import os

from . import ProvedorIdentidade


class GovBr(ProvedorIdentidade):
    nome = "govbr"

    def disponivel(self) -> bool:
        return bool(os.getenv("GOVBR_CLIENT_ID")) and False

    def url_login(self, **_):
        raise NotImplementedError("Integração gov.br ainda não implementada (depende da credencial da prefeitura).")

    def concluir(self, **_):
        raise NotImplementedError("Integração gov.br ainda não implementada (depende da credencial da prefeitura).")
