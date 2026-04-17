import os
import hmac
import hashlib
import json
import base64
from fastapi import HTTPException, Header
from dotenv import load_dotenv

load_dotenv()

SECRET = os.getenv("ADMIN_JWT_SECRET", "gigshield-admin-dev-secret")


def create_admin_token(user_id: str, phone: str) -> str:
    payload = json.dumps({"userId": user_id, "phone": phone, "role": "admin"})
    sig = hmac.new(SECRET.encode(), payload.encode(), hashlib.sha256).hexdigest()
    token_data = base64.b64encode(payload.encode()).decode()
    return f"{token_data}.{sig}"


def verify_admin_token(token: str) -> dict:
    try:
        parts = token.split(".")
        if len(parts) != 2:
            raise ValueError("bad format")
        payload_b64, sig = parts
        payload = base64.b64decode(payload_b64).decode()
        expected_sig = hmac.new(SECRET.encode(), payload.encode(), hashlib.sha256).hexdigest()
        if not hmac.compare_digest(sig, expected_sig):
            raise ValueError("invalid signature")
        data = json.loads(payload)
        if data.get("role") != "admin":
            raise ValueError("not admin")
        return data
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Unauthorized: {e}")


def get_admin(authorization: str = Header(None)) -> dict:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing admin token")
    return verify_admin_token(authorization.removeprefix("Bearer "))
