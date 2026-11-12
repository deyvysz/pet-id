from typing import get_args

import numpy as np
import pytest

from app.contratos import DIM, EmbedSalida, MotivoRechazo
from app.detector import Deteccion, armar_resultado
from tests.conftest import AMARILLO, AZUL, ROJO, VERDE, imagen_borrosa, imagen_nitida, imagen_oscura


def embed(cliente, imagenes, imagen, tipo="frente", foto_id="f1"):
    url = f"https://storage.test/{foto_id}.jpg"
    imagenes[url] = imagen
    r = cliente.post("/embed", json={"foto_id": foto_id, "url": url, "tipo": tipo})
    assert r.status_code == 200, r.text
    return EmbedSalida.model_validate(r.json()), r.json()


def test_health(cliente):
    r = cliente.get("/health")
    assert r.status_code == 200 and r.json()["estado"] == "ok"


def test_detectado_con_rostro(cliente, imagenes):
    s, crudo = embed(cliente, imagenes, imagen_nitida())
    assert s.detectado and s.motivo is None and s.especie == "perro"
    assert len(s.vectores.cuerpo) == DIM and len(s.vectores.rostro) == DIM
    assert np.isclose(np.linalg.norm(s.vectores.cuerpo), 1, atol=1e-4)
    assert s.vectores.rostro != s.vectores.cuerpo
    assert 0 <= s.calidad <= 1
    assert set(crudo) == {"foto_id", "detectado", "motivo", "especie", "calidad", "vectores"}


def test_determinista(cliente, imagenes):
    a, _ = embed(cliente, imagenes, imagen_nitida(semilla=3), foto_id="a")
    b, _ = embed(cliente, imagenes, imagen_nitida(semilla=3), foto_id="b")
    c, _ = embed(cliente, imagenes, imagen_nitida(semilla=4), foto_id="c")
    assert a.vectores == b.vectores
    assert a.vectores.cuerpo != c.vectores.cuerpo


def test_gato(cliente, imagenes):
    s, _ = embed(cliente, imagenes, imagen_nitida(marca=VERDE))
    assert s.detectado and s.especie == "gato"


@pytest.mark.parametrize("imagen,motivo", [
    (imagen_nitida(marca=ROJO), "sin_mascota"),
    (imagen_nitida(marca=AZUL), "varias_mascotas"),
    (imagen_oscura(), "oscura"),
    (imagen_borrosa(), "borrosa"),
])
def test_rechazos(cliente, imagenes, imagen, motivo):
    s, _ = embed(cliente, imagenes, imagen)
    assert not s.detectado
    assert s.motivo == motivo
    assert s.vectores is None


# 'pequena' entra a MotivoRechazo en contratos.py por main (lo cambia el coordinador)
@pytest.mark.skipif("pequena" not in get_args(MotivoRechazo), reason="contratos.py aún sin el motivo 'pequena'")
def test_rechazo_pequena(cliente, imagenes):
    s, _ = embed(cliente, imagenes, imagen_nitida(lado=300))
    assert not s.detectado and s.motivo == "pequena" and s.vectores is None


def test_rostro_aproximado_solo_en_tipos_de_cara(cliente, imagenes):
    img = imagen_nitida(marca=AMARILLO)
    s, _ = embed(cliente, imagenes, img, tipo="frente", foto_id="x1")
    assert s.vectores.rostro is not None
    for tipo in ("hallazgo", "cuerpo"):
        s, _ = embed(cliente, imagenes, img, tipo=tipo, foto_id=f"x-{tipo}")
        assert s.detectado and s.vectores.rostro is None


def test_marcas_sin_deteccion_usa_imagen_entera(cliente, imagenes):
    s, _ = embed(cliente, imagenes, imagen_nitida(marca=ROJO), tipo="marcas")
    assert s.detectado and s.vectores.rostro is None and len(s.vectores.cuerpo) == DIM


def test_descarga_fallida_422(cliente):
    r = cliente.post("/embed", json={"foto_id": "f", "url": "https://storage.test/no.jpg", "tipo": "frente"})
    assert r.status_code == 422


def test_entrada_invalida_422(cliente):
    r = cliente.post("/embed", json={"foto_id": "f", "url": "https://x/y.jpg", "tipo": "selfie"})
    assert r.status_code == 422


def test_url_no_http():
    from app.descarga import ErrorDescarga, descargar_imagen
    with pytest.raises(ErrorDescarga):
        descargar_imagen("file:///etc/passwd")


# ---- lógica del detector real sin modelo ----

def test_armar_resultado_cabeza_dentro_del_cuerpo_no_cuenta():
    dets = [
        Deteccion((100, 100, 500, 500), 0.6, "perro"),
        Deteccion((150, 110, 300, 250), 0.7, "perro"),  # la cabeza marcada como perro
        Deteccion((160, 120, 290, 240), 0.4, "rostro_perro"),
    ]
    r = armar_resultado(dets, 600, 600)
    assert r.conteo == 1 and r.especie == "perro"
    assert r.caja_cuerpo == (100, 100, 500, 500)
    assert r.caja_rostro == (160, 120, 290, 240) and not r.rostro_aproximado


def test_armar_resultado_dos_mascotas_y_nms():
    dets = [
        Deteccion((0, 100, 280, 500), 0.5, "perro"),
        Deteccion((5, 105, 285, 505), 0.3, "gato"),  # misma caja, otra etiqueta: NMS
        Deteccion((320, 100, 600, 500), 0.4, "gato"),
    ]
    r = armar_resultado(dets, 600, 600)
    assert r.conteo == 2 and r.especie == "perro" and r.rostro_aproximado


def test_armar_resultado_mascota_lejana_no_cuenta_y_vacio():
    dets = [Deteccion((0, 0, 500, 500), 0.5, "gato"), Deteccion((520, 520, 600, 600), 0.5, "perro")]
    assert armar_resultado(dets, 600, 600).conteo == 1
    assert armar_resultado([Deteccion((0, 0, 50, 50), 0.05, "perro")], 600, 600).conteo == 0
