import html
import logging
import os
import smtplib
import ssl
from email.message import EmailMessage
from email.utils import formataddr

log = logging.getLogger("resolve_ai")


def configurado() -> bool:
    return bool(os.getenv("SMTP_HOST", "").strip())


def mascarar(email: str | None) -> str:
    if not email or "@" not in email:
        return ""
    usuario, dominio = email.split("@", 1)
    return f"{usuario[:2]}***@{dominio}"


def enviar(destinatario: str, assunto: str, texto: str) -> None:
    if not configurado():
        log.warning("SMTP não configurado. E-mail NÃO enviado para %s:\n%s\n%s", destinatario, assunto, texto)
        return

    usuario = os.getenv("SMTP_USUARIO", "").strip()
    remetente = os.getenv("EMAIL_REMETENTE", "").strip() or formataddr(("Resolve Aí!", usuario))

    msg = EmailMessage()
    msg["Subject"] = assunto
    msg["From"] = remetente
    msg["To"] = destinatario
    msg.set_content(texto)
    corpo = html.escape(texto).replace("\n", "<br>")
    msg.add_alternative(
        f'<div style="font-family:Arial,sans-serif;font-size:15px;color:#1e293b;max-width:520px">{corpo}</div>',
        subtype="html",
    )

    host = os.getenv("SMTP_HOST", "").strip()
    porta = int(os.getenv("SMTP_PORTA", "587").strip() or 587)
    senha = os.getenv("SMTP_SENHA", "").replace(" ", "")
    contexto = ssl.create_default_context()
    try:
        if porta == 465:
            with smtplib.SMTP_SSL(host, porta, context=contexto, timeout=20) as smtp:
                smtp.login(usuario, senha)
                smtp.send_message(msg)
        else:
            with smtplib.SMTP(host, porta, timeout=20) as smtp:
                smtp.starttls(context=contexto)
                smtp.login(usuario, senha)
                smtp.send_message(msg)
        log.info("E-mail enviado para %s (%s)", mascarar(destinatario), assunto)
    except Exception:
        log.exception("Falha ao enviar e-mail para %s", mascarar(destinatario))


def codigo_confirmacao(destinatario: str, nome: str, codigo: str, minutos: int) -> None:
    enviar(
        destinatario,
        f"Resolve Aí! - seu código de confirmação: {codigo}",
        f"Olá, {nome.split()[0]}!\n\n"
        f"Seu código para confirmar o cadastro no Resolve Aí! é:\n\n{codigo}\n\n"
        f"Ele vale por {minutos} minutos.\n\n"
        "Se você não fez este cadastro, ignore este e-mail: sem a confirmação, a conta não é ativada.",
    )


def codigo_recuperacao(destinatario: str, nome: str, codigo: str, minutos: int) -> None:
    enviar(
        destinatario,
        f"Resolve Aí! - código para redefinir sua senha: {codigo}",
        f"Olá, {nome.split()[0]}!\n\n"
        f"Recebemos um pedido para redefinir sua senha. Seu código é:\n\n{codigo}\n\n"
        f"Ele vale por {minutos} minutos.\n\n"
        "Se não foi você, ignore este e-mail: sua senha continua a mesma.",
    )
