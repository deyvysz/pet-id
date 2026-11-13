// Estructura común del panel: cabecera, menú lateral (escritorio) y pestañas (celular). Solo servidor.
import Link from "next/link";
import { redirect } from "next/navigation";
import { Logo } from "@/components/publico/Estructura";
import { Huella, IcCampana, IcResumen, IcUsuario } from "@/components/publico/iconos";
import { revisarAcceso, type Acceso } from "./datos";
import { SalirBoton } from "./SalirBoton";
import "./admin.css";

export type Seccion = "resumen" | "reportes" | "mascotas" | "usuarios";

const MENU: { id: Seccion; href: string; texto: string; Icono: typeof IcResumen }[] = [
  { id: "resumen", href: "/admin", texto: "Resumen", Icono: IcResumen },
  { id: "reportes", href: "/admin/reportes", texto: "Reportes activos", Icono: IcCampana },
  { id: "mascotas", href: "/admin/mascotas", texto: "Mascotas", Icono: Huella },
  { id: "usuarios", href: "/admin/usuarios", texto: "Usuarios", Icono: IcUsuario },
];

function Cabecera({ demo }: { demo?: boolean }) {
  return (
    <header className="site-head">
      <div className="in">
        <Logo />
        <span className="chip" style={{ marginLeft: "auto" }}>Administración{demo ? " · demo" : ""}</span>
        <SalirBoton />
      </div>
    </header>
  );
}

/** Comprueba el rol admin. Sin sesión redirige a /ingresar; sin permiso devuelve la pantalla de aviso. */
export async function exigirAdmin(): Promise<{ acceso: Acceso; bloqueo: React.ReactNode | null }> {
  const acceso = await revisarAcceso();
  if (acceso === "sin_sesion") redirect("/ingresar?siguiente=/admin");
  if (acceso === "sin_permiso" || acceso === "sin_backend") {
    return {
      acceso,
      bloqueo: (
        <div className="pub fondo">
          <Cabecera />
          <main className="screen" style={{ maxWidth: 520, margin: "32px auto", width: "100%" }}>
            <h1>{acceso === "sin_permiso" ? "No tienes acceso" : "Panel no disponible"}</h1>
            <p className="muted">
              {acceso === "sin_permiso"
                ? "Esta sección es solo para el equipo PET ID. Si deberías tener acceso, pide a un administrador que revise tu rol."
                : "Falta configurar Supabase en el servidor."}
            </p>
            <Link className="btn sec" href="/">Ir al inicio</Link>
          </main>
        </div>
      ),
    };
  }
  return { acceso, bloqueo: null };
}

export function MarcoAdmin({ activo, demo, children }: { activo: Seccion; demo?: boolean; children: React.ReactNode }) {
  return (
    <div className="pub fondo">
      <Cabecera demo={demo} />
      <nav className="admin-tabs" aria-label="Administración">
        {MENU.map((m) => <Link key={m.id} href={m.href} className={m.id === activo ? "on" : undefined}>{m.texto}</Link>)}
      </nav>
      <div className="admin-body">
        <nav className="side" aria-label="Administración">
          {MENU.map(({ id, href, texto, Icono }) => (
            <Link key={id} href={href} className={id === activo ? "on" : undefined} aria-current={id === activo ? "page" : undefined}><Icono />{texto}</Link>
          ))}
          <hr style={{ border: 0, borderTop: "1px solid var(--line)", margin: "8px 0" }} />
          <Link href="/mis-mascotas"><Huella />Mis mascotas</Link>
        </nav>
        <main className="screen">
          {demo && <p className="hint">Datos de ejemplo (modo demo).</p>}
          {children}
        </main>
      </div>
    </div>
  );
}
