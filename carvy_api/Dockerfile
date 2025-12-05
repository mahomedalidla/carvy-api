# 1. Imagen base para Python 3.11
FROM python:3.11-slim

# INSTALAR DEPENDENCIAS DEL SISTEMA OPERATIVO (CRÍTICO para rembg/OpenCV)
# build-essential permite compilar cosas. libgl1, libsm6, etc., son requeridas por librerías de imagen.
RUN apt-get update && apt-get install -y \
    build-essential \
    libgl1 \
    libsm6 \
    libxext6 \
    && rm -rf /var/lib/apt/lists/*

# 2. Establecer el directorio de trabajo
WORKDIR /app

# 3. Copiar requirements.txt e instalar dependencias Python
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 4. FUERZA LA DESCARGA Y CACHÉ DEL MODELO
# Esto garantiza que el modelo (176MB) se descargue UNA VEZ durante el build y no durante la ejecución.
ENV REMBG_HOME=/app/.rembg_models
RUN python -c "from rembg import new_session; new_session(model_name='u2net')"

# 5. Copiar el resto del código
COPY . .

# 6. Comando de inicio de la aplicación (usando 8080 como puerto predeterminado en Docker)
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"]