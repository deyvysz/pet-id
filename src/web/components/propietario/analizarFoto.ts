// Revisión de cada foto en el navegador antes de subirla: tamaño, luz y enfoque (función analyze() del prototipo).
// Redibujar en canvas quita los metadatos EXIF, incluido el GPS.

export interface Analisis {
  jpg: Blob;
  url: string; // object URL para la vista previa
  problemas: string[];
}

const LADO_MAX = 1600;

function cargar(file: File): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); res(img); };
    img.onerror = () => { URL.revokeObjectURL(url); rej(new Error("No se pudo abrir la imagen.")); };
    img.src = url;
  });
}

export async function analizarFoto(file: File): Promise<Analisis> {
  if (!file.type.startsWith("image/")) throw new Error("El archivo no es una imagen.");
  const img = await cargar(file);
  const problemas: string[] = [];
  const w = img.naturalWidth, h = img.naturalHeight;
  if (Math.min(w, h) < 600) problemas.push("Es pequeña (menos de 600 px de lado). Acércate más o usa la cámara en lugar de una captura de pantalla.");

  // Copia sin EXIF, reducida si hace falta.
  const sc = Math.min(1, LADO_MAX / Math.max(w, h));
  const c = document.createElement("canvas");
  c.width = Math.round(w * sc); c.height = Math.round(h * sc);
  c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
  const jpg = await new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error("No se pudo preparar la foto."))), "image/jpeg", 0.88));

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
  if (media < 55) problemas.push("Está oscura. Tómala con luz de día y sin flash.");
  else if (media > 215) problemas.push("Está muy clara o tiene reflejo. Evita el sol directo y el flash.");

  let n = 0, s1 = 0, s2 = 0;
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
    const i = y * W + x;
    const lap = L[i - 1] + L[i + 1] + L[i - W] + L[i + W] - 4 * L[i];
    s1 += lap; s2 += lap * lap; n++;
  }
  const varianza = n ? s2 / n - (s1 / n) * (s1 / n) : 0;
  if (varianza < 30) problemas.push("Parece movida o desenfocada. Sostén el teléfono quieto y toca la pantalla sobre la mascota para enfocar.");

  return { jpg, url: URL.createObjectURL(jpg), problemas };
}

/** Para el adjunto de salud: solo se reduce y se quita el EXIF. */
export async function prepararImagen(file: File): Promise<{ jpg: Blob; url: string }> {
  const a = await analizarFoto(file);
  return { jpg: a.jpg, url: a.url };
}
