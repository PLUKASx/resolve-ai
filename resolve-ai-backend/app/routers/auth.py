from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db
from ..security import criar_token, hash_senha, verificar_senha

router = APIRouter(prefix="/api/auth", tags=["Autenticação"])


def _token_cidadao(c: models.Cidadao) -> schemas.Token:
    return schemas.Token(
        access_token=criar_token(c.id_cidadao, "cidadao"),
        perfil="cidadao",
        usuario={"id": c.id_cidadao, "nome": c.nome},
    )


@router.post("/cidadao/registro", response_model=schemas.Token, status_code=201)
def registrar_cidadao(dados: schemas.RegistroCidadao, db: Session = Depends(get_db)):
    if db.query(models.Cidadao).filter_by(cpf=dados.cpf).first():
        raise HTTPException(status.HTTP_409_CONFLICT, "Já existe uma conta com este CPF.")
    cidadao = models.Cidadao(nome=dados.nome, cpf=dados.cpf, senha=hash_senha(dados.senha))
    db.add(cidadao)
    db.commit()
    return _token_cidadao(cidadao)


@router.post("/cidadao/login", response_model=schemas.Token)
def login_cidadao(dados: schemas.LoginCidadao, db: Session = Depends(get_db)):
    cidadao = db.query(models.Cidadao).filter_by(cpf=dados.cpf).first()
    if cidadao is None or not verificar_senha(dados.senha, cidadao.senha):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "CPF ou senha incorretos.")
    return _token_cidadao(cidadao)


@router.post("/gestor/login", response_model=schemas.Token)
def login_gestor(dados: schemas.LoginGestor, db: Session = Depends(get_db)):
    gestor = db.query(models.Gestor).filter_by(matricula=dados.matricula.strip()).first()
    if gestor is None or not verificar_senha(dados.senha, gestor.senha):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Matrícula ou senha incorretas.")
    return schemas.Token(
        access_token=criar_token(gestor.id_gestor, "gestor"),
        perfil="gestor",
        usuario={
            "id": gestor.id_gestor,
            "nome": gestor.nome,
            "departamento": gestor.departamento.nome_setor if gestor.departamento else None,
        },
    )
