# Imagen base más ligera
FROM python:3.11-slim

# 1. Instalar dependencias mínimas del sistema operativo
# Eliminamos compiladores para forzar el uso de archivos binarios (wheels)
# Esto reduce el consumo de RAM.
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 libsm6 libxext6 \
    zlib1g-dev libjpeg-dev \
    && rm -rf /var/lib/apt/lists/*

# 2. Establecer el directorio de trabajo
WORKDIR /app

# 3. Copiar el archivo completo de requerimientos
COPY requirements.txt .

# 4. INSTALACIÓN POR ETAPAS (CRÍTICO)

# A. Instalar las dependencias MÁS pesadas (OpenCV, SciPy, NumPy) primero.
# Esto aísla el pico de RAM más grande.
# Usamos un comando de shell para extraer las líneas de los archivos pesados.
RUN echo "Instalando paquetes pesados: OpenCV, SciPy, NumPy..." \
    && grep -E 'opencv-python-headless|scipy|numpy' requirements.txt > heavy_reqs.txt \
    && pip install --no-cache-dir -r heavy_reqs.txt \
    && rm heavy_reqs.txt

# B. Instalar las dependencias PESADAS de imagen (Pillow, Rembg)
# Pillow también puede requerir compilación.
RUN echo "Instalando rembg y Pillow..." \
    && grep -E 'rembg|pillow|scikit-image' requirements.txt > image_reqs.txt \
    && pip install --no-cache-dir -r image_reqs.txt \
    && rm image_reqs.txt

# C. Instalar el resto de las dependencias (FastAPI, Google, Supabase, etc.)
# Esto es mucho más ligero y debería terminar sin problemas.
RUN echo "Instalando el resto de dependencias..." \
    && grep -v -E 'opencv-python-headless|scipy|numpy|rembg|pillow|scikit-image' requirements.txt > light_reqs.txt \
    && pip install --no-cache-dir -r light_reqs.txt \
    && rm light_reqs.txt

# 5. FUERZA LA DESCARGA Y CACHÉ DEL MODELO
ENV REMBG_HOME=/app/.rembg_models
RUN python -c "from rembg import new_session; new_session(model_name='u2net')"

# 6. Copiar el código de la aplicación
COPY . .

# 7. Comando de inicio
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"]