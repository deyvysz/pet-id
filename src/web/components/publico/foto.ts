// Preparación de la foto del hallazgo en el navegador: revisa tamaño, luz y enfoque, y la vuelve a codificar en JPEG.
// Redibujar en canvas quita los metadatos EXIF (incluido el GPS).
import type { HallazgoRespuesta } from "@/lib/contratos";

export const MAX_BYTES = 8 * 1024 * 1024;
const LADO_MAX = 1600;

export type FotoPreparada = { archivo: Blob; vista: string; observaciones: string[] };

function cargar(file: File): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); res(img); };
    img.onerror = () => { URL.revokeObjectURL(url); rej(new Error("No pudimos leer la foto. Usa una foto JPG o PNG.")); };
    img.src = url;
  });
}

export async function prepararFoto(file: File): Promise<FotoPreparada> {
  if (!file.type.startsWith("image/")) throw new Error("El archivo no es una imagen.");
  if (file.size > MAX_BYTES) throw new Error("La foto pesa más de 8 MB. Elige otra o tómala con menos resolución.");
  const img = await cargar(file);
  const w = img.naturalWidth, h = img.naturalHeight;
  const observaciones: string[] = [];
  if (Math.min(w, h) < 600) observaciones.push("Es pequeña (menos de 600 px de lado). Acércate más o usa la cámara en lugar de una captura de pantalla.");

  // Luz y enfoque sobre una versión de 320 px de ancho.
  const W = 320, H = Math.max(3, Math.round((h * W) / w));
  const g = document.createElement("canvas"); g.width = W; g.height = H;
  const gx = g.getContext("2d", { willReadFrequently: true })!;
  gx.drawImage(img, 0, 0, W, H);
  const d = gx.getImageData(0, 0, W, H).data;
  const L = new Float32Array(W * H);
  let suma = 0;
  for (let i = 0; i < W * H; i++) { const v = 0.299 * d[i * 4] + 0.587 * d[i * 4 + 1] + 0.114 * d[i * 4 + 2]; L[i] = v; suma += v; }
  const media = suma / (W * H);
  if (media < 55) observaciones.push("Está oscura. Tómala con luz de día y sin flash.");
  else if (media > 215) observaciones.push("Está muy clara o tiene reflejo. Evita el sol directo y el flash.");
  let n = 0, s1 = 0, s2 = 0;
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
    const i = y * W + x; const lap = L[i - 1] + L[i + 1] + L[i - W] + L[i + W] - 4 * L[i]; s1 += lap; s2 += lap * lap; n++;
  }
  const varianza = n ? s2 / n - (s1 / n) * (s1 / n) : 0;
  if (varianza < 30) observaciones.push("Parece movida o desenfocada. Sostén el teléfono quieto y toca la pantalla sobre la mascota para enfocar.");

  const esc = Math.min(1, LADO_MAX / Math.max(w, h));
  const c = document.createElement("canvas"); c.width = Math.round(w * esc); c.height = Math.round(h * esc);
  c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
  const archivo = await new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error("No pudimos preparar la foto."))), "image/jpeg", 0.88));

  const ev = Math.min(1, 480 / Math.max(w, h));
  const v = document.createElement("canvas"); v.width = Math.round(w * ev); v.height = Math.round(h * ev);
  v.getContext("2d")!.drawImage(img, 0, 0, v.width, v.height);
  return { archivo, vista: v.toDataURL("image/jpeg", 0.8), observaciones };
}

// Resultado de la última búsqueda, guardado en sessionStorage para la pantalla de resultados.
const CLAVE = "petid-hallazgo";
export type BusquedaGuardada = { respuesta: HallazgoRespuesta; vista: string | null; especie?: string; distrito?: string };

export function guardarBusqueda(b: BusquedaGuardada) {
  try { sessionStorage.setItem(CLAVE, JSON.stringify(b)); } catch {
    try { sessionStorage.setItem(CLAVE, JSON.stringify({ ...b, vista: null })); } catch { /* sin almacenamiento */ }
  }
}
export function leerBusqueda(): BusquedaGuardada | null {
  try { const r = sessionStorage.getItem(CLAVE); return r ? (JSON.parse(r) as BusquedaGuardada) : null; } catch { return null; }
}
