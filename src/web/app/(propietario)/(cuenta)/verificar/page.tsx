"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { enviarCodigo, leerPendiente, modo, verificarCodigo, type Pendiente } from "@/components/propietario/datos";
import { IcCelular } from "@/components/propietario/iconos";
import { Barra, mensajeError, s } from "@/components/propietario/ui";

export default function Verificar() {
  const router = useRouter();
  const [pend, setPend] = useState<Pendiente | null | undefined>(undefined);
  const [codigo, setCodigo] = useState("");
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState("");
  const [enviando, setEnviando] = useState(false);

  useEffect(() => { setPend(leerPendiente()); }, []);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (!/^\d{6}$/.test(codigo)) { setError("El código tiene 6 dígitos."); return; }
    setError(""); setEnviando(true);
    try {
      router.push(await verificarCodigo(codigo));
    } catch (err) {
      setError(mensajeError(err));
      setEnviando(false);
    }
  }

  async function reenviar() {
    if (!pend) return;
    try { await enviarCodigo(pend.celular, pend.modo === "registro"); setAviso("Te enviamos un código nuevo."); }
    catch (err) { setError(mensajeError(err)); }
  }

  const volver = pend?.modo === "ingreso" ? "/ingresar" : "/crear-cuenta";
  const cel = pend ? pend.celular.replace(/(\d{3})(\d{3})(\d{3})/, "$1 $2 $3") : "";

  return (
    <>
      <Barra titulo="Verifica tu celular" volver={volver} />
      <form className={s.screen} onSubmit={enviar} noValidate>
        {pend?.modo === "registro" && <p className={s.muted}>Paso 2 de 4: verificación.</p>}
        <div className={s.roundIc}><IcCelular /></div>
        <h1>Ingresa el código</h1>
        {pend === null ? (
          <div className={`${s.note} ${s.warn}`}><b>Sin código pendiente</b>
            Primero escribe tu celular para recibir un código.
            <Link className={`${s.btn} ${s.sec} ${s.small}`} style={{ marginTop: 8 }} href="/ingresar">Iniciar sesión</Link>
          </div>
        ) : (
          <>
            <p className={s.lead}>Enviamos un código de 6 dígitos por SMS al +51 {cel}.</p>
            <div className={s.field}><label htmlFor="otp">Código</label>
              <input className={`${s.input} ${s.otp}`} id="otp" inputMode="numeric" autoComplete="one-time-code" maxLength={6}
                placeholder="······" value={codigo} onChange={(e) => setCodigo(e.target.value.replace(/\D/g, ""))} />
            </div>
            {modo() === "demo" && <p className={s.hint}>Modo demo: el código de prueba es 123456.</p>}
            {error && <p className={s.err} role="alert">{error}</p>}
            {aviso && <p className={s.hint} role="status">{aviso}</p>}
            <button className={s.btn} type="submit" disabled={enviando || modo() === "sin-config"}>{enviando ? "Verificando" : "Verificar"}</button>
            <button className={s.linkbtn} type="button" onClick={reenviar}>Reenviar código</button>
          </>
        )}
      </form>
    </>
  );
}
