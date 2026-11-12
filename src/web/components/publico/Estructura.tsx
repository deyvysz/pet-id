// Cabecera, pie y marco de pantalla de la web pública.
import Link from "next/link";
import "./publico.css";
import { Huella, IcMenu, IcVolver } from "./iconos";
import BotonAviso from "./BotonAviso";

export function Logo({ enlace = true }: { enlace?: boolean }) {
  const dentro = (<><span className="logo-mark"><Huella /></span><span>Pet<b>ID</b></span></>);
  return enlace
    ? <Link className="logo" href="/" aria-label="PetID, página principal">{dentro}</Link>
    : <span className="logo">{dentro}</span>;
}

type Nav = { href: string; t: string; on?: boolean }[];

const NAV_INICIO: Nav = [
  { href: "/", t: "Inicio", on: true }, { href: "/#como", t: "¿Cómo funciona?" }, { href: "/#planes", t: "Planes" },
  { href: "/#veterinarias", t: "Veterinarias" }, { href: "/#ayuda", t: "Ayuda" },
];
const NAV_PUBLICO: Nav = [
  { href: "/encontre", t: "Buscar por foto" }, { href: "/verificar-certificado", t: "Verificar certificado" }, { href: "/#ayuda", t: "Ayuda" },
];

export function CabeceraSitio({ variante = "inicio", activo }: { variante?: "inicio" | "publico"; activo?: string }) {
  const nav = (variante === "inicio" ? NAV_INICIO : NAV_PUBLICO).map((n) => ({ ...n, on: activo ? n.href === activo : n.on }));
  return (
    <header className={`site-head${variante === "publico" ? " web-only" : ""}`}>
      <div className="in">
        <Logo />
        <nav className="site-nav" aria-label="Principal">
          {nav.map((n) => <Link key={n.href} href={n.href} className={n.on ? "on" : undefined} aria-current={n.on ? "page" : undefined}>{n.t}</Link>)}
        </nav>
        <div className="head-cta">
          <Link className="btn sec" href="/ingresar">Iniciar sesión</Link>
          <Link className="btn reg" href="/crear-cuenta">Registra a tu mascota</Link>
          <details className="menu-mob">
            <summary aria-label="Abrir menú"><IcMenu /></summary>
            <nav aria-label="Menú">
              {[...NAV_INICIO.slice(1), ...NAV_PUBLICO.slice(0, 2), { href: "/crear-cuenta", t: "Registra a tu mascota" }].map((n) => (
                <Link key={n.href} href={n.href}>{n.t}</Link>
              ))}
            </nav>
          </details>
        </div>
      </div>
    </header>
  );
}

/** Correo de contacto del pie. Se define en NEXT_PUBLIC_CORREO_CONTACTO; si falta, no se muestra. */
const CORREO_CONTACTO = process.env.NEXT_PUBLIC_CORREO_CONTACTO;

export function PieSitio() {
  return (
    <footer className="site-foot">
      <div className="in">
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <Logo enlace={false} />
          <p>El DNI PET ID es una credencial privada de registro y no es un documento oficial.</p>
          {CORREO_CONTACTO && (
            <p>Contacto: <a href={`mailto:${CORREO_CONTACTO}`} style={{ color: "inherit" }}>{CORREO_CONTACTO}</a></p>
          )}
        </div>
        <div className="foot-links">
          <Link href="/verificar-certificado">Verificar un certificado</Link>
          <Link href="/encontre">Encontré una mascota</Link>
          <BotonAviso aviso="Página de términos y condiciones en preparación">Términos y condiciones</BotonAviso>
          <BotonAviso aviso="Página de política de privacidad en preparación">Política de privacidad</BotonAviso>
          <BotonAviso aviso="Libro de reclamaciones virtual en preparación">Libro de reclamaciones</BotonAviso>
        </div>
        <div className="foot-links">
          <Link href="/ingresar">Iniciar sesión</Link>
          <Link href="/crear-cuenta">Crear cuenta</Link>
          <Link href="/admin">Acceso del equipo PET ID</Link>
        </div>
      </div>
    </footer>
  );
}

/** Marco de las pantallas públicas: barra con título en móvil; cabecera del sitio y tarjeta centrada desde 900 px. */
export function PantallaPublica({ titulo, volver, activo, banda, children, marca }: {
  titulo?: string; volver?: string; activo?: string; banda?: React.ReactNode; children: React.ReactNode; marca?: string;
}) {
  return (
    <div className="pub fondo">
      <CabeceraSitio variante="publico" activo={activo} />
      <div className="shell-body">
        {marca !== undefined ? (
          <header className="bar brand mob-only"><Logo /><span className="muted mono" style={{ fontSize: 13 }}>{marca}</span></header>
        ) : titulo ? (
          <header className="bar">
            {volver ? <Link className="icon-btn" href={volver} aria-label="Volver"><IcVolver /></Link> : <span style={{ width: 8 }} />}
            <h1>{titulo}</h1>
          </header>
        ) : null}
        {banda}
        {children}
      </div>
    </div>
  );
}
