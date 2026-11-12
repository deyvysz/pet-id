// PDF del certificado y del DNI de la mascota (pdf-lib). Solo servidor.
import {
  PDFDocument, StandardFonts, clip, endPath, popGraphicsState, pushGraphicsState, rectangle, rgb,
  type PDFFont, type PDFImage, type PDFPage,
} from "pdf-lib";
import QRCode from "qrcode";
import type { RegistroSalud } from "@/lib/contratos";
import type { DatosDocumento } from "./servidor";
import { ESPECIE_DNI, ESPECIE_TXT, ESTADO_TXT, SEXO_TXT, fecha, tituloSalud } from "./textos";

const C = {
  brand: rgb(13 / 255, 127 / 255, 118 / 255), ink: rgb(10 / 255, 35 / 255, 70 / 255), muted: rgb(77 / 255, 94 / 255, 116 / 255),
  line: rgb(211 / 255, 227 / 255, 225 / 255), mint: rgb(201 / 255, 238 / 255, 234 / 255), ok: rgb(18 / 255, 121 / 255, 90 / 255),
  blanco: rgb(1, 1, 1), sunk: rgb(242 / 255, 248 / 255, 247 / 255),
};

const LEYENDA_CERT = "El certificado acredita la inscripción en PET ID. No reemplaza documentos oficiales ni es por sí solo prueba definitiva de propiedad.";
const LEYENDA_DNI = "Credencial privada de registro en PET ID. No constituye documento oficial ni acreditación legal de propiedad.";

/** Las fuentes estándar usan WinAnsi: se reemplaza lo que no se puede codificar. */
const EXTRA = new Set("–—‘’“”…•€".split(""));
const limpio = (t: string) => Array.from(t.normalize("NFC")).map((ch) => {
  const c = ch.codePointAt(0)!;
  return (c >= 0x20 && c <= 0x7e) || (c >= 0xa0 && c <= 0xff) || EXTRA.has(ch) ? ch : c === 0x0a ? " " : "?";
}).join("");

function lineas(t: string, f: PDFFont, tam: number, ancho: number): string[] {
  const out: string[] = [];
  let cur = "";
  for (const p of limpio(t).split(/\s+/)) {
    const prueba = cur ? `${cur} ${p}` : p;
    if (f.widthOfTextAtSize(prueba, tam) > ancho && cur) { out.push(cur); cur = p; } else cur = prueba;
  }
  if (cur) out.push(cur);
  return out;
}

/** Escribe un párrafo y devuelve la y siguiente. */
function parrafo(pg: PDFPage, t: string, x: number, y: number, f: PDFFont, tam: number, ancho: number, color = C.ink, interlinea = 1.35) {
  for (const l of lineas(t, f, tam, ancho)) { pg.drawText(l, { x, y, size: tam, font: f, color }); y -= tam * interlinea; }
  return y;
}

function dibujarQr(pg: PDFPage, texto: string, x: number, y: number, lado: number) {
  const q = QRCode.create(texto, { errorCorrectionLevel: "M" });
  const n = q.modules.size, borde = 2, m = lado / (n + borde * 2);
  pg.drawRectangle({ x, y, width: lado, height: lado, color: C.blanco });
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
    if (q.modules.get(r, c)) pg.drawRectangle({ x: x + (c + borde) * m, y: y + lado - (r + borde + 1) * m, width: m + 0.01, height: m + 0.01, color: rgb(0.07, 0.07, 0.07) });
  }
}

function dibujarFoto(pg: PDFPage, img: PDFImage | null, x: number, y: number, w: number, h: number) {
  pg.drawRectangle({ x, y, width: w, height: h, color: C.mint });
  if (!img) return;
  // Recorte tipo "cover": se escala para llenar y se centra.
  const esc = Math.max(w / img.width, h / img.height);
  const iw = img.width * esc, ih = img.height * esc;
  pg.pushOperators(pushGraphicsState(), rectangle(x, y, w, h), clip(), endPath());
  pg.drawImage(img, { x: x + (w - iw) / 2, y: y + (h - ih) / 2, width: iw, height: ih });
  pg.pushOperators(popGraphicsState());
}

async function base(d: DatosDocumento) {
  const doc = await PDFDocument.create();
  const f = {
    r: await doc.embedFont(StandardFonts.Helvetica),
    b: await doc.embedFont(StandardFonts.HelveticaBold),
    m: await doc.embedFont(StandardFonts.CourierBold),
  };
  let img: PDFImage | null = null;
  if (d.foto) { try { img = await doc.embedJpg(d.foto); } catch { img = null; } }
  return { doc, f, img };
}

function resumenSalud(s: RegistroSalud[]): string[] {
  return s.slice(0, 4).map((e) => `${tituloSalud(e)}: ${fecha(e.fecha)}${e.proxima_fecha ? `, próxima ${fecha(e.proxima_fecha)}` : ""}.`);
}

/** Certificado de Registro e Identificación PET ID (A4). */
export async function pdfCertificado(d: DatosDocumento, sitio: string): Promise<Uint8Array> {
  const { doc, f, img } = await base(d);
  const m = d.mascota;
  doc.setTitle(`Certificado PET ID ${m.pet_id}`); doc.setAuthor("PET ID"); doc.setLanguage("es-PE");
  const pg = doc.addPage([595.28, 841.89]);
  const W = pg.getWidth(), X = 48, ancho = W - X * 2;

  pg.drawRectangle({ x: 0, y: 841.89 - 96, width: W, height: 96, color: C.brand });
  pg.drawText("PET ID", { x: X, y: 841.89 - 52, size: 26, font: f.b, color: C.blanco });
  pg.drawText(limpio("Certificado de Registro e Identificación"), { x: X, y: 841.89 - 78, size: 14, font: f.r, color: C.blanco });

  let y = 841.89 - 140;
  pg.drawText(limpio("N.° PET ID"), { x: X, y, size: 10, font: f.b, color: C.muted });
  y -= 24;
  pg.drawText(m.pet_id, { x: X, y, size: 24, font: f.m, color: C.ink });
  y -= 30;
  const esp = ESPECIE_TXT[m.especie].toLowerCase(), sx = SEXO_TXT[m.sexo].toLowerCase();
  y = parrafo(pg, `${m.nombre}, ${esp} ${sx}, quedó ${m.sexo === "hembra" ? "inscrita" : "inscrito"} en PET ID el ${fecha(m.creado_at)} a nombre de ${d.perfil.nombres} ${d.perfil.apellidos}.`, X, y, f.r, 12, ancho - 170);

  // Foto a la derecha
  const fw = 120, fh = 150, fx = W - X - fw, fy = 841.89 - 140 - fh + 10;
  dibujarFoto(pg, img, fx, fy, fw, fh);

  y = Math.min(y - 14, fy - 24);
  const filas: [string, string][] = [
    ["Nombre", m.nombre], ["Especie", ESPECIE_DNI[m.especie]], ["Raza", m.raza], ["Sexo", SEXO_TXT[m.sexo]],
    ["Fecha de nacimiento", fecha(m.fecha_nacimiento) + (m.fecha_nacimiento_estimada ? " (aproximada)" : "")],
    ["Color", m.color], ["Señas", m.senas ?? "Sin dato"], ["Microchip", m.microchip ?? "No registrado"],
    ["Esterilizado", m.esterilizado == null ? "Sin dato" : m.esterilizado ? "Sí" : "No"], ["Estado del registro", ESTADO_TXT[m.estado]],
  ];
  for (const [k, v] of filas) {
    pg.drawLine({ start: { x: X, y: y + 14 }, end: { x: W - X, y: y + 14 }, thickness: 0.6, color: C.line });
    pg.drawText(limpio(k), { x: X, y, size: 10, font: f.b, color: C.muted });
    y = parrafo(pg, v, X + 150, y, f.r, 11, ancho - 150) - 6;
  }

  y -= 10;
  pg.drawText("Salud (declarado por el propietario)", { x: X, y, size: 12, font: f.b, color: C.ink });
  y -= 18;
  const salud = resumenSalud(d.salud);
  if (!salud.length) { pg.drawText("Sin registros.", { x: X, y, size: 11, font: f.r, color: C.muted }); y -= 16; }
  for (const l of salud) y = parrafo(pg, `• ${l}`, X, y, f.r, 11, ancho) - 2;

  // Caja de verificación
  const urlVer = `${sitio}/verificar-certificado/${d.certificado.codigo}`;
  const bh = 116, by = Math.min(120, y - bh - 12);
  pg.drawRectangle({ x: X, y: by, width: ancho, height: bh, color: C.sunk, borderColor: C.line, borderWidth: 1 });
  dibujarQr(pg, urlVer, W - X - 104, by + 8, 104);
  pg.drawText(limpio("Código de verificación"), { x: X + 16, y: by + bh - 26, size: 10, font: f.b, color: C.muted });
  pg.drawText(d.certificado.codigo, { x: X + 16, y: by + bh - 50, size: 20, font: f.m, color: C.ink });
  pg.drawText(limpio(`Emitido el ${fecha(d.certificado.emitido_at)}`), { x: X + 16, y: by + bh - 70, size: 11, font: f.r, color: C.ink });
  parrafo(pg, `Verifícalo en ${urlVer} o escanea el código QR.`, X + 16, by + 26, f.r, 9.5, ancho - 140, C.muted);

  parrafo(pg, LEYENDA_CERT, X, by - 26, f.r, 9.5, ancho, C.muted);
  parrafo(pg, "Los datos de salud los registra el propietario y no han sido validados por una veterinaria.", X, by - 52, f.r, 9.5, ancho, C.muted);
  return doc.save();
}

/** DNI de la mascota: tarjeta horizontal. */
export async function pdfDni(d: DatosDocumento, sitio: string): Promise<Uint8Array> {
  const { doc, f, img } = await base(d);
  const m = d.mascota;
  doc.setTitle(`DNI PET ID ${m.pet_id}`); doc.setAuthor("PET ID"); doc.setLanguage("es-PE");
  const W = 486, H = 306, pg = doc.addPage([W, H]);
  pg.drawRectangle({ x: 0, y: 0, width: W, height: H, color: C.blanco, borderColor: C.line, borderWidth: 1 });
  pg.drawRectangle({ x: 0, y: H - 40, width: W, height: 40, color: C.brand });
  pg.drawText("PET ID", { x: 16, y: H - 27, size: 17, font: f.b, color: C.blanco });
  const sub = "DOCUMENTO DE IDENTIDAD DIGITAL ANIMAL";
  pg.drawText(sub, { x: W - 16 - f.b.widthOfTextAtSize(sub, 8.5), y: H - 25, size: 8.5, font: f.b, color: C.blanco });

  dibujarFoto(pg, img, 16, H - 52 - 140, 105, 140);

  const campo = (k: string, v: string, x: number, y: number, tam = 11, fuente = f.b) => {
    pg.drawText(k.toUpperCase(), { x, y, size: 7, font: f.b, color: C.muted });
    pg.drawText(limpio(v), { x, y: y - tam - 2, size: tam, font: fuente, color: C.ink });
  };
  const x1 = 136, x2 = 316, y0 = H - 62;
  campo("Nombre", m.nombre.toUpperCase(), x1, y0, 18);
  campo("Especie", ESPECIE_DNI[m.especie], x1, y0 - 38); campo("Sexo", SEXO_TXT[m.sexo], x2, y0 - 38);
  campo("Raza", m.raza, x1, y0 - 66); campo("Nacimiento", fecha(m.fecha_nacimiento), x2, y0 - 66);
  campo("Registrado el", fecha(m.creado_at), x1, y0 - 94);
  campo("Estado", m.estado === "extraviada" ? "Extraviada" : m.estado === "fallecida" ? "Fallecida" : "Registro activo", x2, y0 - 94);

  // Pie: PET ID, responsable y QR
  const py = 92;
  for (let x = 16; x < W - 16; x += 6) pg.drawLine({ start: { x, y: py }, end: { x: Math.min(x + 3, W - 16), y: py }, thickness: 1, color: C.line });
  pg.drawText(limpio("N.° PET ID"), { x: 16, y: py - 16, size: 7, font: f.b, color: C.muted });
  pg.drawText(m.pet_id, { x: 16, y: py - 32, size: 15, font: f.m, color: C.ink });
  pg.drawText("RESPONSABLE", { x: 170, y: py - 16, size: 7, font: f.b, color: C.muted });
  pg.drawText("Identidad verificada", { x: 170, y: py - 30, size: 11, font: f.b, color: C.ok });
  pg.drawText("Datos personales protegidos", { x: 170, y: py - 43, size: 8.5, font: f.r, color: C.muted });
  dibujarQr(pg, `${sitio}/m/${m.pet_id}`, W - 16 - 72, py - 78, 72);
  parrafo(pg, LEYENDA_DNI, 16, 18, f.r, 7.5, W - 120, C.muted);
  parrafo(pg, "Salud: datos declarados por el propietario.", 16, 30 - 0, f.r, 7.5, W - 120, C.muted);
  return doc.save();
}
