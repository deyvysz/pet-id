// GET /api/v1/mascotas/{id}/certificado: PDF del certificado con código de verificación.
// ?documento=dni devuelve el DNI de la mascota en PDF. Solo para el propietario (cookie de sesión o Bearer).
// La primera descarga crea la fila en `certificados` (código PID-XXXX-XXXX) y guarda el PDF en el bucket 'documentos'.
import { BUCKET_DOCUMENTOS, supabaseServicio } from "@/lib/supabase";
import { esDemo } from "@/components/propietario/demo";
import { pdfCertificado, pdfDni } from "@/components/propietario/pdf";
import {
  ErrorApi, buscarMascota, datosDocumento, origen, respuestaError, usuarioSolicitud,
} from "@/components/propietario/servidor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const usuario = await usuarioSolicitud(req);
    if (!usuario) throw new ErrorApi(401, "Inicia sesión para descargar este documento.");
    const m = await buscarMascota(id);
    if (m.propietario_id !== usuario) throw new ErrorApi(403, "Esta mascota no está registrada en tu cuenta.");

    const datos = await datosDocumento(m);
    const dni = new URL(req.url).searchParams.get("documento") === "dni";
    const bytes = dni ? await pdfDni(datos, origen(req)) : await pdfCertificado(datos, origen(req));

    if (!dni && !esDemo()) {
      // Copia del certificado emitido. Si falla, igual se entrega el PDF.
      const ruta = `certificados/${m.id}/${datos.certificado.codigo}.pdf`;
      const sb = supabaseServicio();
      const up = await sb.storage.from(BUCKET_DOCUMENTOS).upload(ruta, bytes, { contentType: "application/pdf", upsert: true });
      if (!up.error) await sb.from("certificados").update({ ruta_pdf: ruta }).eq("codigo", datos.certificado.codigo);
    }

    const nombre = `${dni ? "dni" : "certificado"}-${m.pet_id}.pdf`;
    return new Response(new Uint8Array(bytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${nombre}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (e) {
    return respuestaError(e);
  }
}
