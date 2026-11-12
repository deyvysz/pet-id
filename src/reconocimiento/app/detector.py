"""Detección de la mascota: caja del cuerpo, caja del rostro, especie y conteo.

Implementación real: OWL-ViT (google/owlvit-base-patch32, Apache 2.0) con consultas de
texto para perro, gato y sus rostros. No se usa Ultralytics YOLO (AGPL) ni MegaDescriptor
(CC BY-NC); ver docs/decisiones/003-licencias-modelos.md.
transformers y torch se importan solo al crear el detector real, para que las pruebas
corran sin ellos.
"""
import os
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Optional

import numpy as np
from PIL import Image

Caja = tuple[float, float, float, float]  # x0, y0, x1, y1 en píxeles


@dataclass
class ResultadoDeteccion:
    conteo: int
    especie: Optional[str] = None  # 'perro' | 'gato'
    caja_cuerpo: Optional[Caja] = None
    caja_rostro: Optional[Caja] = None
    rostro_aproximado: bool = False  # True si el rostro se dedujo de la parte superior del cuerpo
    cajas: list[Caja] = field(default_factory=list)  # todas las mascotas contadas


@dataclass
class Deteccion:
    caja: Caja
    puntaje: float
    etiqueta: str  # 'perro' | 'gato' | 'rostro_perro' | 'rostro_gato'


class Detector(ABC):
    @abstractmethod
    def detectar(self, imagen: Image.Image) -> ResultadoDeteccion: ...


# ---------- Lógica común (sin torch, se prueba aparte) ----------

def area(c: Caja) -> float:
    return max(0.0, c[2] - c[0]) * max(0.0, c[3] - c[1])


def interseccion(a: Caja, b: Caja) -> float:
    return area((max(a[0], b[0]), max(a[1], b[1]), min(a[2], b[2]), min(a[3], b[3])))


def iou(a: Caja, b: Caja) -> float:
    i = interseccion(a, b)
    u = area(a) + area(b) - i
    return i / u if u > 0 else 0.0


def rostro_aproximado(cuerpo: Caja) -> Caja:
    """Mitad superior del cuerpo, recortando 10 % a cada lado."""
    x0, y0, x1, y1 = cuerpo
    ancho = x1 - x0
    return (x0 + 0.1 * ancho, y0, x1 - 0.1 * ancho, y0 + 0.5 * (y1 - y0))


def armar_resultado(
    detecciones: list[Deteccion],
    ancho: int,
    alto: int,
    umbral_cuerpo: float = 0.15,
    umbral_rostro: float = 0.1,
    area_min: float = 0.02,
    proporcion_secundaria: float = 0.25,
) -> ResultadoDeteccion:
    """Convierte detecciones crudas en el resultado.

    - Cuerpos: NMS sin distinguir especie (OWL-ViT a veces marca el mismo animal como perro y gato).
    - Se descartan cajas menores al 2 % de la imagen y cajas contenidas en otra mayor
      (una cabeza detectada como 'perro' no es una segunda mascota).
    - Conteo: cuerpos con área >= 25 % de la principal; un animal lejano y chico no cuenta.
    - Rostro: el de mayor puntaje cuyo centro cae dentro del cuerpo principal; si no hay,
      se aproxima con la parte superior del cuerpo.
    """
    total = float(ancho * alto)
    cuerpos = [d for d in detecciones if d.etiqueta in ("perro", "gato") and d.puntaje >= umbral_cuerpo
               and area(d.caja) >= area_min * total]
    # 1) NMS por puntaje
    cuerpos.sort(key=lambda d: d.puntaje, reverse=True)
    nms: list[Deteccion] = []
    for d in cuerpos:
        if all(iou(d.caja, e.caja) <= 0.5 for e in nms):
            nms.append(d)
    # 2) de mayor a menor área, se quitan las cajas contenidas en una ya elegida
    nms.sort(key=lambda d: area(d.caja), reverse=True)
    elegidos: list[Deteccion] = []
    for d in nms:
        if all(interseccion(d.caja, e.caja) <= 0.7 * area(d.caja) for e in elegidos):
            elegidos.append(d)
    if not elegidos:
        return ResultadoDeteccion(conteo=0)

    principal = max(elegidos, key=lambda d: d.puntaje)
    contadas = [d for d in elegidos if area(d.caja) >= proporcion_secundaria * area(principal.caja)]

    x0, y0, x1, y1 = principal.caja
    rostros = [
        d for d in detecciones
        if d.etiqueta.startswith("rostro") and d.puntaje >= umbral_rostro
        and x0 <= (d.caja[0] + d.caja[2]) / 2 <= x1 and y0 <= (d.caja[1] + d.caja[3]) / 2 <= y1
    ]
    if rostros:
        caja_rostro, aprox = max(rostros, key=lambda d: d.puntaje).caja, False
    else:
        caja_rostro, aprox = rostro_aproximado(principal.caja), True

    return ResultadoDeteccion(
        conteo=len(contadas),
        especie=principal.etiqueta,
        caja_cuerpo=principal.caja,
        caja_rostro=caja_rostro,
        rostro_aproximado=aprox,
        cajas=[d.caja for d in contadas],
    )


# ---------- Implementación real ----------

class DetectorOwlVit(Detector):
    CONSULTAS = ["a photo of a dog", "a photo of a cat", "a photo of a dog's face", "a photo of a cat's face"]
    ETIQUETAS = ["perro", "gato", "rostro_perro", "rostro_gato"]

    def __init__(self, nombre: Optional[str] = None, umbral_cuerpo: float = 0.15, umbral_rostro: float = 0.1):
        import torch
        from transformers import OwlViTForObjectDetection, OwlViTProcessor

        self.torch = torch
        self.nombre = nombre or os.getenv("MODELO_DETECTOR", "google/owlvit-base-patch32")
        self.dispositivo = "cuda" if torch.cuda.is_available() else "cpu"
        self.procesador = OwlViTProcessor.from_pretrained(self.nombre)
        self.modelo = OwlViTForObjectDetection.from_pretrained(self.nombre).to(self.dispositivo).eval()
        self.umbral_cuerpo = umbral_cuerpo
        self.umbral_rostro = umbral_rostro

    def detectar(self, imagen: Image.Image) -> ResultadoDeteccion:
        torch = self.torch
        entradas = self.procesador(text=[self.CONSULTAS], images=imagen, return_tensors="pt").to(self.dispositivo)
        with torch.inference_mode():
            salidas = self.modelo(**entradas)
        tamanos = torch.tensor([[imagen.height, imagen.width]], device=self.dispositivo)
        umbral = min(self.umbral_cuerpo, self.umbral_rostro)
        # el nombre del método cambió entre versiones de transformers
        post = getattr(self.procesador, "post_process_grounded_object_detection", None) \
            or self.procesador.post_process_object_detection
        res = post(outputs=salidas, threshold=umbral, target_sizes=tamanos)[0]
        detecciones = [
            Deteccion(caja=tuple(float(v) for v in caja), puntaje=float(p), etiqueta=self.ETIQUETAS[int(e)])
            for caja, p, e in zip(res["boxes"].tolist(), res["scores"].tolist(), res["labels"].tolist())
        ]
        return armar_resultado(detecciones, imagen.width, imagen.height, self.umbral_cuerpo, self.umbral_rostro)


# ---------- Implementación falsa para pruebas ----------

# Color promedio de la esquina superior izquierda (8x8 px) -> resultado. Permite armar
# casos de prueba con imágenes sintéticas sin tocar el código del servicio.
MARCAS_FALSAS = {
    (255, 0, 0): "sin_mascota",
    (0, 0, 255): "dos_mascotas",
    (0, 255, 0): "gato",
    (255, 255, 0): "perro_sin_rostro",
}


class FalsaDetector(Detector):
    """Determinista. Con `fijo` siempre devuelve ese resultado; si no, decide por la marca
    de color de la esquina (ver MARCAS_FALSAS). Sin marca: un perro con rostro detectado."""

    def __init__(self, fijo: Optional[ResultadoDeteccion] = None):
        self.fijo = fijo

    @staticmethod
    def marca(imagen: Image.Image) -> Optional[str]:
        prom = np.asarray(imagen.convert("RGB").crop((0, 0, 8, 8)), dtype=np.float32).reshape(-1, 3).mean(axis=0)
        for color, nombre in MARCAS_FALSAS.items():
            if all(abs(prom[i] - color[i]) < 10 for i in range(3)):
                return nombre
        return None

    def detectar(self, imagen: Image.Image) -> ResultadoDeteccion:
        if self.fijo is not None:
            return self.fijo
        w, h = imagen.size
        cuerpo = (0.1 * w, 0.1 * h, 0.9 * w, 0.9 * h)
        rostro = (0.3 * w, 0.1 * h, 0.7 * w, 0.45 * h)
        m = self.marca(imagen)
        if m == "sin_mascota":
            return ResultadoDeteccion(conteo=0)
        if m == "dos_mascotas":
            izq, der = (0.05 * w, 0.2 * h, 0.48 * w, 0.9 * h), (0.52 * w, 0.2 * h, 0.95 * w, 0.9 * h)
            return ResultadoDeteccion(conteo=2, especie="perro", caja_cuerpo=izq, caja_rostro=rostro_aproximado(izq),
                                      rostro_aproximado=True, cajas=[izq, der])
        if m == "perro_sin_rostro":
            return ResultadoDeteccion(conteo=1, especie="perro", caja_cuerpo=cuerpo,
                                      caja_rostro=rostro_aproximado(cuerpo), rostro_aproximado=True, cajas=[cuerpo])
        especie = "gato" if m == "gato" else "perro"
        return ResultadoDeteccion(conteo=1, especie=especie, caja_cuerpo=cuerpo, caja_rostro=rostro, cajas=[cuerpo])


def crear_detector(modelo: Optional[str] = None) -> Detector:
    modelo = modelo or os.getenv("MODELO", "real")
    return FalsaDetector() if modelo == "falso" else DetectorOwlVit()
