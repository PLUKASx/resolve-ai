from datetime import timedelta

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from fastapi.responses import JSONResponse
from sqlalchemy import func
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db
from ..security import criar_token, hash_senha, limite_login, verificar_senha
from ..services import codigos, email, identidade
from ..tempo import agora

router = APIRouter(prefix="/api/auth", tags=["Autenticação"])

PRAZO_CONFIRMACAO = timedelta(hours=24)

EMAIL_JA_CADASTRADO = (
    "Este e-mail já está cadastrado. Cada e-mail pode ser usado em apenas uma conta: use outro e-mail "
    "ou, se a conta é sua, use \"Esqueci minha senha\" na tela de entrada."
)

CPF_JA_CADASTRADO = (
    "Este CPF já está cadastrado. Se a conta é sua, use \"Esqueci minha senha\" na tela de entrada. "
    "Se você não reconhece este cadastro, procure o atendimento da prefeitura."
)


def _token_cidadao(c: models.Cidadao) -> schemas.Token:
    return schemas.Token(
        access_token=criar_token(c.id_cidadao, "cidadao", c.versao_sessao),
        perfil="cidadao",
        usuario={"id": c.id_cidadao, "nome": c.nome},
    )


def _buscar_por_cpf(db: Session, cpf: str) -> models.Cidadao | None:
    return db.query(models.Cidadao).filter_by(cpf=cpf, ativo=True).first()


def _aguardando_confirmacao(c: models.Cidadao) -> bool:
    return bool(c.email) and not c.email_confirmado


def _atualizar_nivel(c: models.Cidadao) -> None:
    c.nivel_identidade = identidade.nivel_maior(c.nivel_identidade, identidade.NIVEL_EMAIL)


def _enviar_codigo_confirmacao(db: Session, c: models.Cidadao, tarefas: BackgroundTasks) -> None:
    codigo = codigos.gerar(db, c, codigos.CONFIRMAR_EMAIL)
    tarefas.add_task(
        email.codigo_confirmacao, c.email, c.nome, codigo, codigos.VALIDADE_MIN[codigos.CONFIRMAR_EMAIL]
    )


@router.post("/cidadao/registro", response_model=schemas.RegistroPendente, status_code=201)
def registrar_cidadao(dados: schemas.RegistroCidadao, tarefas: BackgroundTasks, db: Session = Depends(get_db)):
    existente = _buscar_por_cpf(db, dados.cpf)
    if existente is not None:
        expirou = agora() - existente.criado_em > PRAZO_CONFIRMACAO
        if not _aguardando_confirmacao(existente):
            raise HTTPException(status.HTTP_409_CONFLICT, CPF_JA_CADASTRADO)
        if not expirou:
            raise HTTPException(
                status.HTTP_409_CONFLICT,
                "Já existe um cadastro com este CPF aguardando a confirmação do e-mail "
                f"{email.mascarar(existente.email)}. Se não foi você, tente de novo em 24 horas "
                "ou procure o atendimento da prefeitura.",
            )
        db.delete(existente)
        db.flush()

    for outro in db.query(models.Cidadao).filter(
        func.lower(models.Cidadao.email) == dados.email, models.Cidadao.ativo.is_(True)
    ):
        if _aguardando_confirmacao(outro) and agora() - outro.criado_em > PRAZO_CONFIRMACAO:
            db.delete(outro)
            continue
        raise HTTPException(status.HTTP_409_CONFLICT, EMAIL_JA_CADASTRADO)
    db.flush()

    cidadao = models.Cidadao(
        nome=dados.nome, cpf=dados.cpf, email=dados.email,
        senha=hash_senha(dados.senha), email_confirmado=False,
    )
    db.add(cidadao)
    db.commit()
    _enviar_codigo_confirmacao(db, cidadao, tarefas)
    return schemas.RegistroPendente(
        mensagem="Conta criada! Enviamos um código para o seu e-mail. Digite-o para ativar a conta.",
        email_mascarado=email.mascarar(cidadao.email),
    )


@router.post("/cidadao/confirmar-email", response_model=schemas.Token)
def confirmar_email(dados: schemas.ConfirmarEmail, db: Session = Depends(get_db)):
    cidadao = _buscar_por_cpf(db, dados.cpf)
    if cidadao is None or not cidadao.email:
        raise HTTPException(400, "Código expirado ou inexistente. Peça um novo código.")
    if cidadao.email_confirmado:
        raise HTTPException(400, "Este e-mail já foi confirmado. Entre com seu CPF e senha.")
    codigos.validar(db, cidadao, codigos.CONFIRMAR_EMAIL, dados.codigo)
    cidadao.email_confirmado = True
    _atualizar_nivel(cidadao)
    db.commit()
    return _token_cidadao(cidadao)


@router.post("/cidadao/reenviar-codigo", response_model=schemas.Mensagem)
def reenviar_codigo(dados: schemas.SoCpf, tarefas: BackgroundTasks, db: Session = Depends(get_db)):
    cidadao = _buscar_por_cpf(db, dados.cpf)
    if cidadao is not None and _aguardando_confirmacao(cidadao):
        _enviar_codigo_confirmacao(db, cidadao, tarefas)
    return schemas.Mensagem(mensagem="Se houver um cadastro aguardando confirmação, enviamos um novo código.")


@router.post("/cidadao/login", response_model=schemas.Token)
def login_cidadao(dados: schemas.LoginCidadao, tarefas: BackgroundTasks, db: Session = Depends(get_db)):
    chave = f"cidadao:{dados.cpf}"
    limite_login.verificar(chave)
    cidadao = _buscar_por_cpf(db, dados.cpf)
    if cidadao is None or not verificar_senha(dados.senha, cidadao.senha):
        limite_login.registrar_falha(chave)
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "CPF ou senha incorretos.")
    limite_login.limpar(chave)

    if _aguardando_confirmacao(cidadao):
        try:
            _enviar_codigo_confirmacao(db, cidadao, tarefas)
        except codigos.AguardeReenvio:
            pass
        return JSONResponse(
            status_code=status.HTTP_403_FORBIDDEN,
            content={"detail": f"Confirme seu e-mail para entrar. Enviamos um código para "
                               f"{email.mascarar(cidadao.email)}."},
            background=tarefas,
        )
    return _token_cidadao(cidadao)


@router.post("/gestor/login", response_model=schemas.Token)
def login_gestor(dados: schemas.LoginGestor, db: Session = Depends(get_db)):
    matricula = dados.matricula.strip()
    chave = f"gestor:{matricula}"
    limite_login.verificar(chave)
    gestor = db.query(models.Gestor).filter_by(matricula=matricula).first()
    if gestor is None or not verificar_senha(dados.senha, gestor.senha):
        limite_login.registrar_falha(chave)
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Matrícula ou senha incorretas.")
    limite_login.limpar(chave)
    return schemas.Token(
        access_token=criar_token(gestor.id_gestor, "gestor"),
        perfil="gestor",
        usuario={
            "id": gestor.id_gestor,
            "nome": gestor.nome,
            "departamento": gestor.departamento.nome_setor if gestor.departamento else None,
        },
    )


@router.post("/cidadao/esqueci-senha", response_model=schemas.Mensagem)
def esqueci_senha(dados: schemas.SoCpf, tarefas: BackgroundTasks, db: Session = Depends(get_db)):
    cidadao = _buscar_por_cpf(db, dados.cpf)
    if cidadao is not None and cidadao.email:
        try:
            codigo = codigos.gerar(db, cidadao, codigos.RECUPERAR_SENHA)
            tarefas.add_task(
                email.codigo_recuperacao, cidadao.email, cidadao.nome, codigo,
                codigos.VALIDADE_MIN[codigos.RECUPERAR_SENHA],
            )
        except codigos.AguardeReenvio:
            pass
    return schemas.Mensagem(
        mensagem="Se o CPF estiver cadastrado, você vai receber um código no e-mail da conta em instantes."
    )


@router.post("/cidadao/redefinir-senha", response_model=schemas.Token)
def redefinir_senha(dados: schemas.RedefinirSenha, db: Session = Depends(get_db)):
    cidadao = _buscar_por_cpf(db, dados.cpf)
    if cidadao is None or not cidadao.email:
        raise HTTPException(400, "Código expirado ou inexistente. Peça um novo código.")
    codigos.validar(db, cidadao, codigos.RECUPERAR_SENHA, dados.codigo)
    cidadao.senha = hash_senha(dados.nova_senha)
    cidadao.email_confirmado = True
    _atualizar_nivel(cidadao)
    cidadao.versao_sessao += 1
    db.commit()
    limite_login.limpar(f"cidadao:{dados.cpf}")
    return _token_cidadao(cidadao)
