"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { enviarCodigo, guardarPendiente, modo, type Perfil } from "@/components/propietario/datos";
import { TIPO_DOC_TXT } from "@/components/propietario/textos";
import { DEPARTAMENTOS, DISTRITOS, PROVINCIAS } from "@/components/propietario/ubigeo";
import { Barra, mensajeError, s } from "@/components/propietario/ui";

type Doc = Perfil["tipo_documento"];

export default function CrearCuenta() {
  const router = useRouter();
  const [f, setF] = useState({
    nombres: "", apellidos: "", tipo_documento: "DNI" as Doc, numero_documento: "", celular: "",
    departamento: "Lima", provincia: "Lima", distrito: "Miraflores",
  });
  const [terminos, setTerminos] = useState(false);
  const [privacidad, setPrivacidad] = useState(false);
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });

  const provincias = PROVINCIAS[f.departamento];
  const distritos = DISTRITOS[`${f.departamento}/${f.provincia}`];

  function cambiarDepartamento(e: React.ChangeEvent<HTMLSelectElement>) {
    const d = e.target.value, p = PROVINCIAS[d]?.[0] ?? "", lista = DISTRITOS[`${d}/${p}`];
    setF({ ...f, departamento: d, provincia: p, distrito: lista ? lista[0] : "" });
  }
  function cambiarProvincia(e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) {
    const p = e.target.value, lista = DISTRITOS[`${f.departamento}/${p}`];
    setF({ ...f, provincia: p, distrito: lista ? lista[0] : "" });
  }

  function validar(): string {
    if (!f.nombres.trim() || !f.apellidos.trim()) return "Escribe tus nombres y apellidos.";
    const doc = f.numero_documento.trim();
    if (f.tipo_documento === "DNI" && !/^\d{8}$/.test(doc)) return "El DNI tiene 8 dígitos.";
    if (f.tipo_documento !== "DNI" && !/^[A-Za-z0-9]{6,12}$/.test(doc)) return "Revisa el número de documento (6 a 12 letras o números).";
    if (!/^9\d{8}$/.test(f.celular.replace(/\D/g, ""))) return "Escribe tu celular de 9 dígitos (empieza con 9).";
    if (!f.provincia.trim() || !f.distrito.trim()) return "Completa tu provincia y distrito.";
    if (!terminos || !privacidad) return "Para crear la cuenta debes aceptar los términos y la política de privacidad.";
    return "";
  }

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    const v = validar();
    if (v) { setError(v); return; }
    setError(""); setEnviando(true);
    const celular = f.celular.replace(/\D/g, "");
    try {
      await enviarCodigo(celular, true);
      guardarPendiente({
        celular, modo: "registro",
        perfil: { ...f, nombres: f.nombres.trim(), apellidos: f.apellidos.trim(), numero_documento: f.numero_documento.trim().toUpperCase(), celular },
      });
      router.push("/verificar");
    } catch (err) {
      setError(mensajeError(err));
      setEnviando(false);
    }
  }

  return (
    <>
      <Barra titulo="Crear cuenta" volver="/" />
      <form className={s.screen} onSubmit={enviar} noValidate>
        <p className={s.muted}>Paso 1 de 4: tu cuenta.</p>
        <div className={s.two}>
          <div className={s.field}><label htmlFor="u-nom">Nombres</label><input className={s.input} id="u-nom" autoComplete="given-name" value={f.nombres} onChange={set("nombres")} /></div>
          <div className={s.field}><label htmlFor="u-ape">Apellidos</label><input className={s.input} id="u-ape" autoComplete="family-name" value={f.apellidos} onChange={set("apellidos")} /></div>
        </div>
        <div className={s.two}>
          <div className={s.field}><label htmlFor="u-tipo">Documento</label>
            <select className={s.input} id="u-tipo" value={f.tipo_documento} onChange={set("tipo_documento")}>
              {(Object.keys(TIPO_DOC_TXT) as Doc[]).map((k) => <option key={k} value={k}>{TIPO_DOC_TXT[k]}</option>)}
            </select></div>
          <div className={s.field}><label htmlFor="u-doc">Número</label>
            <input className={`${s.input} ${s.mono}`} id="u-doc" inputMode={f.tipo_documento === "DNI" ? "numeric" : "text"} maxLength={12} value={f.numero_documento} onChange={set("numero_documento")} /></div>
        </div>
        <span className={s.hint} style={{ marginTop: -8 }}>Tu número de documento no aparece en el DNI de tu mascota ni en ninguna página pública.</span>
        <div className={s.field}><label htmlFor="u-cel">Celular</label>
          <div className={s.prefix}><span>+51</span>
            <input className={`${s.input} ${s.mono}`} id="u-cel" type="tel" inputMode="numeric" autoComplete="tel-national" maxLength={11} value={f.celular} onChange={set("celular")} placeholder="987 654 321" />
          </div>
          <span className={s.hint}>Te enviaremos un código por SMS para verificarlo.</span>
        </div>
        <div className={s.two}>
          <div className={s.field}><label htmlFor="u-dep">Departamento</label>
            <select className={s.input} id="u-dep" value={f.departamento} onChange={cambiarDepartamento}>
              {DEPARTAMENTOS.map((d) => <option key={d}>{d}</option>)}
            </select></div>
          <div className={s.field}><label htmlFor="u-prov">Provincia</label>
            {provincias
              ? <select className={s.input} id="u-prov" value={f.provincia} onChange={cambiarProvincia}>{provincias.map((p) => <option key={p}>{p}</option>)}</select>
              : <input className={s.input} id="u-prov" value={f.provincia} onChange={cambiarProvincia} />}
          </div>
        </div>
        <div className={s.field}><label htmlFor="u-dist">Distrito</label>
          {distritos
            ? <select className={s.input} id="u-dist" value={f.distrito} onChange={set("distrito")}>{distritos.map((d) => <option key={d}>{d}</option>)}</select>
            : <input className={s.input} id="u-dist" value={f.distrito} onChange={set("distrito")} />}
        </div>
        <label className={s.check} htmlFor="c-terms"><input type="checkbox" id="c-terms" checked={terminos} onChange={(e) => setTerminos(e.target.checked)} /><span>Acepto los términos y condiciones.</span></label>
        <label className={s.check} htmlFor="c-priv"><input type="checkbox" id="c-priv" checked={privacidad} onChange={(e) => setPrivacidad(e.target.checked)} /><span>Autorizo el tratamiento de mis datos personales según la política de privacidad.</span></label>
        {error && <p className={s.err} role="alert">{error}</p>}
        <div className={s.spacer} />
        <button className={s.btn} type="submit" disabled={enviando || modo() === "sin-config"}>{enviando ? "Enviando código" : "Crear cuenta"}</button>
        <p className={`${s.center} ${s.muted}`}>¿Ya tienes cuenta? <Link href="/ingresar">Inicia sesión</Link></p>
      </form>
    </>
  );
}
