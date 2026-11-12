"""Descarga de la imagen desde la URL firmada de Storage."""
import io
import os
from urllib.parse import quote, urlparse

import httpx
from PIL import Image, UnidentifiedImageError

MAX_BYTES = int(os.getenv("DESCARGA_MAX_BYTES", str(15 * 1024 * 1024)))
TIMEOUT = float(os.getenv("DESCARGA_TIMEOUT", "15"))
# Hosts permitidos separados por coma (ej. el dominio del proyecto Supabase). Vacío: cualquiera.
HOSTS_PERMITIDOS = {h.strip() for h in os.getenv("URL_HOSTS_PERMITIDOS", "").split(",") if h.strip()}


class ErrorDescarga(Exception):
    pass


def descargar_imagen(url: str) -> Image.Image:
    """Descarga desde una URL (firmada) que llega por /embed."""
    p = urlparse(url)
    if p.scheme not in ("http", "https"):
        raise ErrorDescarga("la URL debe ser http o https")
    if HOSTS_PERMITIDOS and p.hostname not in HOSTS_PERMITIDOS:
        raise ErrorDescarga(f"host no permitido: {p.hostname}")
    return _bajar(url, {})


def descargar_de_storage(ruta_storage: str, bucket: str = "fotos") -> Image.Image:
    """Lee el objeto directo de Supabase Storage con la clave de servicio (lo usa el worker;
    decisión 007: el mensaje de la cola trae ruta_storage, no URL firmada)."""
    base = os.getenv("SUPABASE_URL", "").rstrip("/")
    clave = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
    if not base or not clave:
        raise ErrorDescarga("faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY")
    ruta = ruta_storage.strip("/")
    if not ruta or ".." in ruta.split("/"):
        raise ErrorDescarga(f"ruta_storage inválida: {ruta_storage!r}")
    url = f"{base}/storage/v1/object/authenticated/{bucket}/{quote(ruta, safe='/')}"
    return _bajar(url, {"Authorization": f"Bearer {clave}", "apikey": clave})


def _bajar(url: str, cabeceras: dict[str, str]) -> Image.Image:
    try:
        with httpx.stream("GET", url, headers=cabeceras, timeout=TIMEOUT, follow_redirects=False) as r:
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
