"use client";
/* eslint-disable @next/next/no-img-element -- fotos con URL firmada o data URI */
import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { modo, SinConfiguracion } from "./datos";
import { Huella, IcVolver } from "./iconos";
import s from "./ui.module.css";

export { s };
export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

export function Logo({ enlace = true }: { enlace?: boolean }) {
  const inner = <><span className={s.logoMark}><Huella /></span><span>Pet<b>ID</b></span></>;
  return enlace
    ? <Link className={s.logo} href="/" aria-label="PET ID, página principal">{inner}</Link>
    : <span className={s.logo}>{inner}</span>;
}

/** Barra superior de cada pantalla, con botón para volver. */
export function Barra({ titulo, volver }: { titulo: string; volver?: string }) {
  return (
    <header className={s.bar}>
      {volver ? <Link className={s.iconBtn} href={volver} aria-label="Volver"><IcVolver /></Link> : <span style={{ width: 8 }} />}
      <h2>{titulo}</h2>
    </header>
  );
}

/** Aviso cuando faltan las variables de Supabase, o etiqueta del modo demo. */
export function AvisoModo() {
  const m = modo();
  if (m === "sin-config") return (
    <div className={s.aviso} role="status">
      <b>Falta configurar Supabase</b>
      Esta pantalla necesita <code>NEXT_PUBLIC_SUPABASE_URL</code> y <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> en <code>.env.local</code>.
      Para verla con datos de ejemplo, inicia la web con <code>NEXT_PUBLIC_DEMO=1</code>.
    </div>
  );
  return null;
}

export type Carga<T> =
  | { estado: "cargando" } | { estado: "sin-config" } | { estado: "error"; error: string } | { estado: "ok"; datos: T };

/** Carga datos al montar y cuando cambia `clave`. Devuelve también una función para recargar. */
export function useCarga<T>(clave: string, fn: () => Promise<T>): [Carga<T>, () => void] {
  const [c, setC] = useState<Carga<T>>({ estado: "cargando" });
  const [n, setN] = useState(0);
  const ref = useRef(fn);
  ref.current = fn;
  useEffect(() => {
    let vivo = true;
    if (modo() === "sin-config") { setC({ estado: "sin-config" }); return; }
    ref.current()
      .then((datos) => { if (vivo) setC({ estado: "ok", datos }); })
      .catch((e: unknown) => {
        if (!vivo) return;
        if (e instanceof SinConfiguracion) setC({ estado: "sin-config" });
        else setC({ estado: "error", error: e instanceof Error ? e.message : "Ocurrió un error." });
      });
    return () => { vivo = false; };
  }, [clave, n]);
  const recargar = useCallback(() => setN((x) => x + 1), []);
  return [c, recargar];
}

/** Muestra el estado de una carga que no terminó bien; si terminó bien, dibuja `children`. */
export function Estado<T>({ carga, children }: { carga: Carga<T>; children: (d: T) => ReactNode }) {
  if (carga.estado === "ok") return <>{children(carga.datos)}</>;
  return (
    <main className={s.screen}>
      {carga.estado === "cargando" && <p className={s.busy}>Cargando</p>}
      {carga.estado === "sin-config" && <p className={s.muted}>Sin conexión con la base de datos. Revisa el aviso de arriba.</p>}
      {carga.estado === "error" && (
        <div className={cx(s.note, s.warn)} role="alert"><b>No se pudo cargar</b>{carga.error}
          <Link className={cx(s.btn, s.sec, s.small)} style={{ marginTop: 8 }} href="/mis-mascotas">Ir a mis mascotas</Link>
        </div>
      )}
    </main>
  );
}

export function FotoMascota({ url, alt, alto }: { url: string | null; alt: string; alto: number }) {
  return (
    <div className={s.photo} style={{ height: alto, width: alto }}>
      {url ? <img src={url} alt={alt} /> : <Huella />}
    </div>
  );
}

export const mensajeError = (e: unknown) => (e instanceof Error ? e.message : "Ocurrió un error. Inténtalo otra vez.");
