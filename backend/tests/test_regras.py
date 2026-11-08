from datetime import timedelta
from types import SimpleNamespace

from app.schemas import cpf_valido
from app.services import criticidade, geo
from app.tempo import agora


def test_cpf():
    assert cpf_valido("52998224725")
    assert not cpf_valido("52998224724")
    assert not cpf_valido("11111111111")
    assert not cpf_valido("123")


def test_faixas():
    assert criticidade.faixa(70) == "Alta"
    assert criticidade.faixa(69) == "Média"
    assert criticidade.faixa(40) == "Média"
    assert criticidade.faixa(39) == "Baixa"


def _oc(categoria="Buraco na via", dias=0, status="Aberta"):
    return SimpleNamespace(
        categoria=categoria, status=status, data_resolucao=None,
        data_registro=agora() - timedelta(days=dias),
    )


def test_composicao_do_indice():
    comp = criticidade.composicao(_oc(dias=4), recorrencias=2)
    assert comp["peso_categoria"] == 50
    assert comp["tempo_espera"] == 6
    assert comp["recorrencia"] == 6
    assert comp["total"] == 62


def test_tetos_do_indice():
    comp = criticidade.composicao(_oc("Vazamento de água", dias=100), recorrencias=50)
    assert comp["tempo_espera"] == criticidade.TETO_TEMPO
    assert comp["recorrencia"] == criticidade.TETO_RECORRENCIA
    assert comp["total"] == 100


def test_bairro():
    assert geo.bairro_mais_proximo(*geo.BAIRROS["Jundiaí"]) == "Jundiaí"
    assert geo.bairro_mais_proximo(-23.55, -46.63) == "Outra localidade"
