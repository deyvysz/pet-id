// Administración: ficha de una mascota (datos, responsable, fotos, reportes, mensajes e historial).
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ESPECIE_TXT, ESTADO_TXT, MOTIVO_TXT, fecha, normalizarPetId, RE_PET_ID } from "@/components/publico/formato";
import { Huella } from "@/components/publico/iconos";
import type { MotivoRechazo } from "@/lib/contratos";
import { fichaMascota } from "@/components/admin/datos";
import { exigirAdmin, MarcoAdmin } from "@/components/admin/Marco";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Ficha de mascota · Administración · PET ID", robots: { index: false } };

const FOTO_TXT: Record<string, string> = { frente: "Frente", perfil_izq: "Perfil izquierdo", perfil_der: "Perfil derecho", cuerpo: "Cuerpo", marcas: "Marcas", hallazgo: "Hallazgo" };
const ESTADO_FOTO: Record<string, string> = { pendiente: "Pendiente", procesando: "Procesando", lista: "Lista", rechazada: "Rechazada" };
const ACCION_TXT: Record<string, string> = { registro: "Registro", cambio_estado: "Cambio de estado", nuevo_registro_salud: "Nuevo registro de salud", cambio_responsable: "Cambio de responsable" };

export default async function Ficha({ params }: { params: Promise<{ pet_id: string }> }) {
  const { acceso, bloqueo } = await exigirAdmin();
  if (bloqueo) return bloqueo;
  const petId = normalizarPetId((await params).pet_id);
  if (!RE_PET_ID.test(petId)) notFound();
  const m = await fichaMascota(petId);
  if (!m) notFound();
  const est = ESTADO_TXT[m.estado];

  return (
    <MarcoAdmin activo="mascotas" demo={acceso === "demo"}>
      <Link href="/admin/mascotas">← Mascotas</Link>
      <div className="admin-cabecera">
        {/* eslint-disable-next-line @next/next/no-img-element -- URL firmada de Supabase, temporal */}
        {m.foto_url ? <img src={m.foto_url} alt={`Foto de ${m.nombre}`} /> : <span className="admin-vacio"><Huella /></span>}
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <h1>{m.nombre}</h1>
          <span className="mono">{m.pet_id}</span>
          <span><span className={`chip ${est.cls}`}>{est.t}</span> {m.lista_para_busqueda ? <span className="chip ok">Lista para búsqueda</span> : <span className="chip">Sin búsqueda por foto</span>}</span>
        </div>
      </div>
      <p><Link href={`/m/${m.pet_id}`} target="_blank">Ver la página pública (la que abre el QR)</Link></p>

      <section className="admin-seccion">
        <h2>Datos</h2>
        <dl className="ficha">
          <div><dt>Especie</dt><dd>{ESPECIE_TXT[m.especie]}</dd></div>
          <div><dt>Raza</dt><dd>{m.raza}</dd></div>
          <div><dt>Sexo</dt><dd>{m.sexo === "hembra" ? "Hembra" : "Macho"}</dd></div>
          <div><dt>Color</dt><dd>{m.color}</dd></div>
          <div><dt>Nacimiento</dt><dd>{fecha(m.fecha_nacimiento)}</dd></div>
          <div><dt>Microchip</dt><dd>{m.microchip ?? "Sin registrar"}</dd></div>
          <div><dt>Registro</dt><dd>{fecha(m.creado_at)}</dd></div>
          <div><dt>Certificado</dt><dd className="mono">{m.certificado ?? "Aún no emitido"}</dd></div>
        </dl>
      </section>

      <section className="admin-seccion">
        <h2>Responsable</h2>
        <p className="hint">Datos privados: no aparecen en ninguna página pública. Úsalos solo para atención al usuario.</p>
        {m.propietario ? (
          <dl className="ficha">
            <div><dt>Nombre</dt><dd>{m.propietario.nombre}</dd></div>
            <div><dt>Celular</dt><dd>{m.propietario.celular}</dd></div>
            <div><dt>Correo</dt><dd>{m.propietario.correo ?? "Sin correo"}</dd></div>
            <div><dt>Distrito</dt><dd>{m.propietario.distrito}</dd></div>
          </dl>
        ) : <p className="muted">Sin perfil de responsable.</p>}
      </section>

      <section className="admin-seccion">
        <h2>Fotos ({m.fotos.length})</h2>
        {m.fotos.length ? (
          <div className="list">
            {m.fotos.map((f, i) => (
              <div className="li" key={i}>
                <span>{FOTO_TXT[f.tipo] ?? f.tipo}</span>
                <span className={`chip${f.estado === "lista" ? " ok" : f.estado === "rechazada" ? " lost" : ""}`}>
                  {ESTADO_FOTO[f.estado] ?? f.estado}{f.motivo_rechazo ? `: ${MOTIVO_TXT[f.motivo_rechazo as MotivoRechazo] ?? f.motivo_rechazo}` : ""}
                </span>
              </div>
            ))}
          </div>
        ) : <p className="muted">Sin fotos.</p>}
      </section>

      <section className="admin-seccion">
        <h2>Reportes de extravío ({m.reportes.length})</h2>
        {m.reportes.length ? (
          <div className="list">
            {m.reportes.map((r, i) => (
              <div className="li" key={i}>
                <div><b>{r.distrito}</b>{r.referencia && <span className="hint">{r.referencia}</span>}</div>
                <span className="muted">{fecha(r.fecha_perdida)} · {r.activo ? "Activo" : `Cerrado el ${fecha(r.cerrado_at)}`}</span>
              </div>
            ))}
          </div>
        ) : <p className="muted">Nunca se reportó como extraviada.</p>}
      </section>

      <section className="admin-seccion">
        <h2>Mensajes de quienes la encontraron ({m.mensajes.length})</h2>
        {m.mensajes.length ? (
          <div className="list">
            {m.mensajes.map((x, i) => (
              <div className="li" key={i}>
                <div><b>{x.nombre}</b><span>{x.mensaje}</span><span className="hint">{[x.celular, x.correo].filter(Boolean).join(" · ")}</span></div>
                <span className="muted">{fecha(x.creado_at)}</span>
              </div>
            ))}
          </div>
        ) : <p className="muted">Sin mensajes.</p>}
      </section>

      <section className="admin-seccion">
        <h2>Historial</h2>
        {m.historial.length ? (
          <div className="list">
            {m.historial.map((h, i) => (
              <div className="li" key={i}><span>{ACCION_TXT[h.accion] ?? h.accion}</span><span className="muted">{fecha(h.creado_at)}</span></div>
            ))}
          </div>
        ) : <p className="muted">Sin movimientos.</p>}
      </section>
    </MarcoAdmin>
  );
}
