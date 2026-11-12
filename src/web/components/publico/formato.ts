// Formatos y listas compartidas por las pantallas públicas (sin dependencias de servidor).
import type { Especie, EstadoMascota, MotivoRechazo, Sexo } from "@/lib/contratos";

export const DISTRITOS = [
  "Barranco", "Jesús María", "La Molina", "Lince", "Magdalena del Mar", "Miraflores", "Pueblo Libre",
  "San Borja", "San Isidro", "San Miguel", "Santiago de Surco", "Surquillo",
];
export const COLORES = ["Marrón", "Negro", "Blanco", "Gris", "Atigrado", "Dorado o crema", "Manchado", "Otro"];

export const ESPECIE_TXT: Record<Especie, string> = { perro: "Perro", gato: "Gato" };

export const ESTADO_TXT: Record<EstadoMascota, { t: string; cls: string }> = {
  activa: { t: "Activa", cls: "ok" },
  extraviada: { t: "Extraviada", cls: "lost" },
  encontrada: { t: "Encontrada", cls: "ok" },
  fallecida: { t: "Fallecida", cls: "" },
};

export const MOTIVO_TXT: Record<MotivoRechazo, string> = {
  sin_mascota: "No encontramos una mascota en la foto. Encuadra solo al perro o al gato y vuelve a intentarlo.",
  borrosa: "La foto está movida o desenfocada. Sostén el teléfono quieto y toca la pantalla sobre la mascota para enfocar.",
  oscura: "La foto está oscura. Tómala con luz de día y sin flash.",
  varias_mascotas: "Hay más de una mascota en la foto. Toma una foto solo de la que encontraste.",
  pequena: "La foto es muy pequeña. Usa la cámara del teléfono y acércate a la mascota.",
  error_proceso: "No pudimos procesar la foto. Inténtalo de nuevo en unos minutos.",
};

/** "perdido" o "perdida" según el sexo. */
export const perdidoTxt = (sexo: Sexo) => (sexo === "hembra" ? "perdida" : "perdido");

const fmtFecha = new Intl.DateTimeFormat("es-PE", { day: "numeric", month: "short", year: "numeric", timeZone: "America/Lima" });
export function fecha(iso: string | null | undefined) {
  if (!iso) return "";
  const d = new Date(iso.length === 10 ? `${iso}T12:00:00-05:00` : iso);
  return Number.isNaN(d.getTime()) ? iso : fmtFecha.format(d);
}

export const RE_PET_ID = /^PE-\d{8}$/;
export const RE_CODIGO = /^PID-[2-9A-HJ-NP-Z]{4}-[2-9A-HJ-NP-Z]{4}$/;
export const normalizarPetId = (s: string) => decodeURIComponent(s).trim().toUpperCase();
