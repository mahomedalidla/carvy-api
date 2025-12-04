from supabase import create_client
from dotenv import load_dotenv
import os

load_dotenv()  # <--- MUY IMPORTANTE


SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")  # <- importante

BUCKET = "images"

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)


def file_exists(filename):
    files = supabase.storage.from_(BUCKET).list()
    return any(f["name"] == filename for f in files)


def upload_image(path, filename):
    with open(path, "rb") as f:
        supabase.storage.from_(BUCKET).upload(filename, f)

    # URL pública
    return supabase.storage.from_(BUCKET).get_public_url(filename)
