// Formulario para escribir a la familia de la mascota. El mensaje se envía por correo; el propietario no se muestra.
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { PantallaPublica } from "@/components/publico/Estructura";
import FormContacto from "@/components/publico/FormContacto";
import { RE_PET_ID, normalizarPetId } from "@/components/publico/formato";
import { obtenerMascotaPublica } from "@/components/publico/servidor";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Escribir a la familia · PET ID", robots: { index: false } };

type Props = { params: Promise<{ pet_id: string }>; searchParams: Promise<{ hallazgo?: string }> };

export default async function Contactar({ params, searchParams }: Props) {
  const petId = normalizarPetId((await params).pet_id);
  if (!RE_PET_ID.test(petId)) notFound();
  const m = await obtenerMascotaPublica(petId);
  if (!m || m.estado === "fallecida") notFound();
  const { hallazgo } = await searchParams;
  const hallazgoId = hallazgo && /^[0-9a-f-]{36}$/i.test(hallazgo) ? hallazgo : undefined;

  return (
    <PantallaPublica titulo={`Escribir a la familia de ${m.nombre}`} volver={`/m/${m.pet_id}`}>
      <FormContacto petId={m.pet_id} nombreMascota={m.nombre} hallazgoId={hallazgoId} />
    </PantallaPublica>
  );
}
