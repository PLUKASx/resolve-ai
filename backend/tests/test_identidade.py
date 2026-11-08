import pytest

from app import models
from app.database import SessionLocal
from app.services import identidade
from conftest import ultimo_codigo


def test_nivel_nunca_rebaixa():
    assert identidade.nivel_maior("govbr_prata", "email") == "govbr_prata"
    assert identidade.nivel_maior("email", "govbr_ouro") == "govbr_ouro"
    assert identidade.nivel_maior("nao_verificado", "email") == "email"
    assert identidade.nivel_maior(None, "email") == "email"


def test_confirmar_email_da_nivel_email(cliente, caixa_de_entrada):
    cpf = "28625587887"
    cliente.post("/api/auth/cidadao/registro",
                 json={"nome": "Nível Teste", "cpf": cpf, "email": "nivel@teste.com", "senha": "segredo1"})
    with SessionLocal() as db:
        assert db.query(models.Cidadao).filter_by(cpf=cpf).one().nivel_identidade == identidade.NIVEL_NAO_VERIFICADO
    cliente.post("/api/auth/cidadao/confirmar-email",
                 json={"cpf": cpf, "codigo": ultimo_codigo(caixa_de_entrada, "nivel@teste.com")})
    with SessionLocal() as db:
        assert db.query(models.Cidadao).filter_by(cpf=cpf).one().nivel_identidade == identidade.NIVEL_EMAIL


def test_gestor_ve_nivel_do_denunciante(cliente, auth_gestor):
    oc = cliente.get("/api/gestao/ocorrencias", headers=auth_gestor).json()[0]
    det = cliente.get(f"/api/gestao/ocorrencias/{oc['id']}", headers=auth_gestor).json()
    assert det["denunciante_nivel"] == identidade.NIVEL_EMAIL


def test_rotas_da_contestacao_foram_removidas(cliente, auth_gestor):
    assert cliente.post("/api/publico/contestacoes", json={}).status_code in (404, 405)
    assert cliente.get("/api/gestao/contestacoes", headers=auth_gestor).status_code == 404
    assert cliente.post("/api/webhooks/didit", content=b"{}").status_code == 404


@pytest.mark.parametrize("valor", ["govbr", "didit", ""])
def test_nenhum_provedor_ligado(valor, monkeypatch):
    monkeypatch.setenv("IDENTIDADE_PROVEDOR", valor)
    monkeypatch.setenv("GOVBR_CLIENT_ID", "x")
    assert identidade.provedor_atual() is None
