// Ayudas para las rutas /api/v1/mascotas/[id]/certificado y /qr. Solo se importan en el servidor.
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Mascota, RegistroSalud } from "@/lib/contratos";
import { BUCKET_FOTOS, supabaseServicio } from "@/lib/supabase";
import { DEMO_USUARIO, demoInicial, esDemo, type Certificado, type Perfil } from "./demo";
import { FOTO_LUNA_B64, FOTO_MAX_B64 } from "./imagenes-demo";

export class ErrorApi extends Error {
  constructor(public status: number, mensaje: string) { super(mensaje); }
}

export const respuestaError = (e: unknown) => {
  const status = e instanceof ErrorApi ? e.status : 500;
  const error = e instanceof Error ? e.message : "Error interno.";
  return Response.json({ error }, { status });
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PET_ID = /^PE-\d{8}$/;

function configServicio() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new ErrorApi(503, "Falta configurar Supabase (NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY).");
  }
  return supabaseServicio();
}

/** URL pública del sitio: NEXT_PUBLIC_SITE_URL o el origen de la solicitud. */
export const origen = (req: Request) => (process.env.NEXT_PUBLIC_SITE_URL || new URL(req.url).origin).replace(/\/$/, "");

/** Busca la mascota por id (uuid) o por número PET ID. */
export async function buscarMascota(id: string): Promise<Mascota> {
  if (!UUID.test(id) && !PET_ID.test(id)) throw new ErrorApi(400, "Identificador no válido.");
  if (esDemo()) {
    const m = demoInicial().mascotas.find((x) => x.id === id || x.pet_id === id);
    if (!m) throw new ErrorApi(404, "Mascota no encontrada.");
    return m;
  }
  const sb = configServicio();
  const { data, error } = await sb.from("mascotas").select("*").eq(UUID.test(id) ? "id" : "pet_id", id).maybeSingle();
  if (error) throw new ErrorApi(500, error.message);
  if (!data) throw new ErrorApi(404, "Mascota no encontrada.");
  return data as Mascota;
}

/** Usuario que hace la solicitud: cookie de sesión de Supabase o cabecera Authorization: Bearer. */
export async function usuarioSolicitud(req: Request): Promise<string | null> {
  if (esDemo()) return DEMO_USUARIO;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) throw new ErrorApi(503, "Falta configurar Supabase (NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY).");
  const bearer = req.headers.get("authorization")?.match(/^Bearer (.+)$/i)?.[1];
  if (bearer) {
    const { data } = await configServicio().auth.getUser(bearer);
    return data.user?.id ?? null;
  }
  const almacen = await cookies();
  const sb = createServerClient(url, anon, {
    cookies: { getAll: () => almacen.getAll(), setAll: () => { /* solo lectura */ } },
  });
  const { data } = await sb.auth.getUser();
  return data.user?.id ?? null;
}

export interface DatosDocumento {
  mascota: Mascota;
  perfil: Pick<Perfil, "nombres" | "apellidos">;
  certificado: Certificado;
  salud: RegistroSalud[];
  foto: Uint8Array | null; // JPEG
}

/** Reúne lo necesario para el DNI y el certificado. Crea el certificado si no existe. */
export async function datosDocumento(m: Mascota): Promise<DatosDocumento> {
  if (esDemo()) {
    const d = demoInicial();
    const b64 = m.especie === "gato" ? FOTO_LUNA_B64 : FOTO_MAX_B64;
    return {
      mascota: m, perfil: d.perfil,
      certificado: d.certificados.find((c) => c.mascota_id === m.id) ?? { codigo: "PID-DEMO-0000", emitido_at: m.creado_at },
      salud: d.salud.filter((s) => s.mascota_id === m.id),
      foto: Uint8Array.from(Buffer.from(b64, "base64")),
    };
  }
  const sb = configServicio();
  const [perfil, cert, salud, foto] = await Promise.all([
    sb.from("perfiles").select("nombres, apellidos").eq("id", m.propietario_id).single(),
    sb.from("certificados").select("codigo, emitido_at").eq("mascota_id", m.id).order("emitido_at", { ascending: false }).limit(1).maybeSingle(),
    sb.from("registros_salud").select("*").eq("mascota_id", m.id).order("fecha", { ascending: false }),
    m.foto_principal_id
      ? sb.from("fotos").select("ruta_storage").eq("id", m.foto_principal_id).maybeSingle()
      : sb.from("fotos").select("ruta_storage").eq("mascota_id", m.id).eq("tipo", "frente").neq("estado", "rechazada").limit(1).maybeSingle(),
  ]);
  if (perfil.error) throw new ErrorApi(500, perfil.error.message);
  let certificado = cert.data as Certificado | null;
  if (!certificado) {
    const nuevo = await sb.from("certificados").insert({ mascota_id: m.id }).select("codigo, emitido_at").single();
    if (nuevo.error) throw new ErrorApi(500, nuevo.error.message);
    certificado = nuevo.data as Certificado;
  }
  let bytes: Uint8Array | null = null;
  const ruta = (foto.data as { ruta_storage: string } | null)?.ruta_storage;
  if (ruta) {
    const dl = await sb.storage.from(BUCKET_FOTOS).download(ruta);
    if (dl.data) bytes = new Uint8Array(await dl.data.arrayBuffer());
  }
  return { mascota: m, perfil: perfil.data as DatosDocumento["perfil"], certificado, salud: (salud.data ?? []) as RegistroSalud[], foto: bytes };
}
