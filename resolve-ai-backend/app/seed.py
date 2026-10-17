import os
import random
from datetime import datetime, timedelta

from sqlalchemy.orm import Session

from . import models
from .security import hash_senha
from .services import criticidade, geo, roteamento

CIDADAO_DEMO = {"nome": "Maria Oliveira", "cpf": "52998224725", "senha": "123456"}
GESTOR_DEMO = {"nome": "Ana Ribeiro", "matricula": "1001", "senha": "gestor123"}

DESCRICOES = {
    "Vazamento de água": ["Água escorrendo pela calçada há dias.", "Cano estourado na esquina, rua alagada."],
    "Esgoto a céu aberto": ["Mau cheiro forte, esgoto correndo na sarjeta.", "Bueiro transbordando esgoto."],
    "Buraco na via": ["Buraco grande no meio da pista, perigoso para motos.", "Asfalto cedeu perto do quebra-molas."],
    "Árvore caída": ["Árvore caiu sobre a calçada após a chuva.", "Galho grande bloqueando metade da rua."],
    "Iluminação pública": ["Poste apagado, rua muito escura à noite.", "Três postes seguidos sem luz."],
    "Sinalização danificada": ["Placa de pare derrubada.", "Faixa de pedestre totalmente apagada."],
    "Lixo e entulho": ["Entulho descartado em lote baldio.", "Lixo acumulado na esquina há uma semana."],
}

FLUXO = ["Aberta", "Em análise", "Encaminhada", "Em execução", "Resolvida"]
OBSERVACOES = {
    "Em análise": "Equipe técnica avaliando a demanda.",
    "Encaminhada": "Ordem de serviço emitida para a equipe de campo.",
    "Em execução": "Equipe em campo realizando o reparo.",
    "Resolvida": "Serviço concluído e vistoriado.",
}


def seed_if_empty(db: Session) -> None:
    if db.query(models.Departamento).first():
        return

    for nome in roteamento.DEPARTAMENTOS:
        db.add(models.Departamento(nome_setor=nome))
    db.flush()

    obras = db.query(models.Departamento).filter_by(nome_setor="Secretaria de Obras e Pavimentação").first()

    if os.getenv("DADOS_DEMO", "sim").lower() in ("nao", "não", "false", "0"):
        _criar_gestor_producao(db, obras)
        db.commit()
        return

    _popular_demonstracao(db, obras)


def _criar_gestor_producao(db: Session, departamento: models.Departamento) -> None:
    matricula = os.getenv("GESTOR_MATRICULA", "").strip()
    senha = os.getenv("GESTOR_SENHA", "")
    if not matricula or len(senha) < 8:
        raise RuntimeError(
            "Com DADOS_DEMO=nao, defina GESTOR_MATRICULA e GESTOR_SENHA (mínimo 8 caracteres) no arquivo .env."
        )
    db.add(models.Gestor(
        nome=os.getenv("GESTOR_NOME", "Gestor").strip() or "Gestor",
        matricula=matricula, senha=hash_senha(senha), departamento=departamento,
    ))


def _popular_demonstracao(db: Session, obras: models.Departamento) -> None:
    rnd = random.Random(42)

    gestor = models.Gestor(
        nome=GESTOR_DEMO["nome"], matricula=GESTOR_DEMO["matricula"],
        senha=hash_senha(GESTOR_DEMO["senha"]), departamento=obras,
    )
    db.add(gestor)

    cidadaos = [models.Cidadao(nome=CIDADAO_DEMO["nome"], cpf=CIDADAO_DEMO["cpf"], senha=hash_senha(CIDADAO_DEMO["senha"]))]
    for i, nome in enumerate(["João Pereira", "Carla Souza", "Rafael Lima", "Beatriz Costa"]):
        cidadaos.append(models.Cidadao(nome=nome, cpf=f"0000000000{i}", senha=hash_senha("123456")))
    db.add_all(cidadaos)
    db.flush()

    agora = datetime.now()
    bairros = list(geo.BAIRROS.items())
    categorias = list(criticidade.PESOS_CATEGORIA)
    ocorrencias = []

    for i in range(52):
        bairro, (lat, lon) = rnd.choice(bairros)
        categoria = rnd.choice(categorias)
        dias = rnd.randint(0, 32)
        registro = agora - timedelta(days=dias, hours=rnd.randint(0, 20), minutes=rnd.randint(0, 59))

        etapa = min(len(FLUXO) - 1, int(dias / 5 * rnd.uniform(0.4, 1.6)))

        oc = models.Ocorrencia(
            categoria=categoria,
            descricao=rnd.choice(DESCRICOES[categoria]),
            latitude=lat + rnd.uniform(-0.004, 0.004),
            longitude=lon + rnd.uniform(-0.004, 0.004),
            precisao_gps=round(rnd.uniform(4, 25), 1),
            bairro=bairro,
            status="Aberta",
            data_registro=registro,
            data_atualizacao=registro,
            cidadao=cidadaos[0] if i % 8 == 0 else rnd.choice(cidadaos[1:]),
            departamento=roteamento.departamento_para(db, categoria),
        )
        oc.historico.append(models.HistoricoStatus(
            status="Aberta",
            observacao=f"Ocorrência registrada e encaminhada automaticamente para {oc.departamento.nome_setor}.",
            autor="Sistema", data=registro,
        ))

        momento = registro
        for passo in FLUXO[1:etapa + 1]:
            momento = min(momento + timedelta(days=rnd.randint(1, 4), hours=rnd.randint(1, 8)), agora)
            oc.status = passo
            oc.data_atualizacao = momento
            oc.historico.append(models.HistoricoStatus(
                status=passo, observacao=OBSERVACOES[passo], autor=gestor.nome, data=momento,
            ))
        if oc.status == "Resolvida":
            oc.data_resolucao = momento

        db.add(oc)
        ocorrencias.append(oc)

    db.flush()
    for oc in ocorrencias:
        criticidade.recalcular(db, oc)
    db.commit()
