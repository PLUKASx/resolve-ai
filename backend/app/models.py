from datetime import datetime

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base
from .tempo import agora


class Departamento(Base):
    __tablename__ = "departamento"

    id_departamento: Mapped[int] = mapped_column(Integer, primary_key=True)
    nome_setor: Mapped[str] = mapped_column(String(120), unique=True)

    gestores: Mapped[list["Gestor"]] = relationship(back_populates="departamento")
    ocorrencias: Mapped[list["Ocorrencia"]] = relationship(back_populates="departamento")


class Cidadao(Base):
    __tablename__ = "cidadao"

    id_cidadao: Mapped[int] = mapped_column(Integer, primary_key=True)
    nome: Mapped[str] = mapped_column(String(120))
    cpf: Mapped[str] = mapped_column(String(11), unique=True, index=True)
    senha: Mapped[str] = mapped_column(String(100))
    criado_em: Mapped[datetime] = mapped_column(DateTime, default=agora)
    email: Mapped[str | None] = mapped_column(String(120), index=True)
    email_confirmado: Mapped[bool] = mapped_column(Boolean, default=False, server_default="0")
    ativo: Mapped[bool] = mapped_column(Boolean, default=True, server_default="1")
    versao_sessao: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    nivel_identidade: Mapped[str] = mapped_column(String(30), default="nao_verificado", server_default="nao_verificado")

    ocorrencias: Mapped[list["Ocorrencia"]] = relationship(back_populates="cidadao")
    codigos: Mapped[list["CodigoVerificacao"]] = relationship(
        back_populates="cidadao", cascade="all, delete-orphan"
    )


class CodigoVerificacao(Base):

    __tablename__ = "codigo_verificacao"

    id_codigo: Mapped[int] = mapped_column(Integer, primary_key=True)
    id_cidadao: Mapped[int] = mapped_column(ForeignKey("cidadao.id_cidadao"), index=True)
    finalidade: Mapped[str] = mapped_column(String(30))
    codigo_hash: Mapped[str] = mapped_column(String(64))
    criado_em: Mapped[datetime] = mapped_column(DateTime, default=agora)
    expira_em: Mapped[datetime] = mapped_column(DateTime)
    tentativas: Mapped[int] = mapped_column(Integer, default=0)
    usado: Mapped[bool] = mapped_column(Boolean, default=False)

    cidadao: Mapped["Cidadao"] = relationship(back_populates="codigos")


class Gestor(Base):
    __tablename__ = "gestor"

    id_gestor: Mapped[int] = mapped_column(Integer, primary_key=True)
    nome: Mapped[str] = mapped_column(String(120))
    matricula: Mapped[str] = mapped_column(String(20), unique=True, index=True)
    senha: Mapped[str] = mapped_column(String(100))
    id_departamento: Mapped[int | None] = mapped_column(ForeignKey("departamento.id_departamento"))

    departamento: Mapped[Departamento | None] = relationship(back_populates="gestores")


class Ocorrencia(Base):
    __tablename__ = "ocorrencia"

    id_ocorrencia: Mapped[int] = mapped_column(Integer, primary_key=True)
    categoria: Mapped[str] = mapped_column(String(60), index=True)
    descricao: Mapped[str] = mapped_column(Text, default="")
    latitude: Mapped[float] = mapped_column(Float)
    longitude: Mapped[float] = mapped_column(Float)
    precisao_gps: Mapped[float | None] = mapped_column(Float)
    bairro: Mapped[str] = mapped_column(String(80), index=True)
    status: Mapped[str] = mapped_column(String(30), default="Aberta", index=True)
    indice_criticidade: Mapped[int] = mapped_column(Integer, default=0)
    foto_url: Mapped[str | None] = mapped_column(String(255))
    data_registro: Mapped[datetime] = mapped_column(DateTime, default=agora)
    data_atualizacao: Mapped[datetime] = mapped_column(DateTime, default=agora)
    data_resolucao: Mapped[datetime | None] = mapped_column(DateTime)
    id_cidadao: Mapped[int] = mapped_column(ForeignKey("cidadao.id_cidadao"))
    id_departamento: Mapped[int | None] = mapped_column(ForeignKey("departamento.id_departamento"))

    cidadao: Mapped[Cidadao] = relationship(back_populates="ocorrencias")
    departamento: Mapped[Departamento | None] = relationship(back_populates="ocorrencias")
    historico: Mapped[list["HistoricoStatus"]] = relationship(
        back_populates="ocorrencia",
        order_by="HistoricoStatus.data",
        cascade="all, delete-orphan",
    )


class HistoricoStatus(Base):
    __tablename__ = "historico_status"

    id_historico: Mapped[int] = mapped_column(Integer, primary_key=True)
    id_ocorrencia: Mapped[int] = mapped_column(ForeignKey("ocorrencia.id_ocorrencia"), index=True)
    status: Mapped[str] = mapped_column(String(30))
    observacao: Mapped[str] = mapped_column(Text, default="")
    autor: Mapped[str] = mapped_column(String(120), default="Sistema")
    data: Mapped[datetime] = mapped_column(DateTime, default=agora)

    ocorrencia: Mapped[Ocorrencia] = relationship(back_populates="historico")
