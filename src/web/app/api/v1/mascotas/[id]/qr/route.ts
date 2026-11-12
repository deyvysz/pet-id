// GET /api/v1/mascotas/{id}/qr: QR de la placa. Abre la página pública /m/{pet_id}.
// {id} acepta el uuid de la mascota o su número PET ID. ?formato=png devuelve PNG; por defecto, SVG.
import QRCode from "qrcode";
import { buscarMascota, origen, respuestaError } from "@/components/propietario/servidor";

export const runtime = "nodejs";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const m = await buscarMascota(id);
    const url = `${origen(req)}/m/${m.pet_id}`;
    const opciones = { errorCorrectionLevel: "M" as const, margin: 1, color: { dark: "#111111", light: "#FFFFFF" } };
    const cache = { "Cache-Control": "public, max-age=86400" };
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
