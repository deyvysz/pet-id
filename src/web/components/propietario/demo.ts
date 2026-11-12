// Datos del modo demo (NEXT_PUBLIC_DEMO=1). Sirven para ver las pantallas sin backend.
import type { Foto, Mascota, RegistroSalud, ReportePerdida } from "@/lib/contratos";
import { FOTO_LUNA_B64, FOTO_MAX_B64, dataUri } from "./imagenes-demo";

export const esDemo = () => process.env.NEXT_PUBLIC_DEMO === "1";

export interface Perfil {
  id: string;
  nombres: string;
  apellidos: string;
  tipo_documento: "DNI" | "CE" | "PAS";
  numero_documento: string;
  celular: string;
  correo: string | null;
  celular_verificado: boolean;
  departamento: string;
  provincia: string;
  distrito: string;
  creado_at?: string;
}

export interface Certificado { codigo: string; emitido_at: string }

/** Foto con su URL para mostrarla (firmada en Supabase, data URI en demo). */
export type FotoVista = Foto & { url: string | null; creado_at?: string };

export const DEMO_USUARIO = "00000000-0000-4000-8000-0000000000a1";
export const DEMO_MAX = "00000000-0000-4000-8000-000000000125";
export const DEMO_LUNA = "00000000-0000-4000-8000-000000000126";

export interface DemoDatos {
  perfil: Perfil;
  mascotas: Mascota[];
  fotos: FotoVista[];
  salud: RegistroSalud[];
  reportes: ReportePerdida[];
  certificados: (Certificado & { mascota_id: string })[];
}

export function demoInicial(): DemoDatos {
  const max = dataUri(FOTO_MAX_B64), luna = dataUri(FOTO_LUNA_B64);
  const foto = (id: string, mascota_id: string, tipo: Foto["tipo"], url: string, estado: Foto["estado"], motivo: Foto["motivo_rechazo"] = null): FotoVista =>
    ({ id, mascota_id, hallazgo_id: null, tipo, ruta_storage: `${mascota_id}/${id}.jpg`, estado, motivo_rechazo: motivo, calidad: estado === "lista" ? 0.86 : null, url });
  return {
    perfil: {
      id: DEMO_USUARIO, nombres: "Ana", apellidos: "Pérez", tipo_documento: "DNI", numero_documento: "45678912",
      celular: "987654321", correo: "ana.perez@example.com", celular_verificado: true, departamento: "Lima", provincia: "Lima", distrito: "Miraflores",
    },
    mascotas: [
      {
        id: DEMO_MAX, pet_id: "PE-00000125", propietario_id: DEMO_USUARIO, nombre: "Max", especie: "perro",
        raza: "Golden retriever", sexo: "macho", fecha_nacimiento: "2022-03-15", fecha_nacimiento_estimada: true,
        color: "Dorado", senas: "Pecho más claro, oreja izquierda un poco caída", microchip: null, esterilizado: true,
        estado: "activa", lista_para_busqueda: false, foto_principal_id: "00000000-0000-4000-8000-0000000f0001",
        creado_at: "2026-11-04T15:20:00-05:00",
      },
      {
        id: DEMO_LUNA, pet_id: "PE-00000126", propietario_id: DEMO_USUARIO, nombre: "Luna", especie: "gato",
        raza: "Mestizo", sexo: "hembra", fecha_nacimiento: "2023-07-01", fecha_nacimiento_estimada: true,
        color: "Atigrado", senas: null, microchip: null, esterilizado: null, estado: "activa",
        lista_para_busqueda: false, foto_principal_id: "00000000-0000-4000-8000-0000000f0011",
        creado_at: "2026-11-06T10:05:00-05:00",
      },
    ],
    fotos: [
      foto("00000000-0000-4000-8000-0000000f0001", DEMO_MAX, "frente", max, "lista"),
      foto("00000000-0000-4000-8000-0000000f0002", DEMO_MAX, "perfil_izq", max, "lista"),
      foto("00000000-0000-4000-8000-0000000f0003", DEMO_MAX, "perfil_der", max, "rechazada", "borrosa"),
      foto("00000000-0000-4000-8000-0000000f0004", DEMO_MAX, "cuerpo", max, "pendiente"),
      foto("00000000-0000-4000-8000-0000000f0011", DEMO_LUNA, "frente", luna, "lista"),
    ],
    salud: [
      { id: "s1", mascota_id: DEMO_MAX, tipo: "vacuna", nombre: "Antirrábica", fecha: "2025-12-10", proxima_fecha: "2026-12-10", notas: null, ruta_adjunto: null, declarado_por_propietario: true },
      { id: "s2", mascota_id: DEMO_MAX, tipo: "desparasitacion", nombre: "Interna", fecha: "2026-08-02", proxima_fecha: "2026-11-02", notas: "Tableta según su peso.", ruta_adjunto: null, declarado_por_propietario: true },
      { id: "s3", mascota_id: DEMO_MAX, tipo: "control", nombre: "Control general", fecha: "2026-06-20", proxima_fecha: null, notas: "Peso: 31 kg.", ruta_adjunto: null, declarado_por_propietario: true },
      { id: "s4", mascota_id: DEMO_MAX, tipo: "vacuna", nombre: "Séxtuple u óctuple", fecha: "2026-03-15", proxima_fecha: "2027-03-15", notas: null, ruta_adjunto: null, declarado_por_propietario: true },
    ],
    reportes: [],
    certificados: [{ mascota_id: DEMO_MAX, codigo: "PID-7Q4K-92XM", emitido_at: "2026-11-04T15:20:00-05:00" }],
  };
}
