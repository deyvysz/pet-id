// Lecturas de servidor de la web pública. Solo se importa desde páginas de servidor y rutas /api.
import type { Especie, EstadoMascota, MascotaPublica, VerificacionCertificado } from "@/lib/contratos";
import { BUCKET_FOTOS, supabaseServicio } from "@/lib/supabase";
import { esDemo, mascotaDemo, verificacionDemo } from "./demo";

/** Hay Supabase configurado. */
export const hayBackend = () => !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.SUPABASE_SERVICE_ROLE_KEY;

export class SinBackend extends Error {
  constructor() { super("Supabase no está configurado (NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY)."); }
}

/** URL firmada de una ruta del bucket 'fotos'. */
export async function firmarFoto(ruta: string | null, segundos = 3600): Promise<string | null> {
  if (!ruta) return null;
  const { data } = await supabaseServicio().storage.from(BUCKET_FOTOS).createSignedUrl(ruta, segundos);
  return data?.signedUrl ?? null;
}

/** Perfil público por PET ID (vista mascotas_publico). Nunca incluye datos del propietario. */
export async function obtenerMascotaPublica(petId: string): Promise<MascotaPublica | null> {
  if (esDemo()) return mascotaDemo(petId);
  if (!hayBackend()) throw new SinBackend();
  const { data, error } = await supabaseServicio()
    .from("mascotas_publico")
    .select("pet_id, nombre, especie, raza, sexo, color, estado, foto_principal, distrito_perdida, fecha_perdida, mensaje_perdida")
    .eq("pet_id", petId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    pet_id: data.pet_id, nombre: data.nombre, especie: data.especie, raza: data.raza, sexo: data.sexo, color: data.color,
    estado: data.estado, foto_url: await firmarFoto(data.foto_principal),
    distrito_perdida: data.distrito_perdida, fecha_perdida: data.fecha_perdida, mensaje_perdida: data.mensaje_perdida,
  };
}

type FilaCert = {
  codigo: string; emitido_at: string;
  mascotas: { pet_id: string; nombre: string; especie: Especie; estado: EstadoMascota } | null;
};

/** Verifica un certificado. Usa la función verificar_certificado(p_codigo) si existe; si no, consulta las tablas. */
export async function verificarCertificado(codigo: string): Promise<VerificacionCertificado> {
  if (esDemo()) return verificacionDemo(codigo);
  if (!hayBackend()) throw new SinBackend();
  const sb = supabaseServicio();

  const rpc = await sb.rpc("verificar_certificado", { p_codigo: codigo });
  if (!rpc.error) {
    const r = Array.isArray(rpc.data) ? rpc.data[0] : rpc.data;
    if (!r) return { valido: false, codigo };
    return {
      valido: r.valido ?? true, codigo,
      pet_id: r.pet_id, nombre: r.nombre, especie: r.especie, estado: r.estado, emitido_at: r.emitido_at,
    };
  }

  const { data, error } = await sb
    .from("certificados")
    .select("codigo, emitido_at, mascotas(pet_id, nombre, especie, estado)")
    .eq("codigo", codigo)
    .maybeSingle<FilaCert>();
  if (error) throw error;
  if (!data || !data.mascotas) return { valido: false, codigo };
  const m = data.mascotas;
  return { valido: true, codigo, pet_id: m.pet_id, nombre: m.nombre, especie: m.especie, estado: m.estado, emitido_at: data.emitido_at };
}
