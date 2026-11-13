// Panel de administración: resumen (solo rol admin). Fuente: docs/diseno/prototipo.html (pantalla "admin").
import Link from "next/link";
import type { Metadata } from "next";
import { ESPECIE_TXT, ESTADO_TXT, fecha } from "@/components/publico/formato";
import { obtenerDatosAdmin } from "@/components/admin/datos";
import { exigirAdmin, MarcoAdmin } from "@/components/admin/Marco";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Administración · PET ID", robots: { index: false } };

const nf = new Intl.NumberFormat("es-PE");

export default async function Admin() {
  const { acceso, bloqueo } = await exigirAdmin();
  if (bloqueo) return bloqueo;
  const d = await obtenerDatosAdmin();
  const pct = d.stats.mascotas ? Math.round((d.stats.listas / d.stats.mascotas) * 100) : 0;

  return (
    <MarcoAdmin activo="resumen" demo={acceso === "demo"}>
      <h1>Panel de administración</h1>
      <div className="stats">
        <Link className="stat" href="/admin/mascotas" style={{ textDecoration: "none", color: "inherit" }}><b>{nf.format(d.stats.mascotas)}</b><span>Mascotas registradas</span></Link>
        <div className="stat"><b>{pct} %</b><span>Listas para búsqueda por foto</span></div>
        <Link className="stat" href="/admin/reportes" style={{ textDecoration: "none", color: "inherit" }}><b>{nf.format(d.stats.extravios)}</b><span>Extravíos activos</span></Link>
        <div className="stat"><b>{nf.format(d.stats.hallazgosSemana)}</b><span>Búsquedas por foto en 7 días</span></div>
      </div>

      <section style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <h2 style={{ fontSize: 19 }}>Reportes activos ({d.reportes.length})</h2>
        {d.reportes.length ? (
          <div className="list">
            {d.reportes.slice(0, 5).map((r) => (
              <div className="li" key={r.pet_id}>
                <div><Link href={`/admin/mascotas/${r.pet_id}`}>{r.nombre}</Link><span className="hint mono">{r.pet_id}</span></div>
                <span className="muted">{r.distrito} · desde el {fecha(r.fecha)}</span>
              </div>
            ))}
          </div>
        ) : <p className="muted">No hay reportes de extravío activos.</p>}
        {d.reportes.length > 5 && <Link href="/admin/reportes">Ver todos los reportes</Link>}
      </section>

      <div className="admin-cols">
        <section>
          <h2 style={{ fontSize: 19 }}>Mascotas recientes</h2>
          {d.mascotas.length ? (
            <div className="list">
              {d.mascotas.map((m) => (
                <div className="li" key={m.pet_id}>
                  <div><Link href={`/admin/mascotas/${m.pet_id}`}>{m.nombre}</Link><span className="hint">{ESPECIE_TXT[m.especie]} · <span className="mono">{m.pet_id}</span></span></div>
                  <span className={`chip ${ESTADO_TXT[m.estado].cls}`}>{ESTADO_TXT[m.estado].t}</span>
                </div>
              ))}
            </div>
          ) : <p className="muted">Aún no hay mascotas registradas.</p>}
          <Link href="/admin/mascotas">Ver todas las mascotas</Link>
        </section>
        <section>
          <h2 style={{ fontSize: 19 }}>Usuarios recientes</h2>
          {d.usuarios.length ? (
            <div className="list">
              {d.usuarios.map((u, i) => (
                <div className="li" key={`${u.nombre}-${i}`}>
                  <div><b>{u.nombre}</b><span className="hint">{u.distrito} · desde el {fecha(u.creado_at)}</span></div>
                  <span className={`chip${u.rol === "admin" ? " warn" : ""}`}>{u.rol === "admin" ? "Admin" : "Propietario"}</span>
                </div>
              ))}
            </div>
          ) : <p className="muted">Aún no hay usuarios.</p>}
          <Link href="/admin/usuarios">Ver todos los usuarios</Link>
        </section>
      </div>
    </MarcoAdmin>
  );
}
