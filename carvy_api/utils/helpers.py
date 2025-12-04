import re

def normalize_filename(make: str, model: str, year: int) -> str:
    raw = f"{make}_{model}_{year}"
    raw = raw.lower().replace(" ", "_")
    return f"{raw}.png"

