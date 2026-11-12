// Verificar un certificado escribiendo su código.
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { PantallaPublica } from "@/components/publico/Estructura";
import FormVerificar from "@/components/publico/FormVerificar";
import { esDemo, CODIGO_DEMO } from "@/components/publico/demo";

export const metadata: Metadata = { title: "Verificar certificado · PET ID" };

export default async function Verificar({ searchParams }: { searchParams: Promise<{ codigo?: string }> }) {
  const { codigo } = await searchParams;
  const c = (codigo ?? "").trim().toUpperCase().replace(/\s+/g, "");
  if (c) redirect(`/verificar-certificado/${encodeURIComponent(c)}`);
  return (
    <PantallaPublica titulo="Verificar certificado" volver="/" activo="/verificar-certificado">
      <main className="screen">
        <p className="lead">Escribe el código de verificación que figura en el certificado o escanea su QR.</p>
        <FormVerificar />
        {esDemo() && <p className="hint">Código del certificado de ejemplo: <span className="mono">{CODIGO_DEMO}</span></p>}
        <div className="spacer" />
        <p className="hint">El certificado acredita la inscripción en PET ID. No reemplaza documentos oficiales ni es por sí solo prueba definitiva de propiedad.</p>
      </main>
    </PantallaPublica>
  );
}
