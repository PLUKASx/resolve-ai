from app.services import codigos
from conftest import ultimo_codigo

CPF_A = "11144477735"
CPF_B = "39053344705"
CPF_C = "86288366757"


def _registrar(cliente, cpf, email, nome="Pessoa Teste", senha="segredo1"):
    return cliente.post("/api/auth/cidadao/registro", json={"nome": nome, "cpf": cpf, "email": email, "senha": senha})


def _login(cliente, cpf, senha="segredo1"):
    return cliente.post("/api/auth/cidadao/login", json={"cpf": cpf, "senha": senha})


def test_cadastro_exige_confirmar_email(cliente, caixa_de_entrada):
    r = _registrar(cliente, CPF_A, "ana@teste.com")
    assert r.status_code == 201, r.text
    assert r.json()["email_mascarado"] == "an***@teste.com"
    assert "access_token" not in r.json()

    r = _login(cliente, CPF_A)
    assert r.status_code == 403
    assert "Confirme seu e-mail" in r.json()["detail"]

    codigo = ultimo_codigo(caixa_de_entrada, "ana@teste.com")
    r = cliente.post("/api/auth/cidadao/confirmar-email", json={"cpf": CPF_A, "codigo": codigo})
    assert r.status_code == 200, r.text
    assert r.json()["access_token"]

    assert _login(cliente, CPF_A).status_code == 200
    r = cliente.post("/api/auth/cidadao/confirmar-email", json={"cpf": CPF_A, "codigo": codigo})
    assert r.status_code == 400


def test_cpf_ja_confirmado_nao_pode_ser_recadastrado(cliente):
    r = _registrar(cliente, "529.982.247-25", "outro@teste.com")
    assert r.status_code == 409
    assert "Esqueci minha senha" in r.json()["detail"]


def test_codigo_errado_tem_limite(cliente, caixa_de_entrada):
    _registrar(cliente, CPF_B, "bruno@teste.com")
    certo = ultimo_codigo(caixa_de_entrada, "bruno@teste.com")
    errado = "000000" if certo != "000000" else "111111"
    for _ in range(codigos.MAX_TENTATIVAS):
        r = cliente.post("/api/auth/cidadao/confirmar-email", json={"cpf": CPF_B, "codigo": errado})
        assert r.status_code == 400
    r = cliente.post("/api/auth/cidadao/confirmar-email", json={"cpf": CPF_B, "codigo": certo})
    assert r.status_code == 400

    cliente.post("/api/auth/cidadao/reenviar-codigo", json={"cpf": CPF_B})
    novo = ultimo_codigo(caixa_de_entrada, "bruno@teste.com")
    r = cliente.post("/api/auth/cidadao/confirmar-email", json={"cpf": CPF_B, "codigo": novo})
    assert r.status_code == 200


def test_intervalo_entre_codigos(cliente, monkeypatch):
    monkeypatch.setattr(codigos, "INTERVALO_REENVIO_S", 60)
    _registrar(cliente, CPF_C, "carla@teste.com")
    r = cliente.post("/api/auth/cidadao/reenviar-codigo", json={"cpf": CPF_C})
    assert r.status_code == 429


def test_recuperar_senha(cliente, caixa_de_entrada):
    email = "maria.demo@exemplo.com"
    antigo = _login(cliente, "52998224725", "123456").json()["access_token"]
    cab_antigo = {"Authorization": f"Bearer {antigo}"}
    assert cliente.get("/api/ocorrencias/minhas", headers=cab_antigo).status_code == 200

    r = cliente.post("/api/auth/cidadao/esqueci-senha", json={"cpf": "529.982.247-25"})
    assert r.status_code == 200
    codigo = ultimo_codigo(caixa_de_entrada, email)

    r = cliente.post("/api/auth/cidadao/redefinir-senha",
                     json={"cpf": "52998224725", "codigo": codigo, "nova_senha": "novasenha"})
    assert r.status_code == 200, r.text

    assert cliente.get("/api/ocorrencias/minhas", headers=cab_antigo).status_code == 401
    assert _login(cliente, "52998224725", "123456").status_code == 401
    assert _login(cliente, "52998224725", "novasenha").status_code == 200

    cliente.post("/api/auth/cidadao/esqueci-senha", json={"cpf": "52998224725"})
    codigo = ultimo_codigo(caixa_de_entrada, email)
    cliente.post("/api/auth/cidadao/redefinir-senha",
                 json={"cpf": "52998224725", "codigo": codigo, "nova_senha": "123456"})


def test_esqueci_senha_nao_revela_se_cpf_existe(cliente, caixa_de_entrada):
    antes = len(caixa_de_entrada)
    r1 = cliente.post("/api/auth/cidadao/esqueci-senha", json={"cpf": "93541134780"})
    assert r1.status_code == 200
    assert len(caixa_de_entrada) == antes
    r2 = cliente.post("/api/auth/cidadao/esqueci-senha", json={"cpf": "52998224725"})
    assert r1.json() == r2.json()


def test_cadastro_nao_confirmado_libera_cpf_depois_de_24h(cliente, caixa_de_entrada):
    from datetime import timedelta
    from app import models
    from app.database import SessionLocal

    cpf = "45317828791"
    _registrar(cliente, cpf, "falso@teste.com")
    assert _registrar(cliente, cpf, "verdadeiro@teste.com").status_code == 409

    with SessionLocal() as db:
        conta = db.query(models.Cidadao).filter_by(cpf=cpf).one()
        conta.criado_em -= timedelta(hours=25)
        db.commit()

    assert _registrar(cliente, cpf, "verdadeiro@teste.com").status_code == 201


def test_email_ja_usado_por_outra_conta(cliente):
    r = _registrar(cliente, "31415926590", "maria.demo@exemplo.com")
    assert r.status_code == 409
    assert "e-mail já está cadastrado" in r.json()["detail"]
    r = _registrar(cliente, "31415926590", "  MARIA.Demo@Exemplo.COM ")
    assert r.status_code == 409


def test_email_de_cadastro_pendente_tambem_bloqueia(cliente):
    assert _registrar(cliente, "27182818205", "pendente@teste.com").status_code == 201
    r = _registrar(cliente, "16180339805", "pendente@teste.com")
    assert r.status_code == 409
    assert "e-mail já está cadastrado" in r.json()["detail"]


def test_email_de_cadastro_pendente_vencido_fica_livre(cliente):
    from datetime import timedelta
    from app import models
    from app.database import SessionLocal

    assert _registrar(cliente, "14142135651", "vencido@teste.com").status_code == 201
    with SessionLocal() as db:
        conta = db.query(models.Cidadao).filter_by(cpf="14142135651").one()
        conta.criado_em -= timedelta(hours=25)
        db.commit()
    assert _registrar(cliente, "16180339805", "vencido@teste.com").status_code == 201
    with SessionLocal() as db:
        assert db.query(models.Cidadao).filter_by(cpf="14142135651").first() is None
