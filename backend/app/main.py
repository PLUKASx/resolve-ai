import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy.exc import OperationalError

from .database import BASE_DIR, Base, SessionLocal, engine
from .migracoes import atualizar_banco
from .routers import auth, cidadao, gestao, publico
from .routers.cidadao import UPLOAD_DIR
from .seed import seed_if_empty
from .services import email

log = logging.getLogger("resolve_ai")


@asynccontextmanager
async def lifespan(_: FastAPI):
    atualizar_banco(engine)
    Base.metadata.create_all(engine)
    if not email.configurado():
        log.warning(
            "E-mail (SMTP) não configurado: os códigos de confirmação e de recuperação de senha "
            "vão aparecer só neste log. Configure SMTP_* no .env para enviar de verdade."
        )
    with SessionLocal() as db:
        seed_if_empty(db)
    yield


app = FastAPI(
    title="Resolve Aí! API",
    description="API RESTful da plataforma de gestão urbana Resolve Aí!",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "https://localhost",
        "http://localhost",
        "capacitor://localhost",
        *filter(None, os.getenv("CORS_ORIGINS", "").split(",")),
    ],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(OperationalError)
async def banco_indisponivel(_: Request, exc: OperationalError):
    log.error("Banco de dados indisponível: %s", exc)
    return JSONResponse(
        status_code=503,
        content={"detail": "Banco de dados temporariamente indisponível. Tente novamente em instantes."},
    )


@app.exception_handler(Exception)
async def erro_inesperado(_: Request, exc: Exception):
    log.exception("Erro inesperado: %s", exc)
    return JSONResponse(status_code=500, content={"detail": "Erro interno no servidor. Tente novamente."})


UPLOAD_DIR.mkdir(exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

app.include_router(auth.router)
app.include_router(cidadao.router)
app.include_router(gestao.router)
app.include_router(publico.router)


@app.get("/api/saude", tags=["Público"])
def saude():
    return {"status": "ok"}


SITE_DIR = BASE_DIR / "site"

if SITE_DIR.is_dir():

    @app.get("/{caminho:path}", include_in_schema=False)
    def site(caminho: str):
        if caminho.startswith("api/"):
            raise HTTPException(404, "Rota não encontrada.")
        arquivo = (SITE_DIR / caminho).resolve()
        if caminho and arquivo.is_file() and arquivo.is_relative_to(SITE_DIR.resolve()):
            return FileResponse(arquivo)
        return FileResponse(SITE_DIR / "index.html")
