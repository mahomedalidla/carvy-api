import os
from dotenv import load_dotenv



from fastapi import FastAPI
from pydantic import BaseModel
from carvy_api.utils.helpers import normalize_filename
from carvy_api.services.supabase_service import file_exists, upload_image
from carvy_api.services.gemini_service import generate_car_image
from carvy_api.services.bg_remove_service import remove_background
load_dotenv()  # <- Muy importante
app = FastAPI()

load_dotenv()  # <- Muy importante
print(os.getenv('SUPABASE_URL'))

class CarRequest(BaseModel):
    make: str
    model: str
    year: int



@app.post("/generate-car-image")
async def generate_car_endpoint(req: CarRequest):
    # Normalizar nombre de archivo
    filename = normalize_filename(req.make, req.model, req.year)

    # 1. Si existe en Supabase, regresar la URL
    if file_exists(filename):
        url = f"{os.getenv('SUPABASE_URL')}/storage/v1/object/public/cars/{filename}"
        return {"exists": True, "url": url}
    
    # 2. Crear carpeta temp si no existe
    temp_dir = "temp"
    os.makedirs(temp_dir, exist_ok=True)

    # 3. Generar imagen IA
    raw_path = os.path.join(temp_dir, filename)
    await generate_car_image(req.make, req.model, req.year, raw_path)

    # 4. Quitar fondo
    final_path = os.path.join(temp_dir, f"nofondo_{filename}")
    remove_background(raw_path, final_path)

    # 5. Subir a Supabase
    url = upload_image(final_path, filename)

    return {
        "exists": False,
        "generated": True,
        "url": url
    }
