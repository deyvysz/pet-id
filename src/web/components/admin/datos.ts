// Sesión y datos del panel de administración. Solo servidor.
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { Especie, EstadoMascota } from "@/lib/contratos";
import { supabaseServicio } from "@/lib/supabase";
import { ADMIN_DEMO, esDemo } from "@/components/publico/demo";
import { firmarFoto, hayBackend } from "@/components/publico/servidor";

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

// ---- Listados y ficha (pantallas /admin/reportes, /admin/mascotas, /admin/usuarios) ----

export type FilaMascota = DatosAdmin["mascotas"][number];
export type FilaUsuario = { id: string; nombre: string; distrito: string; rol: string; creado_at: string; celular_verificado: boolean; mascotas: number };
export type FilaReporte = DatosAdmin["reportes"][number] & { referencia: string | null };

const LIMITE = 200;

export async function listarReportes(): Promise<FilaReporte[]> {
  if (esDemo()) return ADMIN_DEMO.reportes.map((r) => ({ ...r, referencia: null }));
  const { data } = await supabaseServicio().from("reportes_perdida")
    .select("distrito, referencia, fecha_perdida, mascotas(pet_id, nombre)").eq("activo", true)
    .order("fecha_perdida", { ascending: false }).limit(LIMITE);
  type F = { distrito: string; referencia: string | null; fecha_perdida: string; mascotas: { pet_id: string; nombre: string } | null };
  return ((data ?? []) as unknown as F[]).filter((r) => r.mascotas)
    .map((r) => ({ pet_id: r.mascotas!.pet_id, nombre: r.mascotas!.nombre, distrito: r.distrito, fecha: r.fecha_perdida, referencia: r.referencia }));
}

export async function listarMascotas(q: string, estado: string): Promise<FilaMascota[]> {
  const texto = q.trim();
  if (esDemo()) {
    return ADMIN_DEMO.mascotas.filter((m) =>
      (!estado || m.estado === estado) &&
      (!texto || m.nombre.toLowerCase().includes(texto.toLowerCase()) || m.pet_id.includes(texto.toUpperCase())));
  }
  let c = supabaseServicio().from("mascotas").select("pet_id, nombre, especie, estado, creado_at")
    .order("creado_at", { ascending: false }).limit(LIMITE);
  if (estado) c = c.eq("estado", estado);
  if (texto) {
    const limpio = texto.replace(/[%,()]/g, "");
    c = c.or(`nombre.ilike.%${limpio}%,pet_id.ilike.%${limpio.toUpperCase()}%`);
  }
  const { data } = await c;
  return (data ?? []) as FilaMascota[];
}

export async function listarUsuarios(): Promise<FilaUsuario[]> {
  if (esDemo()) return ADMIN_DEMO.usuarios.map((u, i) => ({ ...u, id: `demo-${i}`, celular_verificado: true, mascotas: u.rol === "admin" ? 0 : 1 }));
  const sb = supabaseServicio();
  const [{ data: per }, { data: mas }] = await Promise.all([
    sb.from("perfiles").select("id, nombres, apellidos, distrito, rol, creado_at, celular_verificado").order("creado_at", { ascending: false }).limit(LIMITE),
    sb.from("mascotas").select("propietario_id").limit(5000),
  ]);
  const cuenta = new Map<string, number>();
  for (const m of (mas ?? []) as { propietario_id: string }[]) cuenta.set(m.propietario_id, (cuenta.get(m.propietario_id) ?? 0) + 1);
  type P = { id: string; nombres: string; apellidos: string; distrito: string; rol: string; creado_at: string; celular_verificado: boolean };
  return ((per ?? []) as P[]).map((u) => ({
    id: u.id, nombre: `${u.nombres} ${u.apellidos}`, distrito: u.distrito, rol: u.rol, creado_at: u.creado_at,
    celular_verificado: u.celular_verificado, mascotas: cuenta.get(u.id) ?? 0,
  }));
}

export type FichaMascota = {
  pet_id: string; nombre: string; especie: Especie; raza: string; sexo: string; color: string; estado: EstadoMascota;
  fecha_nacimiento: string; microchip: string | null; lista_para_busqueda: boolean; creado_at: string; foto_url: string | null;
  propietario: { nombre: string; celular: string; correo: string | null; distrito: string } | null;
  fotos: { tipo: string; estado: string; motivo_rechazo: string | null }[];
  reportes: { distrito: string; referencia: string | null; fecha_perdida: string; activo: boolean; cerrado_at: string | null }[];
  mensajes: { nombre: string; mensaje: string; celular: string | null; correo: string | null; creado_at: string }[];
  historial: { accion: string; creado_at: string }[];
  certificado: string | null;
};

export async function fichaMascota(petId: string): Promise<FichaMascota | null> {
  if (esDemo()) {
    const m = ADMIN_DEMO.mascotas.find((x) => x.pet_id === petId);
    if (!m) return null;
    return {
      ...m, raza: m.especie === "perro" ? "Golden retriever" : "Mestizo", sexo: "macho", color: "Dorado", fecha_nacimiento: "2022-03-14",
      microchip: null, lista_para_busqueda: true, foto_url: null,
      propietario: { nombre: "Ana Pérez", celular: "987654321", correo: "ana.perez@example.com", distrito: "Miraflores" },
      fotos: [{ tipo: "frente", estado: "lista", motivo_rechazo: null }], reportes: [], mensajes: [], historial: [{ accion: "registro", creado_at: m.creado_at }],
      certificado: "PID-7Q4K-92XM",
    };
  }
  const sb = supabaseServicio();
  const { data: m } = await sb.from("mascotas")
    .select("id, pet_id, nombre, especie, raza, sexo, color, estado, fecha_nacimiento, microchip, lista_para_busqueda, creado_at, propietario_id, fotos!mascotas_foto_principal_fk(ruta_storage)")
    .eq("pet_id", petId).maybeSingle();
  if (!m) return null;
  const id = m.id as string;
  const [prop, fot, rep, men, his, cer] = await Promise.all([
    sb.from("perfiles").select("nombres, apellidos, celular, correo, distrito").eq("id", m.propietario_id).maybeSingle(),
    sb.from("fotos").select("tipo, estado, motivo_rechazo").eq("mascota_id", id).order("creado_at"),
    sb.from("reportes_perdida").select("distrito, referencia, fecha_perdida, activo, cerrado_at").eq("mascota_id", id).order("fecha_perdida", { ascending: false }),
    sb.from("mensajes_contacto").select("nombre, mensaje, celular, correo, creado_at").eq("mascota_id", id).order("creado_at", { ascending: false }).limit(50),
    sb.from("historial").select("accion, creado_at").eq("mascota_id", id).order("creado_at", { ascending: false }).limit(50),
    sb.from("certificados").select("codigo").eq("mascota_id", id).order("emitido_at", { ascending: false }).limit(1).maybeSingle(),
  ]);
  const p = prop.data as { nombres: string; apellidos: string; celular: string; correo: string | null; distrito: string } | null;
  const principal = (m as unknown as { fotos: { ruta_storage: string } | null }).fotos;
  return {
    pet_id: m.pet_id, nombre: m.nombre, especie: m.especie, raza: m.raza, sexo: m.sexo, color: m.color, estado: m.estado,
    fecha_nacimiento: m.fecha_nacimiento, microchip: m.microchip, lista_para_busqueda: m.lista_para_busqueda, creado_at: m.creado_at,
    foto_url: principal ? await firmarFoto(principal.ruta_storage) : null,
    propietario: p ? { nombre: `${p.nombres} ${p.apellidos}`, celular: p.celular, correo: p.correo, distrito: p.distrito } : null,
    fotos: (fot.data ?? []) as FichaMascota["fotos"],
    reportes: (rep.data ?? []) as FichaMascota["reportes"],
    mensajes: (men.data ?? []) as FichaMascota["mensajes"],
    historial: (his.data ?? []) as FichaMascota["historial"],
    certificado: (cer.data as { codigo: string } | null)?.codigo ?? null,
  };
}
