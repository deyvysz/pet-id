// POST /api/v1/contacto: mensaje de quien encontró la mascota hacia su familia.
// Guarda en mensajes_contacto y envía un correo al propietario con Resend. Sin RESEND_API_KEY solo guarda y lo anota en consola.
import type { ContactoEntrada } from "@/lib/contratos";
import { supabaseServicio } from "@/lib/supabase";
import { error, limitar, ok, texto } from "@/components/publico/api";
import { esDemo } from "@/components/publico/demo";
import { RE_PET_ID } from "@/components/publico/formato";
import { hayBackend } from "@/components/publico/servidor";

export const dynamic = "force-dynamic";

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

async function enviarCorreo(para: string, nombreMascota: string, petId: string, e: ContactoEntrada) {
  const clave = process.env.RESEND_API_KEY;
  if (!clave) {
    console.log(`[contacto] Sin RESEND_API_KEY: mensaje para la familia de ${petId} guardado, correo no enviado.`);
    return false;
  }
  const lineas = [
    `<p>${esc(e.nombre)} escribió sobre ${esc(nombreMascota)} (PET ID ${esc(petId)}):</p>`,
    `<blockquote style="border-left:3px solid #1FB5A3;margin:0;padding:8px 12px">${esc(e.mensaje).replace(/\n/g, "<br>")}</blockquote>`,
    e.celular ? `<p>Teléfono: <strong>${esc(e.celular)}</strong></p>` : "",
    e.correo ? `<p>Correo: <strong>${esc(e.correo)}</strong></p>` : "",
    !e.celular && !e.correo ? "<p>No dejó teléfono ni correo.</p>" : "",
    "<p style=\"color:#4D5E74;font-size:13px\">Antes de entregar datos o dinero, confirma que la persona tiene a tu mascota. PET ID no pide pagos por avisos.</p>",
  ];
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${clave}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: process.env.RESEND_FROM || "PET ID <onboarding@resend.dev>",
      to: [para],
      subject: `Mensaje sobre ${nombreMascota}`,
      html: lineas.join(""),
      ...(e.correo ? { reply_to: e.correo } : {}),
    }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!r.ok) {
    console.error("[contacto] Resend respondió", r.status, await r.text().catch(() => ""));
    return false;
  }
  return true;
}

export async function POST(req: Request) {
  if (!limitar(req, "contacto", 5, 10 * 60_000)) return error(429, "Enviaste varios mensajes seguidos. Espera unos minutos.");
  let b: Record<string, unknown>;
  try { b = await req.json(); } catch { return error(400, "Envía los datos en JSON."); }

  // Trampa para robots: si llega lleno, se responde como enviado y no se guarda.
  if (texto(b.web, 200)) return ok({ enviado: true });

  const entrada: ContactoEntrada = {
    pet_id: texto(b.pet_id, 20).toUpperCase(),
    hallazgo_id: texto(b.hallazgo_id, 36) || undefined,
    nombre: texto(b.nombre, 80),
    celular: texto(b.celular, 20) || undefined,
    correo: texto(b.correo, 120) || undefined,
    mensaje: texto(b.mensaje, 1000),
  };
  if (!RE_PET_ID.test(entrada.pet_id)) return error(400, "El PET ID no es válido.");
  if (!entrada.nombre) return error(400, "Escribe tu nombre.");
  if (entrada.mensaje.length < 5) return error(400, "Escribe un mensaje.");
  if (entrada.celular && !/^\+?[\d\s-]{6,20}$/.test(entrada.celular)) return error(400, "El teléfono no es válido.");
  if (entrada.correo && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(entrada.correo)) return error(400, "El correo no es válido.");
  if (entrada.hallazgo_id && !/^[0-9a-f-]{36}$/i.test(entrada.hallazgo_id)) entrada.hallazgo_id = undefined;

  if (esDemo()) {
    console.log(`[contacto] Modo demo: mensaje para ${entrada.pet_id} no guardado.`);
    return ok({ enviado: true });
  }
  if (!hayBackend()) return error(503, "Servicio no disponible.");

  const sb = supabaseServicio();
  try {
    const { data: m, error: em } = await sb.from("mascotas")
      .select("id, nombre, propietario_id, estado").eq("pet_id", entrada.pet_id).maybeSingle();
    if (em) throw em;
    if (!m || m.estado === "fallecida") return error(404, "No hay una mascota con ese PET ID.");

    const { data: fila, error: ei } = await sb.from("mensajes_contacto").insert({
      mascota_id: m.id, hallazgo_id: entrada.hallazgo_id ?? null, nombre: entrada.nombre,
      celular: entrada.celular ?? null, correo: entrada.correo ?? null, mensaje: entrada.mensaje,
    }).select("id").single();
    if (ei) throw ei;

    const { data: u } = await sb.auth.admin.getUserById(m.propietario_id);
    const para = u?.user?.email;
    let enviado = false;
    if (para) {
      try { enviado = await enviarCorreo(para, m.nombre, entrada.pet_id, entrada); } catch (e) { console.error("[contacto] correo", e); }
    } else {
      console.log(`[contacto] El propietario de ${entrada.pet_id} no tiene correo registrado.`);
    }
    if (enviado) await sb.from("mensajes_contacto").update({ enviado_at: new Date().toISOString() }).eq("id", fila.id);
    return ok({ enviado: true }, 201);
  } catch (e) {
    console.error("contacto", e);
    return error(500, "No pudimos enviar tu mensaje. Vuelve a intentarlo.");
  }
}
