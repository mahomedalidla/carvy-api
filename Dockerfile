# 1. Imagen base pequeña (menor consumo inicial de RAM)
FROM python:3.11-slim

# 2. INSTALAR DEPENDENCIAS DEL SISTEMA OPERATIVO
# Añadimos --no-install-recommends para evitar paquetes innecesarios.
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libgl1 \
    libsm6 \
    libxext6 \
    libatlas-base-dev \
    zlib1g-dev libjpeg-dev \
    && rm -rf /var/lib/apt/lists/*

# 3. Establecer el directorio de trabajo
WORKDIR /app

# 4. Copiar requirements.txt
COPY requirements.txt .

# 5. INSTALACIÓN DE DEPENDENCIAS PYTHON (CRÍTICO PARA 500 MB RAM)
# Usamos --no-cache-dir para ahorrar espacio.
# Si falla, es porque una dependencia no puede compilarse con tan poca RAM.
RUN pip install --no-cache-dir -r requirements.txt

# 6. FUERZA LA DESCARGA Y CACHÉ DEL MODELO
ENV REMBG_HOME=/app/.rembg_models
RUN python -c "from rembg import new_session; new_session(model_name='u2net')"

# 7. Copiar el resto del código
COPY . .

# 8. Comando de inicio
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"]