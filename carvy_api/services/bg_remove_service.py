import io
from rembg import remove
from PIL import Image

def remove_background(input_path, output_path):
    with open(input_path, "rb") as file:
        input_data = file.read()

    output_bytes = remove(input_data)
    img = Image.open(io.BytesIO(output_bytes)).convert("RGBA")
    img.save(output_path)
    return output_path
