// Administración: listado de mascotas con búsqueda por nombre o PET ID y filtro por estado.
import Link from "next/link";
import type { Metadata } from "next";
import type { EstadoMascota } from "@/lib/contratos";
import { ESPECIE_TXT, ESTADO_TXT, fecha } from "@/components/publico/formato";
import { listarMascotas } from "@/components/admin/datos";
import { exigirAdmin, MarcoAdmin } from "@/components/admin/Marco";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Mascotas · Administración · PET ID", robots: { index: false } };

const ESTADOS: EstadoMascota[] = ["activa", "extraviada", "encontrada", "fallecida"];

export default async function Mascotas({ searchParams }: { searchParams: Promise<{ q?: string; estado?: string }> }) {
  const { acceso, bloqueo } = await exigirAdmin();
  if (bloqueo) return bloqueo;
  const sp = await searchParams;
  const q = (sp.q ?? "").slice(0, 60);
  const estado = ESTADOS.includes(sp.estado as EstadoMascota) ? (sp.estado as string) : "";
  const mascotas = await listarMascotas(q, estado);
  return (
    <MarcoAdmin activo="mascotas" demo={acceso === "demo"}>
      <h1>Mascotas</h1>
      <form className="admin-filtros" method="get">
        <input name="q" defaultValue={q} placeholder="Nombre o PET ID" aria-label="Buscar por nombre o PET ID" />
        <select name="estado" defaultValue={estado} aria-label="Estado">
          <option value="">Todos los estados</option>
          {ESTADOS.map((e) => <option key={e} value={e}>{ESTADO_TXT[e].t}</option>)}
        </select>
        <button className="btn auto small" type="submit">Buscar</button>
      </form>
      <p className="hint">{mascotas.length} {mascotas.length === 1 ? "resultado" : "resultados"}{mascotas.length === 200 ? " (se muestran los 200 más recientes)" : ""}</p>
      {mascotas.length ? (
        <div className="list">
          {mascotas.map((m) => (
            <div className="li" key={m.pet_id}>
              <div><Link href={`/admin/mascotas/${m.pet_id}`}>{m.nombre}</Link><span className="hint">{ESPECIE_TXT[m.especie]} · <span className="mono">{m.pet_id}</span> · registrada el {fecha(m.creado_at)}</span></div>
              <span className={`chip ${ESTADO_TXT[m.estado].cls}`}>{ESTADO_TXT[m.estado].t}</span>
            </div>
          ))}
        </div>
      ) : <p className="muted">No hay mascotas con esos filtros.</p>}
    </MarcoAdmin>
  );
}
