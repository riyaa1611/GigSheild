import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()


def get_db() -> Client:
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        raise RuntimeError("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")
    return create_client(url, key)


_db: Client = None


def db() -> Client:
    global _db
    if _db is None:
        _db = get_db()
    return _db
