"""Búsqueda de candidatos.

- IndicePostgres: llama a la función SQL buscar_similares (0001_esquema.sql).
- IndiceMemoria: reproduce la misma lógica en Python para pruebas y para eval/evaluar.py.
  puntaje = 0.6 * max(sim rostro) + 0.4 * max(sim cuerpo); sin rostro, solo cuerpo.
"""
from dataclasses import dataclass, field
from typing import Optional, Protocol

import numpy as np

from .contratos import CandidatoServicio, SearchEntrada

PESO_ROSTRO = 0.6
PESO_CUERPO = 0.4
LIMITE_MAX = 50


class Indice(Protocol):
    def buscar(self, entrada: SearchEntrada) -> list[CandidatoServicio]: ...


def limite_valido(limite: int) -> int:
    return max(1, min(LIMITE_MAX, int(limite)))


def combinar(sim_rostro: Optional[float], sim_cuerpo: Optional[float], hay_rostro_consulta: bool) -> Optional[float]:
    """Mismo cálculo que buscar_similares. None si la mascota no tiene ningún vector comparable."""
    if sim_rostro is None and sim_cuerpo is None:
        return None
    if not hay_rostro_consulta or sim_rostro is None:
        return sim_cuerpo
    return PESO_ROSTRO * sim_rostro + PESO_CUERPO * (sim_cuerpo or 0.0)


def a_texto_vector(v: Optional[list[float]]) -> Optional[str]:
    """Formato de entrada de pgvector: '[0.1,0.2,...]'."""
    if v is None:
        return None
    return "[" + ",".join(f"{x:.7g}" for x in v) + "]"


# ---------- Postgres ----------

class IndicePostgres:
    SQL = (
        "select mascota_id, puntaje, foto_id from buscar_similares("
        "%s::vector, %s::vector, %s::especie, %s, %s, %s)"
    )

    def __init__(self, dsn: str):
        self.dsn = dsn

    def buscar(self, entrada: SearchEntrada) -> list[CandidatoServicio]:
        import psycopg

        f = entrada.filtros
        params = (
            a_texto_vector(entrada.vectores.rostro),
            a_texto_vector(entrada.vectores.cuerpo),
            f.especie,
            f.distrito,
            f.solo_extraviadas,
            limite_valido(entrada.limite),
        )
        # una conexión por búsqueda: simple y suficiente para el volumen de la fase 1
        with psycopg.connect(self.dsn, autocommit=True) as conn:
            filas = conn.execute(self.SQL, params).fetchall()
        return [
            CandidatoServicio(mascota_id=str(m), puntaje=round(float(p), 4), foto_id=str(fid) if fid else None)
            for m, p, fid in filas
        ]


# ---------- Memoria ----------

@dataclass
class _Mascota:
    especie: str
    estado: str = "extraviada"
    distrito_perdida: Optional[str] = None
    lista_para_busqueda: bool = True
    vectores: dict[str, list[tuple[str, np.ndarray]]] = field(default_factory=lambda: {"rostro": [], "cuerpo": []})


def _unitario(v) -> np.ndarray:
    a = np.asarray(v, dtype=np.float32)
    n = np.linalg.norm(a)
    return a / n if n > 0 else a


class IndiceMemoria:
    def __init__(self):
        self.mascotas: dict[str, _Mascota] = {}

    def agregar_mascota(self, mascota_id: str, especie: str, estado: str = "extraviada",
                        distrito_perdida: Optional[str] = None, lista_para_busqueda: bool = True) -> None:
        self.mascotas[mascota_id] = _Mascota(especie, estado, distrito_perdida, lista_para_busqueda)

    def agregar_vector(self, mascota_id: str, foto_id: str, tipo: str, vector) -> None:
        self.mascotas[mascota_id].vectores[tipo].append((foto_id, _unitario(vector)))

    @staticmethod
    def _mejor(lista: list[tuple[str, np.ndarray]], consulta: np.ndarray) -> tuple[Optional[float], Optional[str]]:
        if not lista:
            return None, None
        sims = [float(np.dot(v, consulta)) for _, v in lista]
        i = int(np.argmax(sims))
        return sims[i], lista[i][0]

    def puntuar(self, rostro, cuerpo, especie: Optional[str] = None, distrito: Optional[str] = None,
                solo_extraviadas: bool = True) -> list[CandidatoServicio]:
        """Todos los candidatos ordenados. especie=None no filtra (solo para evaluación)."""
        q_rostro = _unitario(rostro) if rostro is not None else None
        q_cuerpo = _unitario(cuerpo)
        salida = []
        for mid, m in self.mascotas.items():
            if especie is not None and m.especie != especie:
                continue
            if not m.lista_para_busqueda or m.estado == "fallecida":
                continue
            if solo_extraviadas and m.estado != "extraviada":
                continue
            if distrito is not None and m.distrito_perdida is not None and m.distrito_perdida != distrito:
                continue
            s_r, f_r = self._mejor(m.vectores["rostro"], q_rostro) if q_rostro is not None else (None, None)
            s_c, f_c = self._mejor(m.vectores["cuerpo"], q_cuerpo)
            p = combinar(s_r, s_c, q_rostro is not None)
            if p is None:
                continue
            salida.append(CandidatoServicio(mascota_id=mid, puntaje=round(p, 4), foto_id=f_r or f_c))
        salida.sort(key=lambda c: c.puntaje, reverse=True)
        return salida

    def buscar(self, entrada: SearchEntrada) -> list[CandidatoServicio]:
        f = entrada.filtros
        todos = self.puntuar(entrada.vectores.rostro, entrada.vectores.cuerpo, f.especie, f.distrito, f.solo_extraviadas)
        return todos[: limite_valido(entrada.limite)]
