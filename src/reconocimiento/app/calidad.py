"""Chequeo de calidad de la foto: tamaño mínimo, brillo y nitidez.

La nitidez se mide con la varianza del Laplaciano sobre la imagen en gris,
reescalada a un lado menor fijo para que el umbral no dependa de la resolución.
Los umbrales se ajustan por variables de entorno.
"""
import os
from dataclasses import dataclass
from typing import Optional

import numpy as np
from PIL import Image

LADO_MIN = int(os.getenv("CALIDAD_LADO_MIN", "400"))
BRILLO_MIN = float(os.getenv("CALIDAD_BRILLO_MIN", "40"))  # media de luminancia, 0-255
NITIDEZ_MIN = float(os.getenv("CALIDAD_NITIDEZ_MIN", "60"))  # varianza del Laplaciano
LADO_NITIDEZ = 256  # lado menor al que se reescala antes de medir la nitidez


@dataclass
class ResultadoCalidad:
    aceptada: bool
    motivo: Optional[str]  # 'borrosa' | 'oscura' | None
    calidad: float  # 0-1, solo informativo
    brillo: float
    nitidez: float


def a_gris(imagen: Image.Image, lado_menor: Optional[int] = None) -> np.ndarray:
    gris = imagen.convert("L")
    if lado_menor:
        escala = lado_menor / min(gris.size)
        if escala < 1:
            gris = gris.resize((max(1, round(gris.width * escala)), max(1, round(gris.height * escala))), Image.BILINEAR)
    return np.asarray(gris, dtype=np.float32)


def brillo(imagen: Image.Image) -> float:
    return float(a_gris(imagen, LADO_NITIDEZ).mean())


def nitidez(imagen: Image.Image) -> float:
    """Varianza del Laplaciano de 4 vecinos."""
    g = a_gris(imagen, LADO_NITIDEZ)
    if g.shape[0] < 3 or g.shape[1] < 3:
        return 0.0
    lap = g[:-2, 1:-1] + g[2:, 1:-1] + g[1:-1, :-2] + g[1:-1, 2:] - 4 * g[1:-1, 1:-1]
    return float(lap.var())


def puntaje(b: float, n: float) -> float:
    """Combina brillo y nitidez en 0-1. Mitad cada uno."""
    p_brillo = max(0.0, 1.0 - abs(b - 128.0) / 128.0)
    p_nitidez = min(1.0, n / (NITIDEZ_MIN * 5))
    return round(0.5 * p_brillo + 0.5 * p_nitidez, 3)


def evaluar(imagen: Image.Image, recorte: Optional[Image.Image] = None, revisar_nitidez: bool = True) -> ResultadoCalidad:
    """Revisa la imagen completa (tamaño y brillo) y la nitidez del recorte de la mascota
    si se pasa; si no, la de la imagen completa. Con revisar_nitidez=False solo revisa
    tamaño y brillo (se usa antes de detectar, porque un fondo desenfocado no es motivo de rechazo)."""
    b = brillo(imagen)
    n = nitidez(recorte if recorte is not None else imagen)
    cal = puntaje(b, n)
    motivo = None
    if min(imagen.size) < LADO_MIN:
        motivo = "borrosa"  # el contrato no tiene motivo 'pequeña'; una foto chica se trata como borrosa
    elif b < BRILLO_MIN:
        motivo = "oscura"
    elif revisar_nitidez and n < NITIDEZ_MIN:
        motivo = "borrosa"
    return ResultadoCalidad(aceptada=motivo is None, motivo=motivo, calidad=cal, brillo=round(b, 2), nitidez=round(n, 2))
