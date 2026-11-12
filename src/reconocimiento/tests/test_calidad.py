from app import calidad
from tests.conftest import imagen_borrosa, imagen_nitida, imagen_oscura


def test_nitida_aceptada():
    r = calidad.evaluar(imagen_nitida())
    assert r.aceptada and r.motivo is None
    assert 0 <= r.calidad <= 1


def test_pequena():
    r = calidad.evaluar(imagen_nitida(lado=399))
    assert r.motivo == "pequena"


def test_lado_menor_manda():
    # 800 x 300: el lado menor no llega a 400
    assert calidad.evaluar(imagen_nitida(lado=800, alto=300)).motivo == "pequena"
    assert calidad.evaluar(imagen_nitida(lado=800, alto=400)).aceptada


def test_oscura():
    r = calidad.evaluar(imagen_oscura())
    assert r.motivo == "oscura"
    assert r.brillo < calidad.BRILLO_MIN


def test_borrosa_por_laplaciano():
    r = calidad.evaluar(imagen_borrosa())
    assert r.motivo == "borrosa"
    assert r.nitidez < calidad.NITIDEZ_MIN


def test_sin_revisar_nitidez():
    assert calidad.evaluar(imagen_borrosa(), revisar_nitidez=False).aceptada


def test_nitidez_del_recorte():
    # fondo borroso, mascota nítida: se acepta si se mide sobre el recorte
    assert calidad.evaluar(imagen_borrosa(), recorte=imagen_nitida(300)).aceptada


def test_nitida_puntua_mas_que_borrosa():
    assert calidad.evaluar(imagen_nitida()).calidad > calidad.evaluar(imagen_borrosa()).calidad
