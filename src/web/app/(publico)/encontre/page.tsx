// Búsqueda por foto para quien encontró una mascota sin placa. No necesita cuenta.
import type { Metadata } from "next";
import { PantallaPublica } from "@/components/publico/Estructura";
import FormHallazgo from "@/components/publico/FormHallazgo";

export const metadata: Metadata = { title: "Encontré una mascota · PET ID" };

export default function Encontre() {
  return (
    <PantallaPublica titulo="Buscar por foto" volver="/" activo="/encontre">
      <FormHallazgo />
    </PantallaPublica>
  );
}
