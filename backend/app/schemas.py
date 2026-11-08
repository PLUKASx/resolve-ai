import re
from datetime import datetime

from pydantic import BaseModel, Field, field_validator

STATUS = ["Aberta", "Em análise", "Encaminhada", "Em execução", "Resolvida", "Improcedente"]
FAIXAS = ["Alta", "Média", "Baixa"]


def limpar_cpf(valor: str) -> str:
    return re.sub(r"\D", "", valor or "")


def cpf_valido(cpf: str) -> bool:
    if len(cpf) != 11 or cpf == cpf[0] * 11:
        return False
    for i in (9, 10):
        soma = sum(int(cpf[j]) * (i + 1 - j) for j in range(i))
        if (soma * 10) % 11 % 10 != int(cpf[i]):
            return False
    return True


_EMAIL = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def validar_email(valor: str) -> str:
    email = (valor or "").strip().lower()
    if len(email) > 120 or not _EMAIL.match(email):
        raise ValueError("E-mail inválido")
    return email


def _cpf_obrigatorio(v: str) -> str:
    cpf = limpar_cpf(v)
    if not cpf_valido(cpf):
        raise ValueError("CPF inválido")
    return cpf


class RegistroCidadao(BaseModel):
    nome: str = Field(min_length=3, max_length=120)
    cpf: str
    email: str
    senha: str = Field(min_length=6, max_length=64)

    @field_validator("nome")
    @classmethod
    def _nome(cls, v: str) -> str:
        return v.strip()

    @field_validator("cpf")
    @classmethod
    def _cpf(cls, v: str) -> str:
        return _cpf_obrigatorio(v)

    @field_validator("email")
    @classmethod
    def _email(cls, v: str) -> str:
        return validar_email(v)


class RegistroPendente(BaseModel):
    mensagem: str
    email_mascarado: str


class SoCpf(BaseModel):
    cpf: str

    @field_validator("cpf")
    @classmethod
    def _cpf(cls, v: str) -> str:
        return limpar_cpf(v)


class ConfirmarEmail(SoCpf):
    codigo: str = Field(min_length=6, max_length=6)


class RedefinirSenha(SoCpf):
    codigo: str = Field(min_length=6, max_length=6)
    nova_senha: str = Field(min_length=6, max_length=64)


class Mensagem(BaseModel):
    mensagem: str


class LoginCidadao(BaseModel):
    cpf: str
    senha: str = Field(max_length=64)

    @field_validator("cpf")
    @classmethod
    def _cpf(cls, v: str) -> str:
        return limpar_cpf(v)


class LoginGestor(BaseModel):
    matricula: str = Field(min_length=1, max_length=20)
    senha: str = Field(max_length=64)


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    perfil: str
    usuario: dict


class HistoricoOut(BaseModel):
    status: str
    observacao: str
    autor: str
    data: datetime


class OcorrenciaResumo(BaseModel):
    id: int
    protocolo: str
    categoria: str
    bairro: str
    status: str
    indice_criticidade: int
    faixa: str
    dias_espera: int
    data_registro: datetime
    departamento: str | None
    latitude: float
    longitude: float


class OcorrenciaDetalhe(OcorrenciaResumo):
    descricao: str
    precisao_gps: float | None
    foto_url: str | None
    data_atualizacao: datetime
    data_resolucao: datetime | None
    historico: list[HistoricoOut]
    composicao_indice: dict | None = None
    denunciante_ref: str | None = None
    denunciante_nivel: str | None = None


class AtualizarStatus(BaseModel):
    status: str
    observacao: str = Field(default="", max_length=500)

    @field_validator("status")
    @classmethod
    def _status(cls, v: str) -> str:
        if v not in STATUS:
            raise ValueError(f"Status inválido. Use um de: {', '.join(STATUS)}")
        return v


class PontoMapa(BaseModel):
    id: int
    protocolo: str
    latitude: float
    longitude: float
    categoria: str
    status: str
    bairro: str
    indice_criticidade: int
    faixa: str
