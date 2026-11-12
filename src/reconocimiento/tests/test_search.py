import math

import numpy as np
import pytest

from app.contratos import SearchSalida
from app.indice import a_texto_vector, combinar
from tests.conftest import vector


def con_similitud(base: list[float], sim: float, semilla: int) -> list[float]:
    """Vector unitario con coseno exacto `sim` respecto de `base`."""
    b = np.asarray(base)
    r = np.random.default_rng(semilla).standard_normal(768)
    r -= r.dot(b) * b
    r /= np.linalg.norm(r)
    return (sim * b + math.sqrt(1 - sim**2) * r).tolist()


R, C = vector(1), vector(2)  # consulta: rostro y cuerpo


@pytest.fixture
def poblado(indice):
    # A: rostro 0.9, cuerpo 0.5 -> 0.6*0.9 + 0.4*0.5 = 0.74
    indice.agregar_mascota("A", "perro")
    indice.agregar_vector("A", "fa1", "rostro", con_similitud(R, 0.9, 10))
    indice.agregar_vector("A", "fa2", "rostro", con_similitud(R, 0.2, 11))
    indice.agregar_vector("A", "fa3", "cuerpo", con_similitud(C, 0.5, 12))
    # B: rostro 0.5, cuerpo 0.95 -> 0.68
    indice.agregar_mascota("B", "perro")
    indice.agregar_vector("B", "fb1", "rostro", con_similitud(R, 0.5, 20))
    indice.agregar_vector("B", "fb2", "cuerpo", con_similitud(C, 0.95, 21))
    # G: gato idéntico, no debe salir buscando perros
    indice.agregar_mascota("G", "gato")
    indice.agregar_vector("G", "fg1", "rostro", R)
    indice.agregar_vector("G", "fg2", "cuerpo", C)
    # D: perro activo (no extraviado), en otro distrito
    indice.agregar_mascota("D", "perro", estado="activa")
    indice.agregar_vector("D", "fd1", "cuerpo", C)
    # M: extraviada en Miraflores
    indice.agregar_mascota("M", "perro", distrito_perdida="Miraflores")
    indice.agregar_vector("M", "fm1", "cuerpo", con_similitud(C, 0.3, 30))
    return indice


def buscar(cliente, rostro, cuerpo, especie="perro", limite=5, **filtros):
    cuerpo_json = {"vectores": {"rostro": rostro, "cuerpo": cuerpo},
                   "filtros": {"especie": especie, **filtros}, "limite": limite}
    r = cliente.post("/search", json=cuerpo_json)
    assert r.status_code == 200, r.text
    return SearchSalida.model_validate(r.json()), r.json()


def test_puntaje_rostro_y_cuerpo(cliente, poblado):
    s, crudo = buscar(cliente, R, C)
    ids = [c.mascota_id for c in s.candidatos]
    assert ids[:2] == ["A", "B"]
    a, b = s.candidatos[0], s.candidatos[1]
    assert a.puntaje == pytest.approx(0.74, abs=1e-3)
    assert b.puntaje == pytest.approx(0.68, abs=1e-3)
    assert a.foto_id == "fa1"  # la foto de rostro más parecida
    assert "G" not in ids and "D" not in ids
    assert set(crudo) == {"candidatos"}
    assert set(crudo["candidatos"][0]) == {"mascota_id", "puntaje", "foto_id"}


def test_sin_rostro_solo_cuerpo(cliente, poblado):
    s, _ = buscar(cliente, None, C)
    assert [c.mascota_id for c in s.candidatos][:2] == ["B", "A"]
    assert s.candidatos[0].puntaje == pytest.approx(0.95, abs=1e-3)
    assert s.candidatos[1].puntaje == pytest.approx(0.5, abs=1e-3)
    assert s.candidatos[0].foto_id == "fb2"


def test_mascota_sin_vector_de_rostro_usa_cuerpo(cliente, poblado):
    # M no tiene rostro: con consulta de rostro, su puntaje es solo el de cuerpo (como en SQL)
    s, _ = buscar(cliente, R, C)
    m = next(c for c in s.candidatos if c.mascota_id == "M")
    assert m.puntaje == pytest.approx(0.3, abs=1e-3)


def test_filtros(cliente, poblado):
    s, _ = buscar(cliente, R, C, solo_extraviadas=False)
    assert "D" in [c.mascota_id for c in s.candidatos]
    s, _ = buscar(cliente, R, C, distrito="San Isidro")
    assert "M" not in [c.mascota_id for c in s.candidatos]  # perdida en otro distrito
    assert "A" in [c.mascota_id for c in s.candidatos]  # sin distrito de pérdida: no se filtra
    s, _ = buscar(cliente, R, C, especie="gato")
    assert [c.mascota_id for c in s.candidatos] == ["G"]
    assert s.candidatos[0].puntaje == pytest.approx(1.0, abs=1e-3)


def test_limite(cliente, poblado):
    s, _ = buscar(cliente, R, C, limite=1)
    assert len(s.candidatos) == 1


def test_vector_de_largo_incorrecto_422(cliente):
    r = cliente.post("/search", json={"vectores": {"rostro": None, "cuerpo": [0.1] * 10},
                                      "filtros": {"especie": "perro"}})
    assert r.status_code == 422


def test_indice_vacio(cliente):
    s, _ = buscar(cliente, R, C)
    assert s.candidatos == []


def test_combinar_igual_que_sql():
    assert combinar(0.9, 0.5, True) == pytest.approx(0.74)
    assert combinar(None, 0.5, True) == 0.5
    assert combinar(0.9, 0.5, False) == 0.5
    assert combinar(0.9, None, True) == pytest.approx(0.54)
    assert combinar(None, None, True) is None


def test_texto_pgvector():
    assert a_texto_vector([0.5, -1.0]) == "[0.5,-1]"
    assert a_texto_vector(None) is None
