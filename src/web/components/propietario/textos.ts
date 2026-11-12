// Textos y formatos de la web del propietario (tomados de docs/diseno/prototipo.html).
import type {
  EstadoMascota, Especie, MotivoRechazo, Sexo, TipoFoto, TipoRegistroSalud,
} from "@/lib/contratos";

export const ESPECIE_TXT: Record<Especie, string> = { perro: "Perro", gato: "Gato" };
/** Como figura en el DNI de la mascota. */
export const ESPECIE_DNI: Record<Especie, string> = { perro: "Canino", gato: "Felino" };
export const SEXO_TXT: Record<Sexo, string> = { macho: "Macho", hembra: "Hembra" };

export const ESTADO_TXT: Record<EstadoMascota, string> = {
  activa: "Activa", extraviada: "Extraviada", encontrada: "Encontrada", fallecida: "Fallecida",
};
export const ESTADO_CHIP: Record<EstadoMascota, "ok" | "lost" | "warn" | ""> = {
  activa: "ok", extraviada: "lost", encontrada: "ok", fallecida: "",
};

/** Tomas guiadas. Las cuatro primeras son obligatorias (FOTOS_OBLIGATORIAS). */
export const TOMAS: { tipo: Exclude<TipoFoto, "hallazgo">; t: string; d: string }[] = [
  { tipo: "frente", t: "Cara de frente", d: "A la altura de sus ojos, a un brazo de distancia. Que se vean los dos ojos y la nariz, y que la cara ocupe casi todo el recuadro." },
  { tipo: "perfil_izq", t: "Perfil izquierdo", d: "Su lado izquierdo, con la cabeza de lado. Que se vean completos la oreja, el ojo y el hocico." },
  { tipo: "perfil_der", t: "Perfil derecho", d: "Su lado derecho. Las manchas y marcas no suelen ser iguales en los dos lados." },
  { tipo: "cuerpo", t: "Cuerpo entero de costado", d: "De pie y de lado, con la cabeza y la cola dentro de la foto. Sin ropa ni arnés, si es posible." },
  { tipo: "marcas", t: "Marcas o señas de cerca", d: "Manchas, cicatrices, una oreja caída o el color de los ojos. Si no tiene ninguna, sáltala." },
];

export const MOTIVO_TXT: Record<MotivoRechazo, string> = {
  sin_mascota: "No encontramos una mascota en la foto.",
  borrosa: "La foto está movida o desenfocada.",
  oscura: "La foto está oscura.",
  varias_mascotas: "Aparece más de una mascota.",
};

export const TIPO_SALUD_TXT: Record<TipoRegistroSalud, string> = {
  vacuna: "Vacuna", desparasitacion: "Desparasitación", control: "Control veterinario",
  alergia: "Alergia", medicamento: "Medicamento", documento: "Documento",
};

/** Opciones del campo "nombre" según el tipo de registro y la especie. */
export function opcionesSalud(tipo: TipoRegistroSalud, especie: Especie): string[] {
  switch (tipo) {
    case "vacuna":
      return especie === "gato"
        ? ["Antirrábica", "Triple felina", "Leucemia felina", "Otra"]
        : ["Antirrábica", "Séxtuple u óctuple", "Tos de las perreras", "Otra"];
    case "desparasitacion": return ["Interna", "Externa (pulgas y garrapatas)"];
    case "control": return ["Control general", "Otro"];
    default: return [];
  }
}

/** Título legible de un registro de salud: "Vacuna antirrábica", "Desparasitación interna"... */
export function tituloSalud(e: { tipo: TipoRegistroSalud; nombre: string }): string {
  const n = e.nombre.charAt(0).toLowerCase() + e.nombre.slice(1);
  if (e.tipo === "vacuna") return `Vacuna ${n}`;
  if (e.tipo === "desparasitacion") return `Desparasitación ${n}`;
  if (e.tipo === "control" && e.nombre === "Control general") return "Control veterinario general";
  return e.nombre;
}

const MESES = ["ene.", "feb.", "mar.", "abr.", "may.", "jun.", "jul.", "ago.", "set.", "oct.", "nov.", "dic."];
/** 2026-11-04 → 4 nov. 2026 */
export function fecha(iso: string | null | undefined): string {
  if (!iso) return "Sin dato";
  const p = iso.slice(0, 10).split("-");
  if (p.length !== 3) return iso;
  return `${Number(p[2])} ${MESES[Number(p[1]) - 1]} ${p[0]}`;
}

export function hoyISO(): string {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10);
}

/** Estado de una fecha de próxima dosis. */
export function estadoProxima(proxima: string | null): { cls: "ok" | "warn" | "lost" | ""; t: string } {
  if (!proxima) return { cls: "", t: "Sin próxima fecha" };
  const d = Math.round((Date.parse(proxima) - Date.parse(hoyISO())) / 864e5);
  if (d < 0) return { cls: "lost", t: `Vencida hace ${-d} ${d === -1 ? "día" : "días"}` };
  if (d <= 30) return { cls: "warn", t: d === 0 ? "Vence hoy" : `Vence en ${d} ${d === 1 ? "día" : "días"}` };
  return { cls: "ok", t: "Al día" };
}

export const TIPO_DOC_TXT: Record<"DNI" | "CE" | "PAS", string> = {
  DNI: "DNI", CE: "Carné de extranjería", PAS: "Pasaporte",
};
