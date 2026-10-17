import os
from datetime import datetime, timedelta, timezone

import bcrypt
import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from . import models
from .database import get_db

SECRET_KEY = os.getenv("SECRET_KEY") or "resolve-ai-chave-de-desenvolvimento-troque-em-producao"
ALGORITHM = "HS256"
EXPIRACAO = timedelta(hours=12)

_bearer = HTTPBearer(auto_error=False)


def hash_senha(senha: str) -> str:
    return bcrypt.hashpw(senha.encode(), bcrypt.gensalt()).decode()


def verificar_senha(senha: str, hash_: str) -> bool:
    try:
        return bcrypt.checkpw(senha.encode(), hash_.encode())
    except ValueError:
        return False


def criar_token(id_usuario: int, perfil: str) -> str:
    payload = {
        "sub": str(id_usuario),
        "perfil": perfil,
        "exp": datetime.now(timezone.utc) + EXPIRACAO,
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def _id_do_token(cred: HTTPAuthorizationCredentials | None, perfil: str) -> int:
    nao_autorizado = HTTPException(
        status.HTTP_401_UNAUTHORIZED,
        "Sessão inválida ou expirada. Faça login novamente.",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if cred is None:
        raise nao_autorizado
    try:
        payload = jwt.decode(cred.credentials, SECRET_KEY, algorithms=[ALGORITHM])
    except jwt.PyJWTError:
        raise nao_autorizado
    if payload.get("perfil") != perfil:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Acesso não permitido para este perfil.")
    return int(payload["sub"])


def get_cidadao_atual(
    cred: HTTPAuthorizationCredentials | None = Depends(_bearer),
    db: Session = Depends(get_db),
) -> models.Cidadao:
    cidadao = db.get(models.Cidadao, _id_do_token(cred, "cidadao"))
    if cidadao is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Usuário não encontrado.")
    return cidadao


def get_gestor_atual(
    cred: HTTPAuthorizationCredentials | None = Depends(_bearer),
    db: Session = Depends(get_db),
) -> models.Gestor:
    gestor = db.get(models.Gestor, _id_do_token(cred, "gestor"))
    if gestor is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Usuário não encontrado.")
    return gestor
