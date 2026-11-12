// POST /api/v1/hallazgos (multipart): foto del hallazgo + especie, distrito, color y contacto opcionales.
// Guarda el hallazgo y la foto, pide los vectores al servicio de reconocimiento, busca parecidos y responde HallazgoRespuesta.
import {
  UMBRAL_CANDIDATO, type Candidato, type EmbedEntrada, type EmbedSalida, type Especie, type EstadoMascota,
  type HallazgoRespuesta, type SearchEntrada, type SearchSalida,
} from "@/lib/contratos";
import { BUCKET_FOTOS, supabaseServicio } from "@/lib/supabase";
import { error, limitar, ok, texto } from "@/components/publico/api";
import { CANDIDATOS_DEMO, esDemo } from "@/components/publico/demo";
import { firmarFoto, hayBackend } from "@/components/publico/servidor";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_BYTES = 8 * 1024 * 1024;
const TIPOS = ["image/jpeg", "image/png", "image/webp"];
const LIMITE = 5;

async function llamar<T>(ruta: string, cuerpo: unknown): Promise<T> {
  const base = process.env.RECONOCIMIENTO_URL!.replace(/\/$/, "");
  const r = await fetch(`${base}${ruta}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(cuerpo),
    signal: AbortSignal.timeout(45_000),
  });
  if (!r.ok) throw new Error(`reconocimiento ${ruta} respondió ${r.status}`);
  return (await r.json()) as T;
}

export async function POST(req: Request) {
  if (!limitar(req, "hallazgos", 10, 10 * 60_000)) return error(429, "Hiciste muchas búsquedas seguidas. Espera unos minutos.");
  const largo = Number(req.headers.get("content-length") ?? 0);
  if (largo > MAX_BYTES + 64 * 1024) return error(413, "La foto pesa más de 8 MB.");

  let fd: FormData;
  try { fd = await req.formData(); } catch { return error(400, "Envía la foto como multipart/form-data."); }

  const foto = fd.get("foto");
  if (!(foto instanceof Blob) || foto.size === 0) return error(400, "Falta la foto.");
  if (foto.size > MAX_BYTES) return error(413, "La foto pesa más de 8 MB.");
  if (!TIPOS.includes(foto.type)) return error(415, "La foto debe ser JPG, PNG o WebP.");

  const especieIn = texto(fd.get("especie"), 10);
  const especie: Especie | null = especieIn === "perro" || especieIn === "gato" ? especieIn : null;
  const distrito = texto(fd.get("distrito"), 60) || null;
  const color = texto(fd.get("color"), 40) || null;
  const nombre = texto(fd.get("nombre"), 80) || null;
  const celular = texto(fd.get("celular"), 20) || null;
  const correo = texto(fd.get("correo"), 120) || null;
  if (celular && !/^\+?[\d\s-]{6,20}$/.test(celular)) return error(400, "El teléfono no es válido.");
  if (correo && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) return error(400, "El correo no es válido.");

  if (esDemo()) {
    await new Promise((r) => setTimeout(r, 900));
    const respuesta: HallazgoRespuesta = {
      hallazgo_id: crypto.randomUUID(), detectado: true,
      candidatos: especie === "gato" ? [] : CANDIDATOS_DEMO,
    };
    return ok(respuesta);
  }
  if (!hayBackend() || !process.env.RECONOCIMIENTO_URL) return error(503, "La búsqueda por foto no está disponible en este momento.");

  const sb = supabaseServicio();
  try {
    const { data: h, error: eh } = await sb.from("hallazgos")
      .insert({ especie, distrito, color, nombre_contacto: nombre, celular_contacto: celular, correo_contacto: correo })
      .select("id").single();
    if (eh) throw eh;
    const hallazgoId: string = h.id;
    const fotoId = crypto.randomUUID();
    const ruta = `hallazgos/${hallazgoId}/${fotoId}.jpg`;

    const { error: es } = await sb.storage.from(BUCKET_FOTOS)
      .upload(ruta, Buffer.from(await foto.arrayBuffer()), { contentType: foto.type, upsert: false });
    if (es) throw es;
    const { error: ef } = await sb.from("fotos")
      .insert({ id: fotoId, hallazgo_id: hallazgoId, tipo: "hallazgo", ruta_storage: ruta, estado: "procesando" });
    if (ef) throw ef;

    const url = await firmarFoto(ruta, 600);
    if (!url) throw new Error("no se pudo firmar la foto del hallazgo");
    const emb = await llamar<EmbedSalida>("/embed", { foto_id: fotoId, url, tipo: "hallazgo" } satisfies EmbedEntrada);

    if (!emb.detectado || !emb.vectores?.cuerpo) {
      await sb.from("fotos").update({ estado: "rechazada", motivo_rechazo: emb.motivo ?? "sin_mascota" }).eq("id", fotoId);
      return ok({ hallazgo_id: hallazgoId, detectado: false, motivo: emb.motivo ?? "sin_mascota", candidatos: [] } satisfies HallazgoRespuesta);
    }
    await sb.from("fotos").update({ estado: "lista", calidad: emb.calidad ?? null }).eq("id", fotoId);

    const esp = especie ?? emb.especie ?? null;
    if (!especie && esp) await sb.from("hallazgos").update({ especie: esp }).eq("id", hallazgoId);
    if (!esp) return ok({ hallazgo_id: hallazgoId, detectado: true, candidatos: [] } satisfies HallazgoRespuesta);

    const buscar = async (d: string | null) => {
      const entrada: SearchEntrada = {
        vectores: { rostro: emb.vectores!.rostro, cuerpo: emb.vectores!.cuerpo },
        filtros: { especie: esp, ...(d ? { distrito: d } : {}), solo_extraviadas: true },
        limite: LIMITE,
      };
      const s = await llamar<SearchSalida>("/search", entrada);
      return s.candidatos.filter((c) => c.puntaje >= UMBRAL_CANDIDATO);
    };
    // Primero en el distrito indicado; si no hay parecidos, en todas las zonas.
    let encontrados = await buscar(distrito);
    if (!encontrados.length && distrito) encontrados = await buscar(null);
    encontrados = encontrados.sort((a, b) => b.puntaje - a.puntaje).slice(0, LIMITE);

    const candidatos: Candidato[] = [];
    if (encontrados.length) {
      const ids = encontrados.map((c) => c.mascota_id);
      const fotoIds = encontrados.map((c) => c.foto_id).filter((x): x is string => !!x);
      const [{ data: ms }, { data: fs }] = await Promise.all([
        sb.from("mascotas").select("id, pet_id, nombre, estado, foto_principal_id").in("id", ids),
        sb.from("fotos").select("id, ruta_storage").in("id", fotoIds.length ? fotoIds : ["00000000-0000-0000-0000-000000000000"]),
      ]);
      const porId = new Map((ms ?? []).map((m: { id: string; pet_id: string; nombre: string; estado: EstadoMascota; foto_principal_id: string | null }) => [m.id, m]));
      const rutas = new Map((fs ?? []).map((f: { id: string; ruta_storage: string }) => [f.id, f.ruta_storage]));
      for (const c of encontrados) {
        const m = porId.get(c.mascota_id);
        if (!m) continue;
        candidatos.push({
          pet_id: m.pet_id, nombre: m.nombre, puntaje: Math.round(c.puntaje * 1000) / 1000, estado: m.estado,
          foto_url: await firmarFoto(c.foto_id ? rutas.get(c.foto_id) ?? null : null),
        });
      }
    }
    return ok({ hallazgo_id: hallazgoId, detectado: true, candidatos } satisfies HallazgoRespuesta);
  } catch (e) {
    console.error("hallazgos", e);
    return error(502, "No pudimos hacer la búsqueda. Vuelve a intentarlo en unos minutos.");
  }
}
