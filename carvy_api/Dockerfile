# 1. Imagen base para Python 3.11 (estable y compatible)
FROM python:3.11-slim

# 2. Establecer el directorio de trabajo
WORKDIR /app

# 3. Copiar requirements.txt e instalar dependencias primero
# Esto permite que Docker cachee esta capa si los requirements.txt no cambian
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 4. **FUERZA LA DESCARGA DEL MODELO DURANTE EL BUILD**
# Creamos la variable de entorno para que el modelo se guarde en /app
ENV REMBG_HOME=/app/.rembg_models
# Ejecutamos el comando para descargar el modelo de 176MB.
# Esto se hace AHORA y no durante el inicio (Run), resolviendo el timeout.
RUN python -c "from rembg import new_session; new_session(model_name='u2net')"

# 5. Copiar el resto del código
COPY . .

# 6. Definir el puerto de la aplicación (Railway lo detecta automáticamente, pero es bueno definirlo)
ENV PORT 8080

# 7. Comando de inicio de la aplicación
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"]