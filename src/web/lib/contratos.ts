// Contratos congelados el 12 de noviembre de 2026. Fuente: docs/diseno/contratos-api.md e infra/supabase/migrations/0001_esquema.sql.
// Cambios solo con una decisión en docs/decisiones/.

export type Especie = "perro" | "gato";
export type Sexo = "macho" | "hembra";
export type EstadoMascota = "activa" | "extraviada" | "encontrada" | "fallecida";
export type TipoFoto = "frente" | "perfil_izq" | "perfil_der" | "cuerpo" | "marcas" | "hallazgo";
export type EstadoProceso = "pendiente" | "procesando" | "lista" | "rechazada";
export type MotivoRechazo = "sin_mascota" | "borrosa" | "oscura" | "varias_mascotas" | "pequena" | "error_proceso";
export type TipoRegistroSalud = "vacuna" | "desparasitacion" | "control" | "alergia" | "medicamento" | "documento";

/** Fotos mínimas del registro. 'marcas' es opcional. */
export const FOTOS_OBLIGATORIAS: TipoFoto[] = ["frente", "perfil_izq", "perfil_der", "cuerpo"];

export interface Mascota {
  id: string;
  pet_id: string; // PE-00000125
  propietario_id: string;
  nombre: string;
  especie: Especie;
  raza: string;
  sexo: Sexo;
  fecha_nacimiento: string;
  fecha_nacimiento_estimada: boolean;
  color: string;
  senas: string | null;
  microchip: string | null;
  esterilizado: boolean | null;
  estado: EstadoMascota;
  lista_para_busqueda: boolean;
  foto_principal_id: string | null;
  creado_at: string;
}

export interface Foto {
  id: string;
  mascota_id: string | null;
  hallazgo_id: string | null;
  tipo: TipoFoto;
  ruta_storage: string;
  estado: EstadoProceso;
  motivo_rechazo: MotivoRechazo | null;
  calidad: number | null;
}

export interface RegistroSalud {
  id: string;
  mascota_id: string;
  tipo: TipoRegistroSalud;
  nombre: string;
  fecha: string;
  proxima_fecha: string | null;
  notas: string | null;
  ruta_adjunto: string | null;
  declarado_por_propietario: boolean;
}

export interface ReportePerdida {
  /** Código INEI del distrito (migración 0010). */
  ubigeo?: string | null;
  id: string;
  mascota_id: string;
  fecha_perdida: string;
  distrito: string;
  referencia: string | null;
  lat: number | null;
  lng: number | null;
  mensaje: string | null;
  activo: boolean;
}

/** GET /api/v1/mascotas/{pet_id}/publico. Nunca datos del propietario. */
export interface MascotaPublica {
  pet_id: string;
  nombre: string;
  especie: Especie;
  raza: string;
  sexo: Sexo;
  color: string;
  estado: EstadoMascota;
  foto_url: string | null;
  distrito_perdida: string | null;
  fecha_perdida: string | null;
  mensaje_perdida: string | null;
}

/** GET /api/v1/verificar/{codigo} */
export interface VerificacionCertificado {
  valido: boolean;
  codigo: string;
  pet_id?: string;
  nombre?: string;
  especie?: Especie;
  estado?: EstadoMascota;
  emitido_at?: string;
}

/** POST /api/v1/hallazgos (multipart: foto + campos) → respuesta */
export interface HallazgoRespuesta {
  hallazgo_id: string;
  detectado: boolean;
  motivo?: MotivoRechazo;
  candidatos: Candidato[];
}
export interface Candidato {
  pet_id: string;
  nombre: string;
  puntaje: number; // 0 a 1
  foto_url: string | null;
  estado: EstadoMascota;
}

/** POST /api/v1/contacto */
export interface ContactoEntrada {
  pet_id: string;
  hallazgo_id?: string;
  nombre: string;
  celular?: string;
  correo?: string;
  mensaje: string;
}

// ---- Servicio de reconocimiento (interno, URL en RECONOCIMIENTO_URL) ----
export interface EmbedEntrada { foto_id: string; url: string; tipo: TipoFoto }
export interface EmbedSalida {
  foto_id: string;
  detectado: boolean;
  motivo?: MotivoRechazo;
  especie?: Especie;
  calidad?: number;
  vectores?: { rostro: number[] | null; cuerpo: number[] };
}
export interface SearchEntrada {
  vectores: { rostro: number[] | null; cuerpo: number[] };
  filtros: { especie: Especie; distrito?: string; solo_extraviadas?: boolean };
  limite?: number;
}
export interface SearchSalida { candidatos: { mascota_id: string; puntaje: number; foto_id: string | null }[] }

/** Umbral mínimo para mostrar un candidato. Se recalibra con la evaluación (agente 2). */
export const UMBRAL_CANDIDATO = 0.55;
