// GET /api/v1/verificar/{codigo}: valida un certificado. Sin datos del propietario.
import { error, ok } from "@/components/publico/api";
import { RE_CODIGO } from "@/components/publico/formato";
import { SinBackend, verificarCertificado } from "@/components/publico/servidor";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ codigo: string }> }) {
  const codigo = decodeURIComponent((await params).codigo).trim().toUpperCase();
  if (!RE_CODIGO.test(codigo)) return error(400, "El código debe tener el formato PID-XXXX-XXXX.");
  try {
    const v = await verificarCertificado(codigo);
    return ok(v, v.valido ? 200 : 404);
  } catch (e) {
    if (e instanceof SinBackend) return error(503, "Servicio no disponible.");
    console.error("verificar", e);
    return error(500, "No pudimos verificar el certificado.");
  }
}
