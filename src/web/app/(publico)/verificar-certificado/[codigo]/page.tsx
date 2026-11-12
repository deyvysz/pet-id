// Resultado de la verificación de un certificado (lo abre el QR del certificado). Sin datos del propietario.
import type { Metadata } from "next";
import { PantallaPublica } from "@/components/publico/Estructura";
import FormVerificar from "@/components/publico/FormVerificar";
import { ESPECIE_TXT, ESTADO_TXT, RE_CODIGO, fecha } from "@/components/publico/formato";
import { verificarCertificado } from "@/components/publico/servidor";
import type { VerificacionCertificado } from "@/lib/contratos";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Verificar certificado · PET ID", robots: { index: false } };

export default async function ResultadoVerificacion({ params }: { params: Promise<{ codigo: string }> }) {
  const codigo = decodeURIComponent((await params).codigo).trim().toUpperCase();
  const v: VerificacionCertificado = RE_CODIGO.test(codigo) ? await verificarCertificado(codigo) : { valido: false, codigo };

  return (
    <PantallaPublica titulo="Verificar certificado" volver="/verificar-certificado" activo="/verificar-certificado">
      <main className="screen">
        {v.valido ? (
          <section className="ok-card" aria-live="polite">
            <strong style={{ color: "var(--ok)", fontSize: 18 }}>Certificado válido</strong>
            <dl className="dl">
              <div><dt>Código</dt><dd className="mono">{v.codigo}</dd></div>
              <div><dt>N.° PET ID</dt><dd className="mono">{v.pet_id}</dd></div>
              <div><dt>Mascota</dt><dd>{v.nombre}{v.especie ? `, ${ESPECIE_TXT[v.especie].toLowerCase()}` : ""}</dd></div>
              <div><dt>Estado del registro</dt><dd>{v.estado ? ESTADO_TXT[v.estado].t : ""}</dd></div>
              <div><dt>Emitido el</dt><dd>{fecha(v.emitido_at)}</dd></div>
            </dl>
            <p className="hint">Por privacidad no mostramos los datos del responsable.</p>
          </section>
        ) : (
          <div className="note warn" aria-live="polite">
            <b>No encontrado</b>
            {RE_CODIGO.test(codigo)
              ? "No hay un certificado con ese código. Revisa que esté escrito igual que en el documento."
              : "El código no tiene el formato correcto. Debe verse así: PID-XXXX-XXXX."}
          </div>
        )}
        <FormVerificar codigo={v.valido ? "" : codigo} />
        <div className="spacer" />
        <p className="hint">El certificado acredita la inscripción en PET ID. No reemplaza documentos oficiales ni es por sí solo prueba definitiva de propiedad.</p>
      </main>
    </PantallaPublica>
  );
}
