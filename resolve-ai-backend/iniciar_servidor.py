import os
from pathlib import Path

from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent / ".env")

import uvicorn

if __name__ == "__main__":
    porta = int(os.getenv("SERVER_PORT") or os.getenv("PORT") or 8000)
    uvicorn.run("app.main:app", host="0.0.0.0", port=porta, proxy_headers=True, forwarded_allow_ips="*")
