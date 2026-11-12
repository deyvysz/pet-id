// Datos de demostración. Se usan solo con NEXT_PUBLIC_DEMO=1, para ver las pantallas sin Supabase ni reconocimiento.
import type { Candidato, MascotaPublica, VerificacionCertificado } from "@/lib/contratos";
import { IMG_PERRO } from "./img/imagenes";

export const esDemo = () => process.env.NEXT_PUBLIC_DEMO === "1";

/** Color de fondo para mascotas de ejemplo sin foto. */
export const FONDO_DEMO: Record<string, string> = {
  "PE-00000311": "#F3DFA8", "PE-00000208": "#D9B79A", "PE-00000187": "#B9C2CC", "PE-00000276": "#E8C9A6",
};

export const MASCOTAS_DEMO: MascotaPublica[] = [
  {
    pet_id: "PE-00000125", nombre: "Max", especie: "perro", raza: "Golden retriever", sexo: "macho", color: "Dorado",
    estado: "extraviada", foto_url: IMG_PERRO, distrito_perdida: "Miraflores", fecha_perdida: "2026-11-03T18:30:00-05:00",
    mensaje_perdida: "Es tímido, no lo persigas. Responde a su nombre.",
  },
  {
    pet_id: "PE-00000311", nombre: "Canela", especie: "perro", raza: "Mestizo", sexo: "hembra", color: "Dorado o crema",
    estado: "extraviada", foto_url: null, distrito_perdida: "Miraflores", fecha_perdida: "2026-11-04T09:00:00-05:00", mensaje_perdida: null,
  },
  {
    pet_id: "PE-00000208", nombre: "Bruno", especie: "perro", raza: "Labrador", sexo: "macho", color: "Marrón",
    estado: "extraviada", foto_url: null, distrito_perdida: "Barranco", fecha_perdida: "2026-10-30T20:00:00-05:00", mensaje_perdida: null,
  },
  {
    pet_id: "PE-00000187", nombre: "Rocky", especie: "perro", raza: "Mestizo", sexo: "macho", color: "Negro",
    estado: "extraviada", foto_url: null, distrito_perdida: "San Isidro", fecha_perdida: "2026-11-02T07:15:00-05:00", mensaje_perdida: null,
  },
  {
    pet_id: "PE-00000276", nombre: "Lola", especie: "perro", raza: "Cocker spaniel", sexo: "hembra", color: "Marrón",
    estado: "extraviada", foto_url: null, distrito_perdida: "Surquillo", fecha_perdida: "2026-11-06T16:40:00-05:00", mensaje_perdida: null,
  },
];

export const mascotaDemo = (petId: string) => MASCOTAS_DEMO.find((m) => m.pet_id === petId) ?? null;

const PUNTAJES = [0.87, 0.74, 0.66, 0.61, 0.58];
export const CANDIDATOS_DEMO: Candidato[] = MASCOTAS_DEMO.map((m, i) => ({
  pet_id: m.pet_id, nombre: m.nombre, puntaje: PUNTAJES[i], foto_url: m.foto_url, estado: m.estado,
}));

export const CODIGO_DEMO = "PID-7Q4K-92XM";
export function verificacionDemo(codigo: string): VerificacionCertificado {
  if (codigo !== CODIGO_DEMO) return { valido: false, codigo };
  return { valido: true, codigo, pet_id: "PE-00000125", nombre: "Max", especie: "perro", estado: "extraviada", emitido_at: "2026-11-04T10:00:00-05:00" };
}

export const ADMIN_DEMO = {
  stats: { mascotas: 1248, listas: 761, extravios: 9, hallazgosSemana: 37 },
  reportes: MASCOTAS_DEMO.map((m) => ({ pet_id: m.pet_id, nombre: m.nombre, distrito: m.distrito_perdida ?? "", fecha: m.fecha_perdida ?? "" })),
  mascotas: [
    { pet_id: "PE-00000125", nombre: "Max", especie: "perro" as const, estado: "extraviada" as const, creado_at: "2026-11-04T10:00:00-05:00" },
    { pet_id: "PE-00000124", nombre: "Mishi", especie: "gato" as const, estado: "activa" as const, creado_at: "2026-11-04T09:12:00-05:00" },
    { pet_id: "PE-00000123", nombre: "Nube", especie: "gato" as const, estado: "activa" as const, creado_at: "2026-11-03T17:40:00-05:00" },
    { pet_id: "PE-00000122", nombre: "Toby", especie: "perro" as const, estado: "encontrada" as const, creado_at: "2026-11-03T11:05:00-05:00" },
  ],
  usuarios: [
    { nombre: "Ana Pérez", distrito: "Miraflores", rol: "propietario", creado_at: "2026-11-04T09:58:00-05:00" },
    { nombre: "Luis Ramos", distrito: "Surquillo", rol: "propietario", creado_at: "2026-11-03T17:20:00-05:00" },
    { nombre: "Equipo PET ID", distrito: "San Isidro", rol: "admin", creado_at: "2026-11-01T08:00:00-05:00" },
  ],
};
