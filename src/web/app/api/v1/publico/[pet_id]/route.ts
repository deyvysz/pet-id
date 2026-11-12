// GET /api/v1/publico/{pet_id}: perfil público que abre el QR (vista mascotas_publico, foto con URL firmada).
// Contrato: docs/diseno/contratos-api.md lo nombra /api/v1/mascotas/{pet_id}/publico; se movió aquí para no chocar
// con el segmento dinámico app/api/v1/mascotas/[id] del agente 3.
import { error, ok } from "@/components/publico/api";
import { RE_PET_ID, normalizarPetId } from "@/components/publico/formato";
import { SinBackend, obtenerMascotaPublica } from "@/components/publico/servidor";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ pet_id: string }> }) {
  const petId = normalizarPetId((await params).pet_id);
  if (!RE_PET_ID.test(petId)) return error(400, "El PET ID debe tener el formato PE-00000000.");
  try {
    const m = await obtenerMascotaPublica(petId);
    if (!m) return error(404, "No hay una mascota con ese PET ID.");
    return ok(m);
  } catch (e) {
    if (e instanceof SinBackend) return error(503, "Servicio no disponible.");
    console.error("publico", e);
    return error(500, "No pudimos leer el perfil.");
  }
}
