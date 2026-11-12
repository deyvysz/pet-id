import pytest

from eval import evaluar
from tests.conftest import imagen_nitida


def test_recall_y_linea_base():
    assert evaluar.recall([1, 3, None, 7], 1) == 0.25
    assert evaluar.recall([1, 3, None, 7], 5) == 0.5
    assert evaluar.recall([1, 3, None, 7], 10) == 0.75
    assert evaluar.linea_base([50, 50], 5) == pytest.approx(0.1)
    assert evaluar.linea_base([3], 5) == 1.0


def test_umbral_separable():
    u = evaluar.proponer_umbral([0.9, 0.85, 0.8], [0.1, 0.2, 0.3, 0.4, 0.5])
    assert u["umbral_f1"] == 0.8 and u["f1"] == 1.0
    assert u["umbral_fp"] == 0.8 and u["fpr_fp"] == 0.0


def test_umbral_con_solape():
    neg = [i / 100 for i in range(100)]  # 0.00 .. 0.99
    u = evaluar.proponer_umbral([0.97, 0.98, 0.99], neg)
    assert u["fpr_fp"] < 0.05


def test_extremo_a_extremo_con_falsos(tmp_path, capsys):
    for m in range(6):
        carpeta = tmp_path / f"mascota{m}"
        carpeta.mkdir()
        for f in range(3):
            imagen_nitida(semilla=m * 10 + f).save(carpeta / f"{f}.jpg", quality=95)
    met = evaluar.main([str(tmp_path), "--modelo", "falso", "--rondas", "2"])
    salida = capsys.readouterr().out
    assert "Recall@1" in salida and "Azar" in salida
    assert 0 <= met["recall@1"] <= met["recall@5"] <= met["recall@10"] == 1.0  # 6 mascotas < 10
    assert met["azar@5"] == pytest.approx(5 / 6)
