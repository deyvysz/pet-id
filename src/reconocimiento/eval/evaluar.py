"""Evaluación del reconocimiento: Recall@1/5/10, línea base aleatoria y umbral propuesto.

Conjunto: dataset/<id_mascota>/*.jpg (ver eval/README.md).
Por cada mascota se aparta una foto al azar como consulta; el resto va a la galería.
El puntaje es el mismo de producción (0.6 rostro + 0.4 cuerpo; sin rostro, solo cuerpo),
calculado con IndiceMemoria, que reproduce la función SQL buscar_similares.

Uso (desde src/reconocimiento):
  MODELO=real python eval/evaluar.py dataset/ --rondas 5
  MODELO=falso python eval/evaluar.py dataset/          # prueba del script, recall ~ azar
"""
import argparse
import random
import sys
from collections import Counter
from dataclasses import dataclass
from pathlib import Path
from typing import Optional

import numpy as np
from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.contratos import EmbedSalida  # noqa: E402
from app.detector import Detector, crear_detector  # noqa: E402
from app.indice import IndiceMemoria  # noqa: E402
from app.procesamiento import procesar  # noqa: E402
from app.vectores import Extractor, crear_extractor  # noqa: E402

EXTENSIONES = {".jpg", ".jpeg", ".png", ".webp"}
KS = (1, 5, 10)


@dataclass
class ResultadoRonda:
    rangos: list[Optional[int]]  # posición (1 = primero) de la mascota correcta; None si no aparece
    positivos: list[float]  # puntaje de la mascota correcta por consulta
    negativos: list[float]  # puntajes de las demás mascotas
    candidatos_por_consulta: list[int]


def cargar_dataset(raiz: Path) -> dict[str, list[Path]]:
    datos = {}
    for carpeta in sorted(p for p in raiz.iterdir() if p.is_dir()):
        fotos = sorted(f for f in carpeta.iterdir() if f.suffix.lower() in EXTENSIONES)
        if len(fotos) >= 2:
            datos[carpeta.name] = fotos
    return datos


def vectorizar(datos: dict[str, list[Path]], detector: Detector, extractor: Extractor,
               tipo: str, aplicar_calidad: bool) -> dict[Path, EmbedSalida]:
    salida = {}
    total = sum(len(v) for v in datos.values())
    for i, ruta in enumerate((r for rutas in datos.values() for r in rutas), 1):
        with Image.open(ruta) as img:
            salida[ruta] = procesar(img, str(ruta), tipo, detector, extractor, aplicar_calidad)
        if i % 50 == 0 or i == total:
            print(f"  vectorizadas {i}/{total}", file=sys.stderr)
    return salida


def ronda(datos: dict[str, list[Path]], vectores: dict[Path, EmbedSalida], semilla: int,
          por_especie: bool) -> ResultadoRonda:
    rng = random.Random(semilla)
    indice = IndiceMemoria()
    consultas = []
    for mid, rutas in datos.items():
        validas = [r for r in rutas if vectores[r].detectado]
        if len(validas) < 2:
            continue  # sin consulta y galería válidas no se puede medir esta mascota
        consulta = rng.choice(validas)
        galeria = [r for r in validas if r != consulta]
        especies = Counter(vectores[r].especie for r in galeria if vectores[r].especie)
        indice.agregar_mascota(mid, especies.most_common(1)[0][0] if especies else "perro")
        for r in galeria:
            v = vectores[r].vectores
            indice.agregar_vector(mid, str(r), "cuerpo", v.cuerpo)
            if v.rostro is not None:
                indice.agregar_vector(mid, str(r), "rostro", v.rostro)
        consultas.append((mid, consulta))

    res = ResultadoRonda([], [], [], [])
    for mid, ruta in consultas:
        q = vectores[ruta]
        especie = q.especie if por_especie else None
        cands = indice.puntuar(q.vectores.rostro, q.vectores.cuerpo, especie=especie, solo_extraviadas=False)
        ids = [c.mascota_id for c in cands]
        res.rangos.append(ids.index(mid) + 1 if mid in ids else None)
        res.candidatos_por_consulta.append(len(cands))
        for c in cands:
            (res.positivos if c.mascota_id == mid else res.negativos).append(c.puntaje)
    return res


def recall(rangos: list[Optional[int]], k: int) -> float:
    if not rangos:
        return 0.0
    return sum(1 for r in rangos if r is not None and r <= k) / len(rangos)


def linea_base(candidatos_por_consulta: list[int], k: int) -> float:
    """Recall@k esperado eligiendo al azar entre los candidatos de cada consulta."""
    if not candidatos_por_consulta:
        return 0.0
    return float(np.mean([min(1.0, k / n) if n else 0.0 for n in candidatos_por_consulta]))


def proponer_umbral(positivos: list[float], negativos: list[float], fp_max: float = 0.05) -> dict:
    """Recorre los puntajes observados como umbrales.
    - umbral_f1: maximiza F1 (positivo = la mascota correcta con puntaje >= umbral).
    - umbral_fp: el menor umbral con tasa de falsos positivos < fp_max."""
    pos, neg = np.asarray(positivos, dtype=float), np.asarray(negativos, dtype=float)
    if pos.size == 0:
        return {}
    umbrales = np.unique(np.concatenate([pos, neg]))
    tp = np.array([(pos >= t).sum() for t in umbrales])
    fp = np.array([(neg >= t).sum() for t in umbrales])
    fn = pos.size - tp
    f1 = 2 * tp / np.maximum(2 * tp + fp + fn, 1)
    fpr = fp / max(neg.size, 1)
    tpr = tp / pos.size
    i = int(np.argmax(f1))
    salida = {"umbral_f1": float(umbrales[i]), "f1": float(f1[i]), "tpr_f1": float(tpr[i]), "fpr_f1": float(fpr[i])}
    ok = np.where(fpr < fp_max)[0]
    if ok.size:
        j = int(ok[0])  # umbrales está ordenado: el primero que cumple es el menor
        salida.update({"umbral_fp": float(umbrales[j]), "tpr_fp": float(tpr[j]), "fpr_fp": float(fpr[j])})
    return salida


def imprimir(rondas: list[ResultadoRonda], n_mascotas: int, n_fotos: int, rechazadas: Counter) -> dict:
    rangos = [r for x in rondas for r in x.rangos]
    cands = [c for x in rondas for c in x.candidatos_por_consulta]
    pos = [p for x in rondas for p in x.positivos]
    neg = [n for x in rondas for n in x.negativos]
    print(f"\nMascotas: {n_mascotas}  fotos: {n_fotos}  rondas: {len(rondas)}  consultas: {len(rangos)}")
    if rechazadas:
        detalle = ", ".join(f"{k}: {v}" for k, v in rechazadas.most_common())
        print(f"Fotos rechazadas por el servicio: {sum(rechazadas.values())} ({detalle})")
    print(f"\n{'Métrica':<12}{'Modelo':>10}{'Azar':>10}")
    metricas = {}
    for k in KS:
        m, b = recall(rangos, k), linea_base(cands, k)
        metricas[f"recall@{k}"], metricas[f"azar@{k}"] = m, b
        print(f"{'Recall@' + str(k):<12}{m:>10.3f}{b:>10.3f}")
    u = proponer_umbral(pos, neg)
    if u:
        print(f"\nUmbral que maximiza F1: {u['umbral_f1']:.3f} "
              f"(F1 {u['f1']:.3f}, aciertos {u['tpr_f1']:.1%}, falsos positivos {u['fpr_f1']:.1%})")
        if "umbral_fp" in u:
            print(f"Umbral con falsos positivos < 5 %: {u['umbral_fp']:.3f} "
                  f"(aciertos {u['tpr_fp']:.1%}, falsos positivos {u['fpr_fp']:.1%})")
    metricas.update(u)
    return metricas


def main(argv: Optional[list[str]] = None) -> dict:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("dataset", type=Path)
    ap.add_argument("--modelo", choices=["real", "falso"], default=None, help="por defecto, la variable MODELO")
    ap.add_argument("--rondas", type=int, default=1, help="repeticiones con distinta foto apartada")
    ap.add_argument("--semilla", type=int, default=0)
    ap.add_argument("--tipo", default="hallazgo", help="tipo de foto con que se procesa todo (por defecto hallazgo)")
    ap.add_argument("--sin-calidad", action="store_true", help="no rechazar por tamaño, brillo o nitidez")
    ap.add_argument("--por-especie", action="store_true", help="filtrar candidatos por la especie detectada")
    a = ap.parse_args(argv)

    datos = cargar_dataset(a.dataset)
    if not datos:
        ap.error("no hay carpetas con 2 fotos o más")
    pocas = [m for m, f in datos.items() if len(f) < 3]
    if len(datos) < 50 or pocas:
        print(f"Aviso: {len(datos)} mascotas ({len(pocas)} con menos de 3 fotos); "
              "el mínimo acordado es 50 mascotas con 3 fotos o más.", file=sys.stderr)

    vectores = vectorizar(datos, crear_detector(a.modelo), crear_extractor(a.modelo), a.tipo, not a.sin_calidad)
    rechazadas = Counter(v.motivo for v in vectores.values() if not v.detectado)
    rondas = [ronda(datos, vectores, a.semilla + i, a.por_especie) for i in range(a.rondas)]
    return imprimir(rondas, len(datos), len(vectores), rechazadas)


if __name__ == "__main__":
    main()
