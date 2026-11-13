// Administración: todos los reportes de extravío activos.
import Link from "next/link";
import type { Metadata } from "next";
import { fecha } from "@/components/publico/formato";
import { listarReportes } from "@/components/admin/datos";
import { exigirAdmin, MarcoAdmin } from "@/components/admin/Marco";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Reportes activos · Administración · PET ID", robots: { index: false } };

export default async function Reportes() {
  const { acceso, bloqueo } = await exigirAdmin();
  if (bloqueo) return bloqueo;
  const reportes = await listarReportes();
  return (
    <MarcoAdmin activo="reportes" demo={acceso === "demo"}>
      <h1>Reportes activos ({reportes.length})</h1>
      {reportes.length ? (
        <div className="list">
          {reportes.map((r) => (
            <div className="li" key={r.pet_id}>
              <div><Link href={`/admin/mascotas/${r.pet_id}`}>{r.nombre}</Link><span className="hint mono">{r.pet_id}</span></div>
              <div style={{ alignItems: "flex-end" }}>
                <span>{r.distrito} · desde el {fecha(r.fecha)}</span>
                {r.referencia && <span className="hint">{r.referencia}</span>}
              </div>
            </div>
          ))}
        </div>
      ) : <p className="muted">No hay reportes de extravío activos.</p>}
    </MarcoAdmin>
  );
}
