"""Worker de la cola pgmq 'fotos_por_procesar'.

Mensaje: {"foto_id": "...", "url_firmada": "...", "tipo": "frente"}
Por cada mensaje: descarga, procesa (mismo flujo que /embed), guarda en vectores_foto,
actualiza fotos.estado / motivo_rechazo / calidad y recalcula mascotas.lista_para_busqueda.

Uso: DATABASE_URL=... MODELO=real python -m app.cola
"""
import logging
import os
import time
from typing import Callable

from PIL import Image

from .contratos import EmbedSalida
from .descarga import ErrorDescarga, descargar_imagen
from .detector import Detector, crear_detector
from .indice import a_texto_vector
from .procesamiento import procesar
from .vectores import Extractor, crear_extractor

COLA = os.getenv("COLA", "fotos_por_procesar")
VISIBILIDAD = int(os.getenv("COLA_VISIBILIDAD_S", "120"))  # segundos que el mensaje queda oculto mientras se procesa
ESPERA = float(os.getenv("COLA_ESPERA_S", "2"))  # pausa cuando la cola está vacía
MAX_INTENTOS = int(os.getenv("COLA_MAX_INTENTOS", "5"))

log = logging.getLogger("pet_id.cola")


def leer_mensaje(conn):
    """Devuelve (msg_id, read_ct, mensaje) o None."""
    return conn.execute("select msg_id, read_ct, message from pgmq.read(%s, %s, 1)", (COLA, VISIBILIDAD)).fetchone()


def guardar_resultado(conn, msg_id: int, res: EmbedSalida) -> None:
    """Escribe el resultado y borra el mensaje en una sola transacción."""
    with conn.transaction():
        fila = conn.execute(
            "select f.mascota_id, m.especie::text, h.especie::text from fotos f "
            "left join mascotas m on m.id = f.mascota_id left join hallazgos h on h.id = f.hallazgo_id "
            "where f.id = %s",
            (res.foto_id,),
        ).fetchone()
        if fila is None:
            log.warning("foto %s no existe; se descarta el mensaje %s", res.foto_id, msg_id)
            conn.execute("select pgmq.delete(%s, %s::bigint)", (COLA, msg_id))
            return
        mascota_id, especie_mascota, especie_hallazgo = fila

        # la especie declarada manda; la detectada es respaldo
        especie = especie_mascota or especie_hallazgo or res.especie
        if res.detectado and especie:
            conn.execute("delete from vectores_foto where foto_id = %s", (res.foto_id,))
            pares = [("cuerpo", res.vectores.cuerpo)]
            if res.vectores.rostro is not None:
                pares.append(("rostro", res.vectores.rostro))
            for tipo, v in pares:
                conn.execute(
                    "insert into vectores_foto (foto_id, mascota_id, tipo, especie, vector) "
                    "values (%s, %s, %s::tipo_vector, %s::especie, %s::vector)",
                    (res.foto_id, mascota_id, tipo, especie, a_texto_vector(v)),
                )
            conn.execute(
                "update fotos set estado = 'lista', motivo_rechazo = null, calidad = %s where id = %s",
                (res.calidad, res.foto_id),
            )
        else:
            motivo = res.motivo or "sin_mascota"
            conn.execute("delete from vectores_foto where foto_id = %s", (res.foto_id,))
            conn.execute(
                "update fotos set estado = 'rechazada', motivo_rechazo = %s, calidad = %s where id = %s",
                (motivo, res.calidad, res.foto_id),
            )

        if mascota_id is not None:
            conn.execute(
                "update mascotas set lista_para_busqueda = ("
                " exists(select 1 from vectores_foto where mascota_id = %s and tipo = 'rostro') and"
                " exists(select 1 from vectores_foto where mascota_id = %s and tipo = 'cuerpo')"
                "), actualizado_at = now() where id = %s",
                (mascota_id, mascota_id, mascota_id),
            )
        conn.execute("select pgmq.delete(%s, %s::bigint)", (COLA, msg_id))


def marcar_fallida(conn, msg_id: int, foto_id: str) -> None:
    """Tras MAX_INTENTOS se archiva el mensaje y la foto queda rechazada sin motivo del contrato."""
    with conn.transaction():
        conn.execute("update fotos set estado = 'rechazada', motivo_rechazo = null where id = %s", (foto_id,))
        conn.execute("select pgmq.archive(%s, %s::bigint)", (COLA, msg_id))


def procesar_mensaje(conn, detector: Detector, extractor: Extractor,
                     cargador: Callable[[str], Image.Image] = descargar_imagen) -> bool:
    """Procesa un mensaje. Devuelve False si la cola estaba vacía."""
    fila = leer_mensaje(conn)
    if fila is None:
        return False
    msg_id, intentos, msg = fila
    foto_id = msg.get("foto_id")
    if not foto_id:
        log.error("mensaje %s sin foto_id; se archiva", msg_id)
        conn.execute("select pgmq.archive(%s, %s::bigint)", (COLA, msg_id))
        return True
    try:
        conn.execute("update fotos set estado = 'procesando' where id = %s", (foto_id,))
        imagen = cargador(msg["url_firmada"])
        res = procesar(imagen, foto_id, msg.get("tipo", "hallazgo"), detector, extractor)
        guardar_resultado(conn, msg_id, res)
        log.info("foto %s: detectado=%s motivo=%s", foto_id, res.detectado, res.motivo)
    except Exception as e:  # el mensaje vuelve a la cola cuando vence la visibilidad
        nivel = logging.WARNING if isinstance(e, ErrorDescarga) else logging.ERROR
        log.log(nivel, "foto %s intento %s: %s", foto_id, intentos, e, exc_info=nivel == logging.ERROR)
        if intentos >= MAX_INTENTOS:
            marcar_fallida(conn, msg_id, foto_id)
    return True


def ejecutar() -> None:
    import psycopg

    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    dsn = os.environ["DATABASE_URL"]
    detector, extractor = crear_detector(), crear_extractor()
    log.info("worker listo: cola=%s detector=%s extractor=%s", COLA, type(detector).__name__, type(extractor).__name__)
    while True:
        try:
            with psycopg.connect(dsn, autocommit=True) as conn:
                while True:
                    if not procesar_mensaje(conn, detector, extractor):
                        time.sleep(ESPERA)
        except psycopg.OperationalError as e:
            log.error("conexión perdida: %s; reintento en 5 s", e)
            time.sleep(5)


if __name__ == "__main__":
    ejecutar()
