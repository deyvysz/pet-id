"""Worker de la cola con una conexión falsa que registra el SQL (no hay Postgres en las pruebas)."""
from contextlib import contextmanager

from app import cola
from app.detector import FalsaDetector
from app.vectores import ExtractorFalso
from tests.conftest import ROJO, imagen_nitida


class _Res:
    def __init__(self, fila):
        self.fila = fila

    def fetchone(self):
        return self.fila


class ConexionFalsa:
    def __init__(self, mensaje, foto=("m1", "perro", None)):
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


def correr(conn, imagen):
    return cola.procesar_mensaje(conn, FalsaDetector(), ExtractorFalso(), cargador=lambda url: imagen)


def test_cola_vacia():
    assert correr(ConexionFalsa(None), None) is False


def test_foto_detectada_guarda_vectores():
    conn = ConexionFalsa((7, 1, {"foto_id": "f1", "url_firmada": "https://s/f1.jpg", "tipo": "frente"}))
    assert correr(conn, imagen_nitida())
    inserts = conn.hubo("insert into vectores_foto")
    assert sorted(p[2] for p in inserts) == ["cuerpo", "rostro"]
    assert all(p[1] == "m1" and p[3] == "perro" and p[4].startswith("[") for p in inserts)
    assert conn.hubo("estado = 'lista'")
    assert conn.hubo("lista_para_busqueda")
    assert conn.hubo("pgmq.delete") == [(cola.COLA, 7)]


def test_foto_rechazada():
    conn = ConexionFalsa((8, 1, {"foto_id": "f2", "url_firmada": "https://s/f2.jpg", "tipo": "frente"}))
    correr(conn, imagen_nitida(marca=ROJO))
    assert not conn.hubo("insert into vectores_foto")
    assert conn.hubo("estado = 'rechazada'")[0][0] == "sin_mascota"
    assert conn.hubo("pgmq.delete")


def test_error_reintenta_y_luego_archiva():
    def falla(url):
        raise RuntimeError("caída")

    msg = {"foto_id": "f3", "url_firmada": "https://s/f3.jpg", "tipo": "frente"}
    conn = ConexionFalsa((9, 1, msg))
    cola.procesar_mensaje(conn, FalsaDetector(), ExtractorFalso(), cargador=falla)
    assert not conn.hubo("pgmq.delete") and not conn.hubo("pgmq.archive")

    conn = ConexionFalsa((9, cola.MAX_INTENTOS, msg))
    cola.procesar_mensaje(conn, FalsaDetector(), ExtractorFalso(), cargador=falla)
    assert conn.hubo("pgmq.archive")
