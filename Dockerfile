# Imagen base más ligera para la ejecución final
FROM python:3.11-slim

# 1. Instalar dependencias del sistema (apt)
# Solo las mínimas para librerías de imagen
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libgl1 \
    libsm6 \
    libxext6 \
    zlib1g-dev libjpeg-dev \
    && rm -rf /var/lib/apt/lists/*

# 2. Establecer el directorio de trabajo
WORKDIR /app

# 3. Copiar requirements.txt e instalar dependencias Python
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 4. FUERZA LA DESCARGA Y CACHÉ DEL MODELO
ENV REMBG_HOME=/app/.rembg_models
RUN python -c "from rembg import new_session; new_session(model_name='u2net')"

# 5. Copiar el resto del código
COPY . .

# 6. Comando de inicio
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"]