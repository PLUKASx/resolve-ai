import logging
import os
import threading
import time
from collections import defaultdict, deque
from datetime import datetime, timedelta, timezone

import bcrypt
import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from . import models
from .database import get_db

log = logging.getLogger("resolve_ai")

CHAVE_DESENVOLVIMENTO = "resolve-ai-chave-de-desenvolvimento-troque-em-producao"
MODO_DEMO = os.getenv("DADOS_DEMO", "sim").strip().lower() not in ("nao", "não", "false", "0")


def _carregar_chave() -> str:
    chave = os.getenv("SECRET_KEY", "").strip()
    if chave and chave not in (CHAVE_DESENVOLVIMENTO, "troque-por-um-texto-longo-e-aleatorio"):
        return chave
    if not MODO_DEMO:
        raise RuntimeError(
            "Com DADOS_DEMO=nao, defina no .env uma SECRET_KEY própria (texto longo e aleatório)."
        )
    log.warning("SECRET_KEY não definida: usando a chave de desenvolvimento (só para demonstração).")
    return CHAVE_DESENVOLVIMENTO


SECRET_KEY = _carregar_chave()
ALGORITHM = "HS256"
EXPIRACAO = timedelta(hours=12)


class LimiteTentativas:

    def __init__(self, maximo: int = 5, janela_s: int = 5 * 60):
        self.maximo = maximo
        self.janela_s = janela_s
        self._falhas: dict[str, deque[float]] = defaultdict(deque)
        self._trava = threading.Lock()

    def _recentes(self, chave: str, agora: float) -> deque[float]:
        falhas = self._falhas[chave]
        while falhas and agora - falhas[0] > self.janela_s:
            falhas.popleft()
        return falhas

    def verificar(self, chave: str) -> None:
        with self._trava:
            agora = time.monotonic()
            falhas = self._recentes(chave, agora)
            if len(falhas) >= self.maximo:
                espera = int(self.janela_s - (agora - falhas[0])) + 1
                minutos = max(1, round(espera / 60))
                raise HTTPException(
                    status.HTTP_429_TOO_MANY_REQUESTS,
                    f"Muitas tentativas de login. Aguarde {minutos} minuto(s) e tente novamente.",
                    headers={"Retry-After": str(espera)},
                )

    def registrar_falha(self, chave: str) -> None:
        with self._trava:
            agora = time.monotonic()
            self._recentes(chave, agora).append(agora)

    def limpar(self, chave: str | None = None) -> None:
        with self._trava:
            if chave is None:
                self._falhas.clear()
            else:
                self._falhas.pop(chave, None)


limite_login = LimiteTentativas()

_bearer = HTTPBearer(auto_error=False)


def hash_senha(senha: str) -> str:
    return bcrypt.hashpw(senha.encode(), bcrypt.gensalt()).decode()


def verificar_senha(senha: str, hash_: str) -> bool:
    try:
        return bcrypt.checkpw(senha.encode(), hash_.encode())
    except ValueError:
        return False


def criar_token(id_usuario: int, perfil: str, versao: int = 0) -> str:
    payload = {
        "sub": str(id_usuario),
        "perfil": perfil,
        "v": versao,
        "exp": datetime.now(timezone.utc) + EXPIRACAO,
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def _sessao_invalida() -> HTTPException:
    return HTTPException(
        status.HTTP_401_UNAUTHORIZED,
        "Sessão inválida ou expirada. Faça login novamente.",
        headers={"WWW-Authenticate": "Bearer"},
    )


def _ler_token(cred: HTTPAuthorizationCredentials | None, perfil: str) -> dict:
    nao_autorizado = _sessao_invalida()
    if cred is None:
        raise nao_autorizado
    try:
        payload = jwt.decode(cred.credentials, SECRET_KEY, algorithms=[ALGORITHM])
    except jwt.PyJWTError:
        raise nao_autorizado
    if payload.get("perfil") != perfil:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Acesso não permitido para este perfil.")
    return payload


def get_cidadao_atual(
    cred: HTTPAuthorizationCredentials | None = Depends(_bearer),
    db: Session = Depends(get_db),
) -> models.Cidadao:
    payload = _ler_token(cred, "cidadao")
    cidadao = db.get(models.Cidadao, int(payload["sub"]))
    if cidadao is None or not cidadao.ativo:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Usuário não encontrado.")
    if payload.get("v", 0) != cidadao.versao_sessao:
        raise _sessao_invalida()
    return cidadao


def get_gestor_atual(
    cred: HTTPAuthorizationCredentials | None = Depends(_bearer),
    db: Session = Depends(get_db),
) -> models.Gestor:
    gestor = db.get(models.Gestor, int(_ler_token(cred, "gestor")["sub"]))
    if gestor is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Usuário não encontrado.")
    return gestor
