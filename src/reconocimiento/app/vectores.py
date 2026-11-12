"""Extracción de vectores de 768 dimensiones.

Real: DINOv2 ViT-B/14 (facebook/dinov2-base, Apache 2.0). Se usa el token CLS
(pooler_output, ya normalizado por LayerNorm) y se normaliza L2.
Falso: hash de los píxeles -> vector aleatorio normalizado. Misma imagen, mismo vector.
"""
import hashlib
import os
from abc import ABC, abstractmethod
from typing import Optional

import numpy as np
from PIL import Image

from .contratos import DIM


def normalizar_l2(m: np.ndarray) -> np.ndarray:
    normas = np.linalg.norm(m, axis=-1, keepdims=True)
    return m / np.maximum(normas, 1e-12)


def cuadrar(imagen: Image.Image) -> Image.Image:
    """Rellena a cuadrado con el color medio. El procesador de DINOv2 recorta al centro;
    sin esto, un cuerpo alargado (perro de perfil) perdería la cabeza o la cola."""
    w, h = imagen.size
    if w == h:
        return imagen
    lado = max(w, h)
    color = tuple(int(c) for c in np.asarray(imagen.convert("RGB")).reshape(-1, 3).mean(axis=0))
    lienzo = Image.new("RGB", (lado, lado), color)
    lienzo.paste(imagen.convert("RGB"), ((lado - w) // 2, (lado - h) // 2))
    return lienzo


class Extractor(ABC):
    dim = DIM

    @abstractmethod
    def extraer(self, imagenes: list[Image.Image]) -> np.ndarray:
        """Devuelve una matriz (n, 768) con filas de norma 1."""


class ExtractorDinov2(Extractor):
    def __init__(self, nombre: Optional[str] = None):
        import torch
        from transformers import AutoImageProcessor, AutoModel

        self.torch = torch
        self.nombre = nombre or os.getenv("MODELO_VECTORES", "facebook/dinov2-base")
        self.dispositivo = "cuda" if torch.cuda.is_available() else "cpu"
        self.procesador = AutoImageProcessor.from_pretrained(self.nombre)
        self.modelo = AutoModel.from_pretrained(self.nombre).to(self.dispositivo).eval()
        if self.modelo.config.hidden_size != DIM:
            raise ValueError(f"{self.nombre} da {self.modelo.config.hidden_size} dimensiones; el esquema espera {DIM}")

    def extraer(self, imagenes: list[Image.Image]) -> np.ndarray:
        if not imagenes:
            return np.zeros((0, DIM), dtype=np.float32)
        entradas = self.procesador(images=[cuadrar(i) for i in imagenes], return_tensors="pt").to(self.dispositivo)
        with self.torch.inference_mode():
            salidas = self.modelo(**entradas)
        cls = salidas.pooler_output.float().cpu().numpy()
        return normalizar_l2(cls).astype(np.float32)


class ExtractorFalso(Extractor):
    def extraer(self, imagenes: list[Image.Image]) -> np.ndarray:
        filas = []
        for imagen in imagenes:
            rgb = imagen.convert("RGB")
            h = hashlib.sha256(f"{rgb.size}".encode() + rgb.tobytes()).digest()
            rng = np.random.default_rng(int.from_bytes(h[:8], "little"))
            filas.append(rng.standard_normal(DIM))
        if not filas:
            return np.zeros((0, DIM), dtype=np.float32)
        return normalizar_l2(np.stack(filas)).astype(np.float32)


def crear_extractor(modelo: Optional[str] = None) -> Extractor:
    modelo = modelo or os.getenv("MODELO", "real")
    return ExtractorFalso() if modelo == "falso" else ExtractorDinov2()
