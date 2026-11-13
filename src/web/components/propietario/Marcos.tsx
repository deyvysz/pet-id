"use client";
/* eslint-disable @next/next/no-img-element -- fotos con URL firmada o data URI */
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { cerrarSesion, modo, obtenerMascota, obtenerPerfil, usuarioActual, type MascotaVista } from "./datos";
import { FOTO_PORTADA_B64, dataUri } from "./imagenes-demo";
import { Huella, IcCamara, IcCampana, IcCarnet, IcEscudo, IcMas, IcSalud, IcUsuario } from "./iconos";
import { AvisoModo, Logo, cx, s } from "./ui";

/** Marco de ingreso, registro y verificación: panel verde a la izquierda en escritorio. */
export function MarcoCuenta({ children }: { children: ReactNode }) {
  return (
    <div className={cx(s.marco, s.marcoAuth)}>
      <aside className={s.authSide}>
        <Logo />
        <h2>Cada mascota merece una <em>identidad</em></h2>
        <p>Registro, DNI digital, código QR, salud y búsqueda por foto en un solo lugar.</p>
        <div className={s.heroPhoto}><img src={dataUri(FOTO_PORTADA_B64)} alt="" /></div>
      </aside>
      <div className={s.principal}>
        <AvisoModo />
        {children}
      </div>
    </div>
  );
}

const reMascota = /^\/mascotas\/([^/]+)(?:\/|$)/;

/** Marco del panel del propietario: cabecera y barra lateral en escritorio. */
export function MarcoPanel({ children }: { children: ReactNode }) {
  const ruta = usePathname();
  const router = useRouter();
  const [nombre, setNombre] = useState("");
  const [esAdmin, setEsAdmin] = useState(false);
  const [mascota, setMascota] = useState<MascotaVista | null>(null);
  const idMascota = (() => { const m = reMascota.exec(ruta); return m && m[1] !== "nueva" ? m[1] : null; })();

  // Sesión y perfil. Sin sesión, a /ingresar; sin perfil, a /crear-cuenta.
  useEffect(() => {
    if (modo() === "sin-config") return;
    let vivo = true;
    (async () => {
      const id = await usuarioActual();
      if (!vivo) return;
      if (!id) { router.replace("/ingresar"); return; }
      const p = await obtenerPerfil().catch(() => null);
      if (!vivo) return;
      if (!p) { router.replace("/crear-cuenta"); return; }
      setNombre(`${p.nombres} ${p.apellidos}`);
      setEsAdmin(p.rol === "admin");
    })();
    return () => { vivo = false; };
  }, [router]);

  // Mascota de la barra lateral. Se recarga al cambiar de ruta para reflejar el estado.
  useEffect(() => {
    if (!idMascota || modo() === "sin-config") { setMascota(null); return; }
    let vivo = true;
    obtenerMascota(idMascota).then((m) => { if (vivo) setMascota(m); }).catch(() => { if (vivo) setMascota(null); });
    return () => { vivo = false; };
  }, [idMascota, ruta]);

  const salir = async () => { await cerrarSesion(); router.push("/ingresar"); };
  const on = (href: string) => (ruta === href ? s.on : undefined);
  const base = idMascota ? `/mascotas/${idMascota}` : "";
  const perdida = mascota?.estado === "extraviada";

  return (
    <div className={s.marco}>
      <header className={cx(s.siteHead, s.webOnly)}>
        <div className={s.siteHeadIn}>
          <Logo />
          {modo() === "demo" && <span className={s.demoTag}>Modo demo</span>}
          <nav className={s.siteNav} aria-label="Principal">
            <Link href="/mis-mascotas" className={on("/mis-mascotas")}>Mis mascotas</Link>
            {esAdmin && <Link href="/admin">Administración</Link>}
            <Link href="/encontre">Buscar por foto</Link>
            <Link href="/">Ayuda</Link>
          </nav>
          <div className={s.headCta}>
            {nombre && <Link href="/perfil" className={s.userChip} style={{ color: "var(--ink)", textDecoration: "none" }}><IcUsuario />{nombre}</Link>}
            <button className={cx(s.btn, s.sec)} type="button" onClick={salir}>Cerrar sesión</button>
          </div>
        </div>
      </header>
      <div className={s.cuerpo}>
        <aside className={cx(s.side, s.webOnly)}>
          {idMascota && mascota ? (
            <>
              <div className={s.sidePet}>
                {mascota.foto_url ? <img src={mascota.foto_url} alt="" /> : <span className={s.sideSinFoto} />}
                <div><b>{mascota.nombre}</b><span className={s.mono}>{mascota.pet_id}</span></div>
              </div>
              <nav aria-label="Mi mascota">
                <Link href="/mis-mascotas"><Huella size={20} />Mis mascotas</Link>
                <Link href={`${base}/dni`} className={on(`${base}/dni`)}><IcCarnet />DNI y certificado</Link>
                <Link href={`${base}/salud`} className={ruta.startsWith(`${base}/salud`) ? s.on : undefined}><IcSalud />Vacunas y controles</Link>
                <Link href={`${base}/fotos`} className={on(`${base}/fotos`)}><IcCamara />Fotos</Link>
                <Link href={`${base}/privacidad`} className={on(`${base}/privacidad`)}><IcEscudo />Privacidad</Link>
                <Link href={`${base}/reportar`} className={on(`${base}/reportar`)}><IcCampana />{perdida ? "Aviso de extravío" : "Reportar extravío"}</Link>
              </nav>
            </>
          ) : (
            <nav aria-label="Mi cuenta">
              <Link href="/mis-mascotas" className={on("/mis-mascotas")}><Huella size={20} />Mis mascotas</Link>
              <Link href="/mascotas/nueva" className={on("/mascotas/nueva")}><IcMas />Registrar mascota</Link>
              <Link href="/perfil" className={on("/perfil")}><IcUsuario />Mi perfil</Link>
              {esAdmin && <Link href="/admin"><IcUsuario />Panel de administración</Link>}
            </nav>
          )}
          <div className={s.sidePlan}><span className={s.chip}>PET ID Free</span><span className={s.hint}>Los planes de pago llegan en la fase 2.</span></div>
        </aside>
        <div className={s.principal}>
          <AvisoModo />
          {children}
        </div>
      </div>
    </div>
  );
}
