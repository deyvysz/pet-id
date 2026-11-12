// Sesión y datos del panel de administración. Solo servidor.
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { Especie, EstadoMascota } from "@/lib/contratos";
import { supabaseServicio } from "@/lib/supabase";
import { ADMIN_DEMO, esDemo } from "@/components/publico/demo";
import { hayBackend } from "@/components/publico/servidor";

export type Acceso = "demo" | "sin_backend" | "sin_sesion" | "sin_permiso" | "admin";

/** Revisa la sesión de Supabase (cookies) y que el perfil tenga rol 'admin'. */
export async function revisarAcceso(): Promise<Acceso> {
  if (esDemo()) return "demo";
  if (!hayBackend() || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) return "sin_backend";
  const almacen = await cookies();
  const sb = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => almacen.getAll(),
      setAll: () => { /* un componente de servidor no puede escribir cookies; el middleware renueva la sesión */ },
    },
  });
  const { data } = await sb.auth.getUser();
  if (!data.user) return "sin_sesion";
  const { data: perfil } = await supabaseServicio().from("perfiles").select("rol").eq("id", data.user.id).maybeSingle();
  return perfil?.rol === "admin" ? "admin" : "sin_permiso";
}

export type DatosAdmin = {
  stats: { mascotas: number; listas: number; extravios: number; hallazgosSemana: number };
  reportes: { pet_id: string; nombre: string; distrito: string; fecha: string }[];
  mascotas: { pet_id: string; nombre: string; especie: Especie; estado: EstadoMascota; creado_at: string }[];
  usuarios: { nombre: string; distrito: string; rol: string; creado_at: string }[];
};

export async function obtenerDatosAdmin(): Promise<DatosAdmin> {
  if (esDemo()) return ADMIN_DEMO;
  const sb = supabaseServicio();
  const hace7 = new Date(Date.now() - 7 * 864e5).toISOString();
  const [m, l, e, h, rep, mas, usu] = await Promise.all([
    sb.from("mascotas").select("id", { count: "exact", head: true }),
    sb.from("mascotas").select("id", { count: "exact", head: true }).eq("lista_para_busqueda", true),
    sb.from("reportes_perdida").select("id", { count: "exact", head: true }).eq("activo", true),
    sb.from("hallazgos").select("id", { count: "exact", head: true }).gte("creado_at", hace7),
    sb.from("reportes_perdida").select("distrito, fecha_perdida, mascotas(pet_id, nombre)").eq("activo", true)
      .order("fecha_perdida", { ascending: false }).limit(20),
    sb.from("mascotas").select("pet_id, nombre, especie, estado, creado_at").order("creado_at", { ascending: false }).limit(10),
    sb.from("perfiles").select("nombres, apellidos, distrito, rol, creado_at").order("creado_at", { ascending: false }).limit(10),
  ]);
  type FilaRep = { distrito: string; fecha_perdida: string; mascotas: { pet_id: string; nombre: string } | null };
  return {
    stats: { mascotas: m.count ?? 0, listas: l.count ?? 0, extravios: e.count ?? 0, hallazgosSemana: h.count ?? 0 },
    reportes: ((rep.data ?? []) as unknown as FilaRep[]).filter((r) => r.mascotas)
      .map((r) => ({ pet_id: r.mascotas!.pet_id, nombre: r.mascotas!.nombre, distrito: r.distrito, fecha: r.fecha_perdida })),
    mascotas: (mas.data ?? []) as DatosAdmin["mascotas"],
    usuarios: ((usu.data ?? []) as { nombres: string; apellidos: string; distrito: string; rol: string; creado_at: string }[])
      .map((u) => ({ nombre: `${u.nombres} ${u.apellidos}`, distrito: u.distrito, rol: u.rol, creado_at: u.creado_at })),
  };
}
