import type { Metadata } from "next";
import { PantallaPublica } from "@/components/publico/Estructura";
import Resultados from "@/components/publico/Resultados";

export const metadata: Metadata = { title: "Parecidos reportados · PET ID", robots: { index: false } };

export default function PaginaResultados() {
  return (
    <PantallaPublica titulo="Parecidos reportados" volver="/encontre" activo="/encontre">
      <Resultados />
    </PantallaPublica>
  );
}
