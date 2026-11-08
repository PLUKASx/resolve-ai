import logging

from sqlalchemy import Engine, inspect, text

log = logging.getLogger("resolve_ai")

COLUNAS_NOVAS = {
    "cidadao": [
        ("email", "VARCHAR(120)"),
        ("email_confirmado", "BOOLEAN NOT NULL DEFAULT 0"),
        ("ativo", "BOOLEAN NOT NULL DEFAULT 1"),
        ("versao_sessao", "INTEGER NOT NULL DEFAULT 0"),
        ("nivel_identidade", "VARCHAR(30) NOT NULL DEFAULT 'nao_verificado'"),
    ],
}

APOS_CRIAR = {
    ("cidadao", "nivel_identidade"): "UPDATE cidadao SET nivel_identidade = 'email' WHERE email_confirmado = 1",
}


def atualizar_banco(engine: Engine) -> None:
    inspetor = inspect(engine)
    tabelas = set(inspetor.get_table_names())
    with engine.begin() as conexao:
        for tabela, colunas in COLUNAS_NOVAS.items():
            if tabela not in tabelas:
                continue
            existentes = {c["name"] for c in inspetor.get_columns(tabela)}
            for nome, definicao in colunas:
                if nome not in existentes:
                    log.info("Migração: adicionando a coluna %s.%s", tabela, nome)
                    conexao.execute(text(f"ALTER TABLE {tabela} ADD COLUMN {nome} {definicao}"))
                    if comando := APOS_CRIAR.get((tabela, nome)):
                        conexao.execute(text(comando))
