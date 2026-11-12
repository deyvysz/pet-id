"""Utilidades comunes: imágenes sintéticas y cliente con modelos falsos."""
import numpy as np
import pytest
from fastapi.testclient import TestClient
from PIL import Image

from app.detector import FalsaDetector
from app.indice import IndiceMemoria
from app.main import crear_app
from app.vectores import ExtractorFalso

ROJO, AZUL, VERDE, AMARILLO = (255, 0, 0), (0, 0, 255), (0, 255, 0), (255, 255, 0)


def imagen_nitida(lado=600, alto=None, semilla=0, marca=None, nivel=(30, 225)) -> Image.Image:
    """Bloques aleatorios de 8 px: bordes marcados, brillo medio."""
    alto = alto or lado
    rng = np.random.default_rng(semilla)
    bloques = rng.integers(nivel[0], nivel[1], size=(alto // 8 + 1, lado // 8 + 1, 3), dtype=np.uint8)
    arr = np.kron(bloques, np.ones((8, 8, 1), dtype=np.uint8))[:alto, :lado]
    if marca is not None:
        arr[:8, :8] = marca
    return Image.fromarray(np.ascontiguousarray(arr))


def imagen_borrosa(lado=600) -> Image.Image:
    """Degradado suave: casi sin bordes."""
    x = np.linspace(60, 200, lado, dtype=np.float32)
    arr = np.repeat(np.tile(x, (lado, 1))[:, :, None], 3, axis=2).astype(np.uint8)
    return Image.fromarray(arr)


def imagen_oscura(lado=600) -> Image.Image:
    return imagen_nitida(lado, nivel=(0, 25))


def vector(semilla: int) -> list[float]:
    v = np.random.default_rng(semilla).standard_normal(768)
    return (v / np.linalg.norm(v)).tolist()


@pytest.fixture
def imagenes() -> dict[str, Image.Image]:
    """URL ficticia -> imagen. El cargador del cliente lee de aquí."""
    return {}


@pytest.fixture
def indice() -> IndiceMemoria:
    return IndiceMemoria()


@pytest.fixture
def cliente(imagenes, indice):
    from app.descarga import ErrorDescarga

    def cargador(url):
        if url not in imagenes:
            raise ErrorDescarga("no encontrada")
        return imagenes[url]

    app = crear_app(detector=FalsaDetector(), extractor=ExtractorFalso(), indice=indice, cargador=cargador)
    with TestClient(app) as c:
        yield c
