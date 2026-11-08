import time

from app.services import geo

PNG = b"\x89PNG\r\n\x1a\n" + b"\x00" * 64


def _form(**extra):
    lat, lon = geo.BAIRROS["Centro"]
    dados = {
        "categoria": "Buraco na via", "descricao": "Teste automatizado",
        "latitude": str(lat), "longitude": str(lon), "precisao": "12",
        "capturado_em": str(int(time.time() * 1000)),
    }
    dados.update(extra)
    return dados


def test_saude(cliente):
    assert cliente.get("/api/saude").json() == {"status": "ok"}


def test_login_errado(cliente):
    r = cliente.post("/api/auth/cidadao/login", json={"cpf": "52998224725", "senha": "errada"})
    assert r.status_code == 401


def test_bloqueio_apos_muitas_tentativas(cliente):
    corpo = {"matricula": "1001", "senha": "errada"}
    for _ in range(5):
        assert cliente.post("/api/auth/gestor/login", json=corpo).status_code == 401
    r = cliente.post("/api/auth/gestor/login", json=corpo)
    assert r.status_code == 429
    r = cliente.post("/api/auth/gestor/login", json={"matricula": "1001", "senha": "gestor123"})
    assert r.status_code == 429


def test_rotas_protegidas(cliente, auth_cidadao):
    assert cliente.get("/api/ocorrencias/minhas").status_code == 401
    assert cliente.get("/api/gestao/dashboard").status_code == 401
    assert cliente.get("/api/gestao/dashboard", headers=auth_cidadao).status_code == 403


def test_registrar_e_acompanhar(cliente, auth_cidadao, auth_gestor):
    r = cliente.post("/api/ocorrencias", data=_form(), headers=auth_cidadao,
                     files={"foto": ("foto.png", PNG, "image/png")})
    assert r.status_code == 201, r.text
    oc = r.json()
    assert oc["bairro"] == "Centro"
    assert oc["foto_url"].endswith(".png")
    assert oc["denunciante_ref"] is None

    det = cliente.get(f"/api/gestao/ocorrencias/{oc['id']}", headers=auth_gestor).json()
    assert det["denunciante_ref"].startswith("Cidadão #")
    assert det["composicao_indice"]["peso_categoria"] == 50

    r = cliente.patch(f"/api/gestao/ocorrencias/{oc['id']}/status", headers=auth_gestor,
                      json={"status": "Em análise", "observacao": "Vistoria marcada"})
    assert r.status_code == 200

    meu = cliente.get(f"/api/ocorrencias/minhas/{oc['id']}", headers=auth_cidadao).json()
    assert meu["status"] == "Em análise"
    assert [h["status"] for h in meu["historico"]] == ["Aberta", "Em análise"]


def test_arquivo_que_nao_e_imagem(cliente, auth_cidadao):
    r = cliente.post("/api/ocorrencias", data=_form(), headers=auth_cidadao,
                     files={"foto": ("foto.png", b"<script>alert(1)</script>", "image/png")})
    assert r.status_code == 422


def test_descricao_foto_e_categoria_outros(cliente, auth_cidadao):
    foto = {"foto": ("foto.png", PNG, "image/png")}
    for curta in ["", "Buraco", "   abc     "]:
        r = cliente.post("/api/ocorrencias", data=_form(descricao=curta), headers=auth_cidadao, files=foto)
        assert r.status_code == 422 and "10 caracteres" in r.json()["detail"]
    r = cliente.post("/api/ocorrencias", data=_form(), headers=auth_cidadao)
    assert r.status_code == 422 and "foto" in r.json()["detail"]
    assert "Outros" in [c["nome"] for c in cliente.get("/api/publico/opcoes").json()["categorias"]]
    r = cliente.post("/api/ocorrencias", data=_form(categoria="Outros", descricao="Banco da praça quebrado"),
                     headers=auth_cidadao, files=foto)
    assert r.status_code == 201, r.text
    assert r.json()["departamento"] == "Central de Atendimento (triagem)"


def test_limite_do_gps(cliente, auth_cidadao, monkeypatch):
    assert cliente.get("/api/publico/opcoes").json()["gps_precisao_maxima_m"] == 1000
    assert cliente.post("/api/ocorrencias", data=_form(precisao="900"), headers=auth_cidadao,
                        files={"foto": ("foto.png", PNG, "image/png")}).status_code == 201
    r = cliente.post("/api/ocorrencias", data=_form(precisao="2400"), headers=auth_cidadao,
                     files={"foto": ("foto.png", PNG, "image/png")})
    assert r.status_code == 422 and "localização exata" in r.json()["detail"]
    monkeypatch.setenv("GPS_PRECISAO_MAXIMA_M", "100")
    r = cliente.post("/api/ocorrencias", data=_form(precisao="150"), headers=auth_cidadao)
    assert r.status_code == 422 and "localização exata" in r.json()["detail"]


def test_gps_antigo_e_impreciso(cliente, auth_cidadao):
    antigo = str(int((time.time() - 600) * 1000))
    assert cliente.post("/api/ocorrencias", data=_form(capturado_em=antigo),
                        headers=auth_cidadao).status_code == 422
    assert cliente.post("/api/ocorrencias", data=_form(precisao="9000"),
                        headers=auth_cidadao).status_code == 422


def test_cidadao_nao_ve_denuncia_de_outro(cliente, auth_cidadao, auth_gestor):
    ids_meus = {o["id"] for o in cliente.get("/api/ocorrencias/minhas", headers=auth_cidadao).json()}
    todas = cliente.get("/api/gestao/ocorrencias", headers=auth_gestor).json()
    alheia = next(o["id"] for o in todas if o["id"] not in ids_meus)
    assert cliente.get(f"/api/ocorrencias/minhas/{alheia}", headers=auth_cidadao).status_code == 404


def test_dashboard_e_ranking(cliente, auth_gestor):
    d = cliente.get("/api/gestao/dashboard", headers=auth_gestor).json()
    assert d["total"] >= 52
    lista = cliente.get("/api/gestao/ocorrencias", headers=auth_gestor).json()
    indices = [o["indice_criticidade"] for o in lista]
    assert indices == sorted(indices, reverse=True)


def test_filtros_do_dashboard_e_mapa(cliente, auth_gestor, auth_cidadao):
    d = cliente.get("/api/gestao/dashboard", headers=auth_gestor).json()
    bairro = d["bairros_criticos"][0]
    r = cliente.get("/api/gestao/ocorrencias", params={"bairro": bairro["nome"], "status": "Em aberto"},
                    headers=auth_gestor).json()
    assert len(r) == bairro["total"] and all(o["bairro"] == bairro["nome"] for o in r)
    altas = cliente.get("/api/gestao/ocorrencias", params={"status": "Em aberto", "faixa": "Alta"},
                        headers=auth_gestor).json()
    assert len(altas) == d["criticas"]

    pontos = cliente.get("/api/gestao/mapa", headers=auth_gestor)
    assert pontos.status_code == 200
    p = pontos.json()[0]
    assert p["protocolo"] == f"OC-{2000 + p['id']}"
    assert cliente.get(f"/api/gestao/ocorrencias/{p['id']}", headers=auth_gestor).status_code == 200
    assert cliente.get("/api/ocorrencias/minhas/mapa", headers=auth_cidadao).status_code == 200
