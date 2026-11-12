// Panel de administración (solo rol admin). Fuente: docs/diseno/prototipo.html (pantalla "admin").
import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { Logo } from "@/components/publico/Estructura";
import { ESPECIE_TXT, ESTADO_TXT, fecha } from "@/components/publico/formato";
import { Huella, IcCampana, IcResumen, IcUsuario } from "@/components/publico/iconos";
import { obtenerDatosAdmin, revisarAcceso } from "@/components/admin/datos";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Administración · PET ID", robots: { index: false } };

const nf = new Intl.NumberFormat("es-PE");

function Marco({ children, demo }: { children: React.ReactNode; demo?: boolean }) {
  return (
    <div className="pub fondo">
      <header className="site-head">
        <div className="in">
          <Logo />
          <span className="chip" style={{ marginLeft: "auto" }}>Administración{demo ? " · demo" : ""}</span>
          <Link className="btn sec auto small" href="/">Salir</Link>
        </div>
      </header>
      {children}
    </div>
  );
}

export default async function Admin() {
  const acceso = await revisarAcceso();
  if (acceso === "sin_sesion") redirect("/ingresar?siguiente=/admin");
  if (acceso === "sin_permiso" || acceso === "sin_backend") {
    return (
      <Marco>
        <main className="screen" style={{ maxWidth: 520, margin: "32px auto", width: "100%" }}>
          <h1>{acceso === "sin_permiso" ? "No tienes acceso" : "Panel no disponible"}</h1>
          <p className="muted">
            {acceso === "sin_permiso"
              ? "Esta sección es solo para el equipo PET ID. Si deberías tener acceso, pide a un administrador que revise tu rol."
              : "Falta configurar Supabase en el servidor."}
          </p>
          <Link className="btn sec" href="/">Ir al inicio</Link>
        </main>
      </Marco>
    );
  }

  const d = await obtenerDatosAdmin();
  const pct = d.stats.mascotas ? Math.round((d.stats.listas / d.stats.mascotas) * 100) : 0;

  return (
    <Marco demo={acceso === "demo"}>
      <div className="admin-body">
        <nav className="side" aria-label="Administración">
          <a href="#resumen" className="on"><IcResumen />Resumen</a>
          <a href="#reportes"><IcCampana />Reportes activos</a>
          <a href="#mascotas"><Huella />Mascotas</a>
          <a href="#usuarios"><IcUsuario />Usuarios</a>
        </nav>
        <main className="screen">
          <h1 id="resumen">Panel de administración</h1>
          {acceso === "demo" && <p className="hint">Cifras de ejemplo (modo demo).</p>}
          <div className="stats">
            <div className="stat"><b>{nf.format(d.stats.mascotas)}</b><span>Mascotas registradas</span></div>
            <div className="stat"><b>{pct} %</b><span>Listas para búsqueda por foto</span></div>
            <div className="stat"><b>{nf.format(d.stats.extravios)}</b><span>Extravíos activos</span></div>
            <div className="stat"><b>{nf.format(d.stats.hallazgosSemana)}</b><span>Búsquedas por foto en 7 días</span></div>
          </div>

          <section id="reportes" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <h2 style={{ fontSize: 19 }}>Reportes activos ({d.reportes.length})</h2>
            {d.reportes.length ? (
              <div className="list">
                {d.reportes.map((r) => (
                  <div className="li" key={r.pet_id}>
                    <div><Link href={`/m/${r.pet_id}`}>{r.nombre}</Link><span className="hint mono">{r.pet_id}</span></div>
                    <span className="muted">{r.distrito} · desde el {fecha(r.fecha)}</span>
                  </div>
                ))}
              </div>
            ) : <p className="muted">No hay reportes de extravío activos.</p>}
          </section>

          <div className="admin-cols">
            <section id="mascotas">
              <h2 style={{ fontSize: 19 }}>Mascotas recientes</h2>
              {d.mascotas.length ? (
                <div className="list">
                  {d.mascotas.map((m) => (
                    <div className="li" key={m.pet_id}>
                      <div><Link href={`/m/${m.pet_id}`}>{m.nombre}</Link><span className="hint">{ESPECIE_TXT[m.especie]} · <span className="mono">{m.pet_id}</span></span></div>
                      <span className={`chip ${ESTADO_TXT[m.estado].cls}`}>{ESTADO_TXT[m.estado].t}</span>
                    </div>
                  ))}
                </div>
              ) : <p className="muted">Aún no hay mascotas registradas.</p>}
            </section>
            <section id="usuarios">
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
            </section>
          </div>
        </main>
      </div>
    </Marco>
  );
}
