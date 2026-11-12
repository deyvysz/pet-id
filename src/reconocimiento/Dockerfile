FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    HF_HOME=/modelos \
    MODELO=real \
    MODELO_VECTORES=facebook/dinov2-base \
    MODELO_DETECTOR=google/owlvit-base-patch32

WORKDIR /srv

# torch CPU primero, desde el índice de PyTorch (la rueda de PyPI trae CUDA y pesa varios GB)
RUN pip install --no-cache-dir torch==2.8.0 --index-url https://download.pytorch.org/whl/cpu
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Pesos descargados en el build: el contenedor arranca sin salir a Hugging Face
RUN python -c "\
from transformers import AutoImageProcessor, AutoModel, OwlViTForObjectDetection, OwlViTProcessor; \
AutoImageProcessor.from_pretrained('$MODELO_VECTORES'); AutoModel.from_pretrained('$MODELO_VECTORES'); \
OwlViTProcessor.from_pretrained('$MODELO_DETECTOR'); OwlViTForObjectDetection.from_pretrained('$MODELO_DETECTOR')"
ENV HF_HUB_OFFLINE=1

COPY app ./app
COPY eval ./eval

RUN useradd --system --uid 10001 servicio && chown -R servicio /srv /modelos
USER servicio

EXPOSE 8000
# API: valor por defecto. Worker de la cola: docker run ... python -m app.cola
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]
