"""Descarga de la imagen desde la URL firmada de Storage."""
import io
import os
from urllib.parse import urlparse

import httpx
from PIL import Image, UnidentifiedImageError

MAX_BYTES = int(os.getenv("DESCARGA_MAX_BYTES", str(15 * 1024 * 1024)))
TIMEOUT = float(os.getenv("DESCARGA_TIMEOUT", "15"))
# Hosts permitidos separados por coma (ej. el dominio del proyecto Supabase). Vacío: cualquiera.
HOSTS_PERMITIDOS = {h.strip() for h in os.getenv("URL_HOSTS_PERMITIDOS", "").split(",") if h.strip()}


class ErrorDescarga(Exception):
    pass


def descargar_imagen(url: str) -> Image.Image:
    p = urlparse(url)
    if p.scheme not in ("http", "https"):
        raise ErrorDescarga("la URL debe ser http o https")
    if HOSTS_PERMITIDOS and p.hostname not in HOSTS_PERMITIDOS:
        raise ErrorDescarga(f"host no permitido: {p.hostname}")
    try:
        with httpx.stream("GET", url, timeout=TIMEOUT, follow_redirects=False) as r:
            if r.status_code != 200:
                raise ErrorDescarga(f"la descarga respondió {r.status_code}")
            datos = bytearray()
            for trozo in r.iter_bytes():
                datos.extend(trozo)
                if len(datos) > MAX_BYTES:
                    raise ErrorDescarga("la imagen supera el tamaño máximo")
    except httpx.HTTPError as e:
        raise ErrorDescarga(f"no se pudo descargar: {e}") from e
    try:
        imagen = Image.open(io.BytesIO(bytes(datos)))
        imagen.load()
    except (UnidentifiedImageError, OSError) as e:
        raise ErrorDescarga("el archivo no es una imagen válida") from e
    return imagen
