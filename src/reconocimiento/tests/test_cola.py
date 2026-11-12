"""Worker de la cola con una conexión falsa que registra el SQL (no hay Postgres en las pruebas)."""
from contextlib import contextmanager

import pytest

from app import cola, descarga
from app.detector import FalsaDetector
from app.vectores import ExtractorFalso
from tests.conftest import ROJO, imagen_nitida


class _Res:
    def __init__(self, fila):
        self.fila = fila

    def fetchone(self):
        return self.fila


class ConexionFalsa:
    def __init__(self, mensaje, foto=("m1", "perro")):
        self.mensaje, self.foto, self.sql = mensaje, foto, []

    def execute(self, sql, params=()):
        self.sql.append((sql, params))
        if "pgmq.read" in sql:
            m, self.mensaje = self.mensaje, None
            return _Res(m)
        if "from fotos f" in sql:
            return _Res(self.foto)
        return _Res(None)

    @contextmanager
    def transaction(self):
        yield

    def hubo(self, texto):
        return [p for s, p in self.sql if texto in s]


def mensaje(foto_id, tipo="frente"):
    # formato de la decisión 007
    return {"foto_id": foto_id, "mascota_id": "m1", "tipo": tipo, "ruta_storage": f"m1/{foto_id}.jpg"}


def correr(conn, imagen, rutas=None):
    def cargador(ruta):
        if rutas is not None:
            rutas.append(ruta)
        return imagen
    return cola.procesar_mensaje(conn, FalsaDetector(), ExtractorFalso(), cargador=cargador)


def test_cola_vacia():
    assert correr(ConexionFalsa(None), None) is False


def test_foto_detectada_guarda_vectores():
    conn, rutas = ConexionFalsa((7, 1, mensaje("f1"))), []
    assert correr(conn, imagen_nitida(), rutas)
    assert rutas == ["m1/f1.jpg"]
    inserts = conn.hubo("insert into vectores_foto")
    assert sorted(p[2] for p in inserts) == ["cuerpo", "rostro"]
    assert all(p[1] == "m1" and p[3] == "perro" and p[4].startswith("[") for p in inserts)
    assert conn.hubo("estado = 'lista'")
    assert not conn.hubo("lista_para_busqueda")  # la mantiene el trigger de la migración 0004
    assert conn.hubo("pgmq.delete") == [(cola.COLA, 7)]


def test_foto_rechazada():
    conn = ConexionFalsa((8, 1, mensaje("f2")))
    correr(conn, imagen_nitida(marca=ROJO))
    assert not conn.hubo("insert into vectores_foto")
    assert conn.hubo("estado = 'rechazada'")[0][0] == "sin_mascota"
    assert conn.hubo("pgmq.delete")


def test_mensaje_sin_ruta_se_archiva():
    conn = ConexionFalsa((5, 1, {"foto_id": "f9", "mascota_id": "m1", "tipo": "frente"}))
    correr(conn, imagen_nitida())
    assert conn.hubo("pgmq.archive") and not conn.hubo("insert into vectores_foto")


def test_error_reintenta_y_luego_archiva():
    def falla(ruta):
        raise RuntimeError("caída")

    conn = ConexionFalsa((9, 1, mensaje("f3")))
    cola.procesar_mensaje(conn, FalsaDetector(), ExtractorFalso(), cargador=falla)
    assert not conn.hubo("pgmq.delete") and not conn.hubo("pgmq.archive")

    conn = ConexionFalsa((9, cola.MAX_INTENTOS, mensaje("f3")))
    cola.procesar_mensaje(conn, FalsaDetector(), ExtractorFalso(), cargador=falla)
    assert conn.hubo("pgmq.archive")
    assert conn.hubo("motivo_rechazo = 'error_proceso'")


def test_descarga_de_storage(monkeypatch):
    llamadas = []
    monkeypatch.setenv("SUPABASE_URL", "https://proyecto.supabase.co/")
    monkeypatch.setenv("SUPABASE_SERVICE_ROLE_KEY", "clave")
    monkeypatch.setattr(descarga, "_bajar", lambda url, cab: llamadas.append((url, cab)) or "img")
    assert descarga.descargar_de_storage("m1/foto 1.jpg") == "img"
    url, cab = llamadas[0]
    assert url == "https://proyecto.supabase.co/storage/v1/object/authenticated/fotos/m1/foto%201.jpg"
    assert cab == {"Authorization": "Bearer clave", "apikey": "clave"}


@pytest.mark.parametrize("ruta", ["", "../secreto", "m1/../../x"])
def test_descarga_de_storage_ruta_invalida(monkeypatch, ruta):
    monkeypatch.setenv("SUPABASE_URL", "https://p.supabase.co")
    monkeypatch.setenv("SUPABASE_SERVICE_ROLE_KEY", "clave")
    with pytest.raises(descarga.ErrorDescarga):
        descarga.descargar_de_storage(ruta)


def test_descarga_de_storage_sin_credenciales(monkeypatch):
    monkeypatch.delenv("SUPABASE_URL", raising=False)
    with pytest.raises(descarga.ErrorDescarga):
        descarga.descargar_de_storage("m1/f.jpg")
