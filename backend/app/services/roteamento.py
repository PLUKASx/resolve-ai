from sqlalchemy.orm import Session

from .. import models

ROTAS = {
    "Vazamento de água": "Saneamento (SANEAGO)",
    "Esgoto a céu aberto": "Saneamento (SANEAGO)",
    "Buraco na via": "Secretaria de Obras e Pavimentação",
    "Iluminação pública": "Iluminação Pública",
    "Árvore caída": "Meio Ambiente",
    "Sinalização danificada": "Trânsito e Mobilidade",
    "Lixo e entulho": "Limpeza Urbana",
    "Outros": "Central de Atendimento (triagem)",
}

DEPARTAMENTOS = sorted(set(ROTAS.values()))


def departamento_para(db: Session, categoria: str) -> models.Departamento | None:
    nome = ROTAS.get(categoria)
    if not nome:
        return None
    dep = db.query(models.Departamento).filter_by(nome_setor=nome).first()
    if dep is None:
        dep = models.Departamento(nome_setor=nome)
        db.add(dep)
        db.flush()
    return dep
