# 1. Nueva Imagen Base (más completa que 'slim')
FROM python:3.11

# 2. Instalar Dependencias del Sistema Operativo
# Estas son necesarias para librerías como OpenCV
RUN apt-get update && apt-get install -y \
    build-essential \
    libgl1 \
    libsm6 \
    libxext6 \
    libatlas-base-dev \
    && rm -rf /var/lib/apt/lists/*

# 3. Establecer el directorio de trabajo
WORKDIR /app

# 4. Copiar requirements.txt e instalar dependencias Python
# Usamos --default-timeout para evitar que pip falle por tiempos de espera de red largos
# Además, evitamos recompilar Pillow (una dependencia común y pesada)
COPY requirements.txt .
RUN pip install --default-timeout=1000 --no-cache-dir -r requirements.txt

# 5. FUERZA LA DESCARGA Y CACHÉ DEL MODELO
ENV REMBG_HOME=/app/.rembg_models
RUN python -c "from rembg import new_session; new_session(model_name='u2net')"

# 6. Copiar el resto del código
COPY . .

# 7. Comando de inicio
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"]