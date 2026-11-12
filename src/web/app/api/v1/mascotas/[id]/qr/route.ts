// GET /api/v1/mascotas/{id}/qr: QR de la placa. Abre la página pública /m/{pet_id}.
// {id} acepta el uuid de la mascota o su número PET ID. ?formato=png devuelve PNG; por defecto, SVG.
// Solo para el propietario (cookie de sesión o Bearer), como el resto de /api/v1/mascotas/{id}/*.
import QRCode from "qrcode";
import { ErrorApi, buscarMascota, origen, respuestaError, usuarioSolicitud } from "@/components/propietario/servidor";

export const runtime = "nodejs";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const usuario = await usuarioSolicitud(req);
    if (!usuario) throw new ErrorApi(401, "Inicia sesión para ver este código QR.");
    const m = await buscarMascota(id);
    if (m.propietario_id !== usuario) throw new ErrorApi(403, "Esta mascota no está registrada en tu cuenta.");
    const url = `${origen(req)}/m/${m.pet_id}`;
    const opciones = { errorCorrectionLevel: "M" as const, margin: 1, color: { dark: "#111111", light: "#FFFFFF" } };
    const cache = { "Cache-Control": "private, max-age=86400" };
    if (new URL(req.url).searchParams.get("formato") === "png") {
      const png = await QRCode.toBuffer(url, { ...opciones, type: "png", width: 600 });
      return new Response(new Uint8Array(png), { headers: { "Content-Type": "image/png", ...cache } });
    }
    const svg = await QRCode.toString(url, { ...opciones, type: "svg" });
    return new Response(svg, { headers: { "Content-Type": "image/svg+xml", ...cache } });
  } catch (e) {
    return respuestaError(e);
  }
}
