import os
import httpx
from fastapi import HTTPException
from dotenv import load_dotenv

load_dotenv()

ML_URL = os.getenv("ML_SERVICE_URL", "http://localhost:8001")


def _raise_ml_error(exc: Exception):
    if isinstance(exc, httpx.HTTPStatusError):
        status_code = exc.response.status_code
        detail = exc.response.text or "ML service returned an error"
        raise HTTPException(status_code=status_code, detail=detail)

    if isinstance(exc, httpx.RequestError):
        raise HTTPException(status_code=503, detail="ML service unavailable")

    raise HTTPException(status_code=500, detail="ML proxy error")


async def ml_get(path: str, params: dict = None):
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            r = await client.get(f"{ML_URL}{path}", params=params)
            r.raise_for_status()
            return r.json()
    except Exception as exc:
        _raise_ml_error(exc)


async def ml_post(path: str, body: dict):
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            r = await client.post(f"{ML_URL}{path}", json=body)
            r.raise_for_status()
            return r.json()
    except Exception as exc:
        _raise_ml_error(exc)
