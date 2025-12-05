import os
import requests

# Si usas rembg, solo importarlo puede que no sea suficiente para forzar la descarga,
# por lo que es mejor usar su función de inicialización si es posible.
# Si tu librería no tiene una función específica, simplemente importarla es el primer paso.
try:
    print(">>> Iniciando el proceso para forzar la descarga del modelo u2net.onnx...")
    
    # ----------------------------------------------------------------------
    # ASUMIENDO QUE USAS REMBG (o una librería similar que descarga modelos)
    # ----------------------------------------------------------------------
    
    # Intenta una descarga directa para garantizar que el modelo esté en caché
    model_url = 'https://github.com/danielgatis/rembg/releases/download/v0.0.0/u2net.onnx'
    # Define la ruta de caché donde rembg lo espera
    cache_path = os.path.expanduser('~/.u2net/u2net.onnx') 
    
    # Crea la carpeta si no existe
    os.makedirs(os.path.dirname(cache_path), exist_ok=True)

    if not os.path.exists(cache_path):
        print(f">>> Descargando modelo desde {model_url}")
        response = requests.get(model_url, stream=True)
        response.raise_for_status() # Asegurar que la descarga fue exitosa
        
        with open(cache_path, 'wb') as f:
            for chunk in response.iter_content(chunk_size=8192):
                f.write(chunk)
        print(">>> Modelo descargado y cacheado exitosamente.")
    else:
        print(">>> Modelo u2net.onnx ya existe en caché.")

except Exception as e:
    # Esto es importante para que el build no falle si la descarga falla por un momento.
    print(f"ATENCIÓN: La descarga del modelo falló, pero el build continuará. Error: {e}")

print(">>> Tarea de pre-build completada.")