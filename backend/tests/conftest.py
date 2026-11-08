import os
import sys
import tempfile
from pathlib import Path

import pytest

_PASTA = Path(tempfile.mkdtemp(prefix="resolve_ai_testes_"))
os.environ["DATABASE_URL"] = f"sqlite:///{_PASTA / 'teste.db'}"
os.environ["DADOS_DEMO"] = "sim"
os.environ.pop("DB_HOST", None)

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from fastapi.testclient import TestClient

from app.main import app
from app.routers import cidadao as rotas_cidadao
from app.security import limite_login
from app.services import codigos
from app.services import email as servico_email


@pytest.fixture(scope="session")
def cliente():
    with TestClient(app) as c:
        yield c


@pytest.fixture(autouse=True)
def isolar(monkeypatch, tmp_path):
    monkeypatch.setattr(rotas_cidadao, "UPLOAD_DIR", tmp_path)
    monkeypatch.setattr(codigos, "INTERVALO_REENVIO_S", 0)
    limite_login.limpar()
    yield
    limite_login.limpar()


@pytest.fixture(autouse=True)
def caixa_de_entrada(monkeypatch):
    enviados = []
    monkeypatch.setattr(servico_email, "enviar", lambda para, assunto, texto: enviados.append(
        {"para": para, "assunto": assunto, "texto": texto}
    ))
    return enviados


def ultimo_codigo(enviados, para):
    import re
    msg = next(m for m in reversed(enviados) if m["para"] == para)
    return re.search(r"\b(\d{6})\b", msg["texto"]).group(1)


def _token(cliente, rota, corpo):
    r = cliente.post(rota, json=corpo)
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


@pytest.fixture
def auth_cidadao(cliente):
    return _token(cliente, "/api/auth/cidadao/login", {"cpf": "529.982.247-25", "senha": "123456"})


@pytest.fixture
def auth_gestor(cliente):
    return _token(cliente, "/api/auth/gestor/login", {"matricula": "1001", "senha": "gestor123"})
