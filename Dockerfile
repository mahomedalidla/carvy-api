# Imagen base más ligera
FROM python:3.11-slim

# 1. Instalar dependencias mínimas del sistema operativo
# Esto permite que las librerías de imagen se instalen usando archivos binarios (wheels).
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 libsm6 libxext6 \
    zlib1g-dev libjpeg-dev \
    && rm -rf /var/lib/apt/lists/*

# 2. Establecer el directorio de trabajo
WORKDIR /app

# 3. Copiar requirements.txt
COPY requirements.txt .

# 4. INSTALACIÓN DE PYTHON (Paso más crítico)
# Usamos un solo RUN para evitar problemas de caché entre pasos.
RUN pip install --no-cache-dir -r requirements.txt

# 5. FUERZA LA DESCARGA Y CACHÉ DEL MODELO
ENV REMBG_HOME=/app/.rembg_models
RUN python -c "from rembg import new_session; new_session(model_name='u2net')"

# 6. Copiar el código de la aplicación
COPY . .

# 7. Comando de inicio
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"]