"""Contratos del servicio de reconocimiento. Congelados el 12 de noviembre de 2026.
Espejo de src/web/lib/contratos.ts (sección servicio de reconocimiento)."""
from typing import Literal, Optional
from pydantic import BaseModel, Field

Especie = Literal["perro", "gato"]
TipoFoto = Literal["frente", "perfil_izq", "perfil_der", "cuerpo", "marcas", "hallazgo"]
MotivoRechazo = Literal["sin_mascota", "borrosa", "oscura", "varias_mascotas", "pequena", "error_proceso"]
DIM = 768


class EmbedEntrada(BaseModel):
    foto_id: str
    url: str
    tipo: TipoFoto


class Vectores(BaseModel):
    rostro: Optional[list[float]] = Field(default=None, min_length=DIM, max_length=DIM)
    cuerpo: list[float] = Field(min_length=DIM, max_length=DIM)


class EmbedSalida(BaseModel):
    foto_id: str
    detectado: bool
    motivo: Optional[MotivoRechazo] = None
    especie: Optional[Especie] = None
    calidad: Optional[float] = None
    vectores: Optional[Vectores] = None


class Filtros(BaseModel):
    especie: Especie
    distrito: Optional[str] = None
    solo_extraviadas: bool = True


class SearchEntrada(BaseModel):
    vectores: Vectores
    filtros: Filtros
    limite: int = 5


class CandidatoServicio(BaseModel):
    mascota_id: str
    puntaje: float
    foto_id: Optional[str] = None


class SearchSalida(BaseModel):
    candidatos: list[CandidatoServicio]
