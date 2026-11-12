"""Servicio de reconocimiento PET ID (FastAPI). Contratos en app/contratos.py.

Variables de entorno:
  MODELO=real|falso   modelos reales (OWL-ViT + DINOv2) o falsos deterministas
  DATABASE_URL        conexión a Postgres; vacía usa un índice en memoria
"""
import os
from contextlib import asynccontextmanager
from typing import Callable, Optional

from fastapi import FastAPI, HTTPException
from PIL import Image

from .contratos import EmbedEntrada, EmbedSalida, SearchEntrada, SearchSalida
from .descarga import ErrorDescarga, descargar_imagen
from .detector import Detector, crear_detector
from .indice import Indice, IndiceMemoria, IndicePostgres
from .procesamiento import procesar
from .vectores import Extractor, crear_extractor


def crear_indice() -> Indice:
    dsn = os.getenv("DATABASE_URL", "").strip()
    return IndicePostgres(dsn) if dsn else IndiceMemoria()


def crear_app(
    detector: Optional[Detector] = None,
    extractor: Optional[Extractor] = None,
    indice: Optional[Indice] = None,
    cargador: Optional[Callable[[str], Image.Image]] = None,
) -> FastAPI:
    """Lo que no se pase se crea según las variables de entorno al arrancar."""

    @asynccontextmanager
    async def ciclo_vida(app: FastAPI):
        app.state.detector = detector or crear_detector()
        app.state.extractor = extractor or crear_extractor()
        app.state.indice = indice if indice is not None else crear_indice()
        app.state.cargador = cargador or descargar_imagen
        yield

    app = FastAPI(title="PET ID reconocimiento", version="1.0.0", lifespan=ciclo_vida)

    @app.get("/health")
    def health():
        return {
            "estado": "ok",
            "detector": type(app.state.detector).__name__,
            "extractor": type(app.state.extractor).__name__,
            "indice": type(app.state.indice).__name__,
        }

    # def (no async): el trabajo pesado corre en el pool de hilos de FastAPI
    @app.post("/embed", response_model=EmbedSalida, response_model_exclude_none=False)
    def embed(entrada: EmbedEntrada) -> EmbedSalida:
        try:
            imagen = app.state.cargador(entrada.url)
        except ErrorDescarga as e:
            raise HTTPException(status_code=422, detail=str(e))
        return procesar(imagen, entrada.foto_id, entrada.tipo, app.state.detector, app.state.extractor)

    @app.post("/search", response_model=SearchSalida)
    def search(entrada: SearchEntrada) -> SearchSalida:
        return SearchSalida(candidatos=app.state.indice.buscar(entrada))

    return app


app = crear_app()
