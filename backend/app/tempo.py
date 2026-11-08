from datetime import datetime
from zoneinfo import ZoneInfo

FUSO = ZoneInfo("America/Sao_Paulo")


def agora() -> datetime:
    return datetime.now(FUSO).replace(tzinfo=None)
