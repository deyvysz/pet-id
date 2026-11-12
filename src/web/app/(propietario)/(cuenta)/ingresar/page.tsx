"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { enviarCodigo, guardarPendiente, modo } from "@/components/propietario/datos";
import { Barra, Logo, mensajeError, s } from "@/components/propietario/ui";

export default function Ingresar() {
  const router = useRouter();
  const [celular, setCelular] = useState(modo() === "demo" ? "987654321" : "");
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    const num = celular.replace(/\D/g, "");
    if (!/^9\d{8}$/.test(num)) { setError("Escribe tu celular de 9 dígitos (empieza con 9)."); return; }
    setError(""); setEnviando(true);
    try {
      await enviarCodigo(num, false);
      guardarPendiente({ celular: num, modo: "ingreso" });
      router.push("/verificar");
    } catch (err) {
      setError(mensajeError(err));
      setEnviando(false);
    }
  }

  return (
    <>
      <Barra titulo="Iniciar sesión" volver="/" />
      <form className={s.screen} onSubmit={enviar} noValidate>
        <div style={{ paddingTop: 8 }}><Logo enlace={false} /></div>
        <h1>Hola de nuevo</h1>
        <p className={s.muted}>Te enviamos un código por SMS a tu celular para entrar.</p>
        <div className={s.field}>
          <label htmlFor="l-cel">Celular</label>
          <div className={s.prefix}><span>+51</span>
            <input className={`${s.input} ${s.mono}`} id="l-cel" type="tel" inputMode="numeric" autoComplete="tel-national"
              maxLength={11} value={celular} onChange={(e) => setCelular(e.target.value)} placeholder="987 654 321" />
          </div>
        </div>
        {error && <p className={s.err} role="alert">{error}</p>}
        <button className={s.btn} type="submit" disabled={enviando || modo() === "sin-config"}>
          {enviando ? "Enviando código" : "Enviar código"}
        </button>
        <div className={s.spacer} />
        <p className={`${s.center} ${s.muted}`}>¿Aún no tienes cuenta? <Link href="/crear-cuenta">Regístrate</Link></p>
      </form>
    </>
  );
}
