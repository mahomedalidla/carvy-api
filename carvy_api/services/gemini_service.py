import os
import logging
from google import genai
from PIL import Image

logger = logging.getLogger(__name__)

# Cargar API KEY correctamente
GEMINI_KEY = os.getenv("GOOGLE_API_KEY")
print("🔑 Cargando Gemini KEY:", GEMINI_KEY)

client = genai.Client(api_key=GEMINI_KEY)


async def generate_car_image(make: str, model_name: str, year: int, output_path: str):
    logger.info(f"🔧 Generating Gemini image for {make} {model_name} {year}")

    prompt = (
        f"Generate a realistic studio photo of a {year} {make} {model_name}, "
        f"high detail, cinematic lighting, clean background."
    )

    # El modelo correcto para imágenes según la doc
    model = "gemini-2.5-flash-image"

    response = client.models.generate_content(
        model=model,
        contents=[prompt],
    )

    # Buscar la parte que contiene la imagen generada
    for part in response.parts:
        # Si es texto, lo ignoramos (a veces da captions)
        if part.text:
            logger.debug(f"Gemini text part: {part.text}")
            continue

        if part.inline_data:
            logger.info("📸 Imagen generada por Gemini, guardando...")

            image = part.as_image()  # Convierte binary → PIL Image
            image.save(output_path)

            logger.info(f"✅ Imagen guardada en: {output_path}")
            return output_path

    # Si llega aquí, Gemini no envió imagen
    raise Exception("❌ Gemini no regresó ninguna imagen en inline_data")
