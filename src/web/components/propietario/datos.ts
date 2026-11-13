// Acceso a datos del propietario desde el navegador: Supabase con RLS, o modo demo en memoria.
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Mascota, RegistroSalud, ReportePerdida, TipoFoto, TipoRegistroSalud } from "@/lib/contratos";
import { BUCKET_DOCUMENTOS, BUCKET_FOTOS, supabaseNavegador } from "@/lib/supabase";
import {
  DEMO_USUARIO, demoInicial, esDemo, type Certificado, type DemoDatos, type FotoVista, type Perfil,
} from "./demo";

export type { Certificado, FotoVista, Perfil };
export type Modo = "demo" | "supabase" | "sin-config";

export function modo(): Modo {
  if (esDemo()) return "demo";
  return process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "supabase" : "sin-config";
}

export class SinConfiguracion extends Error {
  constructor() { super("Faltan NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY."); }
}

let cliente: SupabaseClient | null = null;
function sb(): SupabaseClient {
  if (modo() !== "supabase") throw new SinConfiguracion();
  return (cliente ??= supabaseNavegador());
}

/* ---------- Modo demo ---------- */
const CLAVE_DEMO = "petid-demo-propietario-v1";
let demo: DemoDatos | null = null;
function D(): DemoDatos {
  if (demo) return demo;
  try {
    const r = typeof window !== "undefined" ? window.localStorage.getItem(CLAVE_DEMO) : null;
    demo = r ? (JSON.parse(r) as DemoDatos) : demoInicial();
  } catch { demo = demoInicial(); }
  return demo;
}
function guardarDemo() {
  try { window.localStorage.setItem(CLAVE_DEMO, JSON.stringify(D())); } catch {
    // Sin espacio: se guardan los datos sin las fotos subidas en esta sesión.
    try {
      const c = structuredClone(D());
      c.fotos.forEach((f) => { if (f.url && f.url.length > 60000) f.url = null; });
      window.localStorage.setItem(CLAVE_DEMO, JSON.stringify(c));
    } catch { /* sin almacenamiento local */ }
  }
}
export function reiniciarDemo() {
  demo = demoInicial();
  try { window.localStorage.removeItem(CLAVE_DEMO); } catch { /* nada */ }
}
const espera = (ms = 250) => new Promise((r) => setTimeout(r, ms));
const uuid = () => crypto.randomUUID();

function lanzar(error: { message: string; code?: string } | null) {
  if (!error) return;
  if (error.code === "23505") throw new Error("Ese documento ya está registrado en otra cuenta.");
  throw new Error(error.message);
}

/* ---------- Sesión y cuenta ---------- */
const PENDIENTE = "petid-registro-pendiente";
export interface Pendiente { celular: string; modo: "registro" | "ingreso"; perfil?: Omit<Perfil, "id" | "celular_verificado"> }

export function guardarPendiente(p: Pendiente) {
  try { sessionStorage.setItem(PENDIENTE, JSON.stringify(p)); } catch { /* nada */ }
}
export function leerPendiente(): Pendiente | null {
  try { const r = sessionStorage.getItem(PENDIENTE); return r ? (JSON.parse(r) as Pendiente) : null; } catch { return null; }
}
function borrarPendiente() { try { sessionStorage.removeItem(PENDIENTE); } catch { /* nada */ } }

const telefono = (celular: string) => "+51" + celular.replace(/\D/g, "");

/** Envía el código por SMS (Supabase Auth, proveedor de teléfono). */
export async function enviarCodigo(celular: string, crearUsuario: boolean) {
  if (modo() === "demo") return espera();
  const { error } = await sb().auth.signInWithOtp({ phone: telefono(celular), options: { shouldCreateUser: crearUsuario } });
  lanzar(error);
}

/** Verifica el código. Si hay un registro pendiente, crea el perfil. Devuelve a dónde ir. */
export async function verificarCodigo(codigo: string): Promise<string> {
  const p = leerPendiente();
  if (!p) throw new Error("Vuelve a ingresar tu celular para recibir un código nuevo.");
  if (modo() === "demo") {
    await espera();
    if (codigo !== "123456") throw new Error("El código no coincide. Revisa el SMS o pide uno nuevo.");
    if (p.perfil) { D().perfil = { ...D().perfil, ...p.perfil, celular: p.celular, celular_verificado: true }; guardarDemo(); }
    borrarPendiente();
    return p.modo === "registro" ? "/mascotas/nueva" : "/mis-mascotas";
  }
  const { data, error } = await sb().auth.verifyOtp({ phone: telefono(p.celular), token: codigo, type: "sms" });
  if (error) throw new Error("El código no coincide o ya venció. Revisa el SMS o pide uno nuevo.");
  const id = data.user?.id;
  if (!id) throw new Error("No se pudo iniciar la sesión.");
  if (p.perfil) {
    const ahora = new Date().toISOString();
    const { error: e2 } = await sb().from("perfiles").upsert({
      id, ...p.perfil, celular: p.celular, acepta_terminos_at: ahora, acepta_privacidad_at: ahora,
    });
    lanzar(e2);
    borrarPendiente();
    return "/mascotas/nueva";
  }
  borrarPendiente();
  const perfil = await obtenerPerfil();
  if (!perfil) return "/crear-cuenta";
  return perfil.rol === "admin" ? "/admin" : "/mis-mascotas";
}

/** Usuario de la sesión actual (null si no hay sesión). */
export async function usuarioActual(): Promise<string | null> {
  if (modo() === "demo") return DEMO_USUARIO;
  const { data } = await sb().auth.getUser();
  return data.user?.id ?? null;
}

export async function cerrarSesion() {
  if (modo() === "demo") return;
  await sb().auth.signOut();
}

export async function obtenerPerfil(): Promise<Perfil | null> {
  if (modo() === "demo") return D().perfil;
  const id = await usuarioActual();
  if (!id) return null;
  const { data, error } = await sb().from("perfiles").select("*").eq("id", id).maybeSingle();
  lanzar(error);
  return data as Perfil | null;
}

export async function actualizarPerfil(c: Pick<Perfil, "nombres" | "apellidos" | "correo" | "departamento" | "provincia" | "distrito">) {
  if (modo() === "demo") { await espera(); Object.assign(D().perfil, c); guardarDemo(); return; }
  const id = await usuarioActual();
  const { error } = await sb().from("perfiles").update(c).eq("id", id);
  lanzar(error);
}

/* ---------- Mascotas y fotos ---------- */
export type MascotaVista = Mascota & { foto_url: string | null; fotos: FotoVista[] };

async function firmar(rutas: string[]): Promise<Record<string, string>> {
  if (!rutas.length) return {};
  const { data } = await sb().storage.from(BUCKET_FOTOS).createSignedUrls(rutas, 3600);
  const r: Record<string, string> = {};
  (data ?? []).forEach((x) => { if (x.path && x.signedUrl) r[x.path] = x.signedUrl; });
  return r;
}

function armar(m: Mascota, fotos: FotoVista[]): MascotaVista {
  const propias = fotos.filter((f) => f.mascota_id === m.id);
  const principal = propias.find((f) => f.id === m.foto_principal_id) ?? propias.find((f) => f.tipo === "frente") ?? propias[0];
  return { ...m, fotos: propias, foto_url: principal?.url ?? null };
}

async function fotosDe(ids: string[]): Promise<FotoVista[]> {
  if (!ids.length) return [];
  const { data, error } = await sb().from("fotos").select("*").in("mascota_id", ids).order("creado_at", { ascending: true });
  lanzar(error);
  const filas = (data ?? []) as FotoVista[];
  const urls = await firmar(filas.map((f) => f.ruta_storage));
  return filas.map((f) => ({ ...f, url: urls[f.ruta_storage] ?? null }));
}

export async function listarMascotas(): Promise<MascotaVista[]> {
  if (modo() === "demo") { await espera(120); const d = D(); return d.mascotas.map((m) => armar(m, d.fotos)); }
  const id = await usuarioActual();
  const { data, error } = await sb().from("mascotas").select("*").eq("propietario_id", id).order("creado_at");
  lanzar(error);
  const ms = (data ?? []) as Mascota[];
  const fotos = await fotosDe(ms.map((m) => m.id));
  return ms.map((m) => armar(m, fotos));
}

export async function obtenerMascota(id: string): Promise<MascotaVista> {
  if (modo() === "demo") {
    await espera(80);
    const m = D().mascotas.find((x) => x.id === id);
    if (!m) throw new Error("No encontramos esa mascota en tu cuenta.");
    return armar(m, D().fotos);
  }
  const { data, error } = await sb().from("mascotas").select("*").eq("id", id).maybeSingle();
  lanzar(error);
  if (!data) throw new Error("No encontramos esa mascota en tu cuenta.");
  return armar(data as Mascota, await fotosDe([id]));
}

export type MascotaNueva = Pick<Mascota,
  "nombre" | "especie" | "raza" | "sexo" | "fecha_nacimiento" | "fecha_nacimiento_estimada" | "color" | "senas" | "microchip" | "esterilizado">;

export async function crearMascota(n: MascotaNueva): Promise<string> {
  if (modo() === "demo") {
    await espera();
    const d = D(), num = 125 + d.mascotas.length;
    const m: Mascota = {
      ...n, id: uuid(), pet_id: "PE-" + String(num).padStart(8, "0"), propietario_id: DEMO_USUARIO, estado: "activa",
      lista_para_busqueda: false, foto_principal_id: null, creado_at: new Date().toISOString(),
    };
    d.mascotas.push(m); guardarDemo();
    return m.id;
  }
  const propietario_id = await usuarioActual();
  const { data, error } = await sb().from("mascotas").insert({ ...n, propietario_id }).select("id").single();
  lanzar(error);
  return (data as { id: string }).id;
}

/** Sube una toma al bucket 'fotos' en {mascota_id}/{foto_id}.jpg y la registra. Reemplaza la anterior del mismo tipo. */
export async function subirFoto(mascota: MascotaVista, tipo: TipoFoto, jpg: Blob): Promise<void> {
  const anterior = mascota.fotos.find((f) => f.tipo === tipo);
  const id = uuid(), ruta = `${mascota.id}/${id}.jpg`;
  if (modo() === "demo") {
    await espera(600);
    const d = D();
    const url = await new Promise<string>((res) => { const fr = new FileReader(); fr.onload = () => res(String(fr.result)); fr.readAsDataURL(jpg); });
    d.fotos = d.fotos.filter((f) => !(f.mascota_id === mascota.id && f.tipo === tipo));
    d.fotos.push({ id, mascota_id: mascota.id, hallazgo_id: null, tipo, ruta_storage: ruta, estado: "pendiente", motivo_rechazo: null, calidad: null, url });
    const m = d.mascotas.find((x) => x.id === mascota.id);
    if (m && (tipo === "frente" || !m.foto_principal_id)) m.foto_principal_id = id;
    guardarDemo();
    return;
  }
  const up = await sb().storage.from(BUCKET_FOTOS).upload(ruta, jpg, { contentType: "image/jpeg", upsert: false });
  if (up.error) throw new Error("No se pudo subir la foto: " + up.error.message);
  const { error } = await sb().from("fotos").insert({ id, mascota_id: mascota.id, tipo, ruta_storage: ruta });
  lanzar(error);
  if (tipo === "frente" || !mascota.foto_principal_id) {
    await sb().from("mascotas").update({ foto_principal_id: id }).eq("id", mascota.id);
  }
  if (anterior) await quitarFoto(anterior);
}

export async function quitarFoto(f: FotoVista): Promise<void> {
  if (modo() === "demo") {
    const d = D();
    d.fotos = d.fotos.filter((x) => x.id !== f.id);
    d.mascotas.forEach((m) => { if (m.foto_principal_id === f.id) m.foto_principal_id = null; });
    guardarDemo();
    return;
  }
  const { error } = await sb().from("fotos").delete().eq("id", f.id);
  lanzar(error);
  await sb().storage.from(BUCKET_FOTOS).remove([f.ruta_storage]);
}

/* ---------- Salud ---------- */
export type RegistroSaludVista = RegistroSalud & { adjunto_url: string | null };

export async function listarSalud(mascotaId: string): Promise<RegistroSaludVista[]> {
  if (modo() === "demo") {
    await espera(80);
    return D().salud.filter((s) => s.mascota_id === mascotaId)
      .sort((a, b) => b.fecha.localeCompare(a.fecha)).map((s) => ({ ...s, adjunto_url: s.ruta_adjunto }));
  }
  const { data, error } = await sb().from("registros_salud").select("*").eq("mascota_id", mascotaId).order("fecha", { ascending: false });
  lanzar(error);
  const filas = (data ?? []) as RegistroSalud[];
  const rutas = filas.map((f) => f.ruta_adjunto).filter((r): r is string => !!r);
  const urls: Record<string, string> = {};
  if (rutas.length) {
    const { data: s } = await sb().storage.from(BUCKET_DOCUMENTOS).createSignedUrls(rutas, 3600);
    (s ?? []).forEach((x) => { if (x.path && x.signedUrl) urls[x.path] = x.signedUrl; });
  }
  return filas.map((f) => ({ ...f, adjunto_url: f.ruta_adjunto ? urls[f.ruta_adjunto] ?? null : null }));
}

export interface SaludNuevo {
  tipo: TipoRegistroSalud; nombre: string; fecha: string; proxima_fecha: string | null; notas: string | null;
}

export async function crearSalud(mascotaId: string, n: SaludNuevo, adjunto: Blob | null): Promise<void> {
  const id = uuid();
  if (modo() === "demo") {
    await espera();
    let ruta: string | null = null;
    if (adjunto) ruta = await new Promise<string>((res) => { const fr = new FileReader(); fr.onload = () => res(String(fr.result)); fr.readAsDataURL(adjunto); });
    D().salud.push({ id, mascota_id: mascotaId, ...n, ruta_adjunto: ruta, declarado_por_propietario: true });
    guardarDemo();
    return;
  }
  let ruta_adjunto: string | null = null;
  if (adjunto) {
    ruta_adjunto = `${mascotaId}/salud/${id}.jpg`;
    const up = await sb().storage.from(BUCKET_DOCUMENTOS).upload(ruta_adjunto, adjunto, { contentType: "image/jpeg" });
    if (up.error) throw new Error("No se pudo subir la foto del carné: " + up.error.message);
  }
  const { error } = await sb().from("registros_salud").insert({ id, mascota_id: mascotaId, ...n, ruta_adjunto, declarado_por_propietario: true });
  lanzar(error);
}

/* ---------- Extravío ---------- */
export async function reporteActivo(mascotaId: string): Promise<ReportePerdida | null> {
  if (modo() === "demo") return D().reportes.find((r) => r.mascota_id === mascotaId && r.activo) ?? null;
  const { data, error } = await sb().from("reportes_perdida").select("*").eq("mascota_id", mascotaId).eq("activo", true)
    .order("creado_at", { ascending: false }).limit(1).maybeSingle();
  lanzar(error);
  return data as ReportePerdida | null;
}

export interface ReporteNuevo { fecha_perdida: string; distrito: string; ubigeo?: string | null; referencia: string | null; mensaje: string | null }

export async function reportarPerdida(mascotaId: string, n: ReporteNuevo): Promise<void> {
  const previo = await reporteActivo(mascotaId);
  if (modo() === "demo") {
    await espera();
    const d = D();
    if (previo) Object.assign(previo, n);
    else d.reportes.push({ id: uuid(), mascota_id: mascotaId, ...n, lat: null, lng: null, activo: true });
    const m = d.mascotas.find((x) => x.id === mascotaId); if (m) m.estado = "extraviada";
    guardarDemo();
    return;
  }
  const r = previo
    ? await sb().from("reportes_perdida").update(n).eq("id", previo.id)
    : await sb().from("reportes_perdida").insert({ mascota_id: mascotaId, ...n });
  lanzar(r.error);
  const { error } = await sb().from("mascotas").update({ estado: "extraviada" }).eq("id", mascotaId);
  lanzar(error);
}

export async function marcarEncontrada(mascotaId: string): Promise<void> {
  if (modo() === "demo") {
    await espera();
    const d = D();
    d.reportes.forEach((r) => { if (r.mascota_id === mascotaId) r.activo = false; });
    const m = d.mascotas.find((x) => x.id === mascotaId); if (m) m.estado = "encontrada";
    guardarDemo();
    return;
  }
  const r = await sb().from("reportes_perdida").update({ activo: false, cerrado_at: new Date().toISOString() })
    .eq("mascota_id", mascotaId).eq("activo", true);
  lanzar(r.error);
  const { error } = await sb().from("mascotas").update({ estado: "encontrada" }).eq("id", mascotaId);
  lanzar(error);
}

/* ---------- Certificado ---------- */
export async function obtenerCertificado(mascotaId: string): Promise<Certificado | null> {
  if (modo() === "demo") return D().certificados.find((c) => c.mascota_id === mascotaId) ?? null;
  const { data, error } = await sb().from("certificados").select("codigo, emitido_at").eq("mascota_id", mascotaId)
    .order("emitido_at", { ascending: false }).limit(1).maybeSingle();
  lanzar(error);
  return data as Certificado | null;
}
