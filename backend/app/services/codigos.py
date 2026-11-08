import hashlib
import hmac
import secrets
from datetime import timedelta

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from .. import models
from ..security import SECRET_KEY
from ..tempo import agora

CONFIRMAR_EMAIL = "confirmar_email"
RECUPERAR_SENHA = "recuperar_senha"

VALIDADE_MIN = {CONFIRMAR_EMAIL: 30, RECUPERAR_SENHA: 15}
MAX_TENTATIVAS = 5
INTERVALO_REENVIO_S = 60


class AguardeReenvio(HTTPException):
    def __init__(self, segundos: int):
        super().__init__(
            status.HTTP_429_TOO_MANY_REQUESTS,
            f"Aguarde {segundos} segundos para pedir um novo código.",
            headers={"Retry-After": str(segundos)},
        )


def _hash(codigo: str) -> str:
    return hmac.new(SECRET_KEY.encode(), codigo.encode(), hashlib.sha256).hexdigest()


def _ultimo(db: Session, cidadao: models.Cidadao, finalidade: str) -> models.CodigoVerificacao | None:
    return (
        db.query(models.CodigoVerificacao)
        .filter_by(id_cidadao=cidadao.id_cidadao, finalidade=finalidade)
        .order_by(models.CodigoVerificacao.id_codigo.desc())
        .first()
    )


def gerar(db: Session, cidadao: models.Cidadao, finalidade: str) -> str:
    momento = agora()
    ultimo = _ultimo(db, cidadao, finalidade)
    if ultimo is not None:
        passados = (momento - ultimo.criado_em).total_seconds()
        if passados < INTERVALO_REENVIO_S:
            raise AguardeReenvio(int(INTERVALO_REENVIO_S - passados) + 1)

    db.query(models.CodigoVerificacao).filter_by(
        id_cidadao=cidadao.id_cidadao, finalidade=finalidade, usado=False
    ).update({"usado": True})

    codigo = f"{secrets.randbelow(1_000_000):06d}"
    db.add(models.CodigoVerificacao(
        id_cidadao=cidadao.id_cidadao,
        finalidade=finalidade,
        codigo_hash=_hash(codigo),
        criado_em=momento,
        expira_em=momento + timedelta(minutes=VALIDADE_MIN[finalidade]),
    ))
    db.commit()
    return codigo


def validar(db: Session, cidadao: models.Cidadao, finalidade: str, codigo: str) -> None:
    registro = (
        db.query(models.CodigoVerificacao)
        .filter_by(id_cidadao=cidadao.id_cidadao, finalidade=finalidade, usado=False)
        .order_by(models.CodigoVerificacao.id_codigo.desc())
        .first()
    )
    if registro is None or registro.expira_em < agora():
        raise HTTPException(400, "Código expirado ou inexistente. Peça um novo código.")
    if registro.tentativas >= MAX_TENTATIVAS:
        raise HTTPException(400, "Muitas tentativas erradas. Peça um novo código.")

    if not hmac.compare_digest(registro.codigo_hash, _hash(codigo.strip())):
        registro.tentativas += 1
        db.commit()
        restantes = MAX_TENTATIVAS - registro.tentativas
        if restantes <= 0:
            raise HTTPException(400, "Código incorreto. Peça um novo código.")
        raise HTTPException(400, f"Código incorreto. Você ainda tem {restantes} tentativa(s).")

    registro.usado = True
