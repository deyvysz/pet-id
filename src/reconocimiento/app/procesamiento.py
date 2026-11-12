"""Flujo de /embed: calidad -> detección -> recortes -> vectores.
Lo usan main.py, cola.py y eval/evaluar.py."""
from typing import Optional

from PIL import Image, ImageOps

from . import calidad
from .contratos import EmbedSalida, Vectores
from .detector import Caja, Detector
from .vectores import Extractor

LADO_MAX = 1600  # se reduce antes de detectar; más resolución no mejora y cuesta tiempo
MARGEN = 0.1  # margen alrededor de cada caja al recortar
# Tipos donde se acepta el rostro aproximado (parte superior del cuerpo). En 'cuerpo',
# 'marcas' y 'hallazgo' el animal puede estar de lado y la parte superior no sería la cara;
# un vector de rostro malo pesa 60 % en la búsqueda, así que mejor no tenerlo.
TIPOS_ROSTRO_APROX = {"frente", "perfil_izq", "perfil_der"}


def preparar(imagen: Image.Image) -> Image.Image:
    """Corrige la orientación EXIF, pasa a RGB y limita el lado mayor."""
    imagen = ImageOps.exif_transpose(imagen).convert("RGB")
    if max(imagen.size) > LADO_MAX:
        imagen.thumbnail((LADO_MAX, LADO_MAX), Image.BILINEAR)
    return imagen


def recortar(imagen: Image.Image, caja: Caja, margen: float = MARGEN) -> Image.Image:
    x0, y0, x1, y1 = caja
    mx, my = (x1 - x0) * margen, (y1 - y0) * margen
    c = (max(0, int(x0 - mx)), max(0, int(y0 - my)), min(imagen.width, int(x1 + mx)), min(imagen.height, int(y1 + my)))
    if c[2] - c[0] < 2 or c[3] - c[1] < 2:
        return imagen
    return imagen.crop(c)


def procesar(
    imagen: Image.Image,
    foto_id: str,
    tipo: str,
    detector: Detector,
    extractor: Extractor,
    aplicar_calidad: bool = True,
) -> EmbedSalida:
    imagen = preparar(imagen)

    def rechazo(motivo: str, cal: Optional[float], especie: Optional[str] = None) -> EmbedSalida:
        return EmbedSalida(foto_id=foto_id, detectado=False, motivo=motivo, especie=especie, calidad=cal)

    # 1) tamaño y brillo sobre la imagen completa, antes de detectar
    previa = calidad.evaluar(imagen, revisar_nitidez=False)
    if aplicar_calidad and not previa.aceptada:
        return rechazo(previa.motivo, previa.calidad)

    # 2) detección
    det = detector.detectar(imagen)
    if det.conteo == 0:
        if tipo == "marcas":
            # primer plano de manchas: el detector suele no ver un animal; se usa la imagen entera como cuerpo
            caja_cuerpo, caja_rostro = (0.0, 0.0, float(imagen.width), float(imagen.height)), None
        else:
            # si la foto completa está borrosa, ese es el motivo más útil para el usuario
            motivo = "borrosa" if aplicar_calidad and previa.nitidez < calidad.NITIDEZ_MIN else "sin_mascota"
            return rechazo(motivo, previa.calidad)
    elif det.conteo > 1:
        return rechazo("varias_mascotas", previa.calidad, det.especie)
    else:
        caja_cuerpo = det.caja_cuerpo
        usar_rostro = det.caja_rostro is not None and (not det.rostro_aproximado or tipo in TIPOS_ROSTRO_APROX)
        caja_rostro = det.caja_rostro if usar_rostro else None

    # 3) nitidez sobre el recorte de la mascota (un fondo desenfocado no es problema)
    cuerpo = recortar(imagen, caja_cuerpo)
    cal = calidad.evaluar(imagen, recorte=cuerpo)
    if aplicar_calidad and not cal.aceptada:
        return rechazo(cal.motivo, cal.calidad, det.especie)

    # 4) vectores en un solo lote
    recortes = [cuerpo] + ([recortar(imagen, caja_rostro)] if caja_rostro else [])
    m = extractor.extraer(recortes)
    vectores = Vectores(cuerpo=m[0].tolist(), rostro=m[1].tolist() if caja_rostro else None)
    return EmbedSalida(foto_id=foto_id, detectado=True, especie=det.especie, calidad=cal.calidad, vectores=vectores)
