"use client";
// Formulario de contacto (POST /api/v1/contacto) y pantalla de mensaje enviado.
import Link from "next/link";
import { useState } from "react";
import type { ContactoEntrada } from "@/lib/contratos";
import { SelectorUbigeo } from "@/components/comun/SelectorUbigeo";
import type { Ubicacion } from "@/lib/ubigeo";
import { IcCheckGrande } from "./iconos";

export default function FormContacto({ petId, nombreMascota, hallazgoId }: { petId: string; nombreMascota: string; hallazgoId?: string }) {
  const [nombre, setNombre] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [celular, setCelular] = useState("");
  const [correo, setCorreo] = useState("");
  const [compartir, setCompartir] = useState(false);
  const [ubic, setUbic] = useState<Ubicacion | null>({ departamento: "Lima", provincia: "Lima", distrito: "Miraflores" });
  const distrito = ubic ? `${ubic.distrito} (${ubic.provincia}, ${ubic.departamento})` : "";
  const [web, setWeb] = useState(""); // trampa para robots: un humano no la ve ni la llena
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState<{ conTelefono: boolean } | null>(null);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!nombre.trim()) return setError("Escribe tu nombre.");
    if (mensaje.trim().length < 5) return setError(`Escribe dónde está ${nombreMascota} o cómo encontrarte.`);
    if (celular && !/^\+?[\d\s-]{6,20}$/.test(celular.trim())) return setError("Revisa tu teléfono: solo números, espacios o guiones.");
    if (correo && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo.trim())) return setError("Revisa tu correo.");

    const cuerpo: ContactoEntrada & { web?: string } = {
      pet_id: petId,
      hallazgo_id: hallazgoId,
      nombre: nombre.trim(),
      celular: celular.trim() || undefined,
      correo: correo.trim() || undefined,
      mensaje: compartir ? `${mensaje.trim()}\n\nDistrito aproximado: ${distrito}` : mensaje.trim(),
      web: web || undefined,
    };
    setEnviando(true);
    try {
      const r = await fetch("/api/v1/contacto", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(cuerpo) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || "No pudimos enviar tu mensaje. Vuelve a intentarlo.");
      setEnviado({ conTelefono: !!cuerpo.celular });
      window.scrollTo(0, 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No pudimos enviar tu mensaje.");
    } finally {
      setEnviando(false);
    }
  }

  if (enviado) {
    return (
      <main className="screen" style={{ paddingTop: 48 }}>
        <div className="big-ic ok"><IcCheckGrande /></div>
        <h1>Mensaje enviado</h1>
        <p className="lead">
          Enviamos tu aviso al correo de la familia de {nombreMascota}.{" "}
          {enviado.conTelefono ? "Dejaste tu teléfono, así que pueden llamarte." : "No dejaste teléfono: si quieres que te llamen, vuelve y escríbelo."}
        </p>
        <div className="note"><b>Mientras esperas</b>Si puedes, deja a {nombreMascota} en un lugar cerrado y con agua. No le des comida ni medicamentos.</div>
        <div className="spacer" />
        <Link className="btn sec" href={`/m/${petId}`}>Volver a la página de {nombreMascota}</Link>
      </main>
    );
  }

  return (
    <form className="screen" onSubmit={enviar} noValidate>
      <div className="field">
        <label htmlFor="c-msg">Tu mensaje</label>
        <textarea className="input" id="c-msg" maxLength={1000} value={mensaje} onChange={(e) => setMensaje(e.target.value)}
          placeholder="Ej.: Lo encontré en Av. Angamos, cerca de una panadería. Lo tengo conmigo." />
      </div>
      <div className="field">
        <label htmlFor="c-nombre">Tu nombre</label>
        <input className="input" id="c-nombre" autoComplete="given-name" maxLength={80} value={nombre} onChange={(e) => setNombre(e.target.value)} />
      </div>
      <div className="two">
        <div className="field">
          <label htmlFor="c-phone">Tu teléfono (opcional)</label>
          <input className="input" id="c-phone" type="tel" inputMode="tel" autoComplete="tel" maxLength={20} value={celular}
            onChange={(e) => setCelular(e.target.value)} placeholder="Para que te llamen" />
        </div>
        <div className="field">
          <label htmlFor="c-mail">Tu correo (opcional)</label>
          <input className="input" id="c-mail" type="email" autoComplete="email" maxLength={120} value={correo} onChange={(e) => setCorreo(e.target.value)} />
        </div>
      </div>
      <div className="toggles">
        <label className="tg" htmlFor="c-loc">
          <span>Compartir mi ubicación aproximada<small>Solo el distrito, no la dirección</small></span>
          <input className="sw" type="checkbox" role="switch" id="c-loc" checked={compartir} onChange={(e) => setCompartir(e.target.checked)} />
        </label>
      </div>
      {compartir && (
        <SelectorUbigeo id="c-where" valor={ubic} alCambiar={(u) => setUbic(u)} etiquetaDistrito="¿En qué distrito estás?"
          claseCampo="field" claseControl="input" claseFila="two" />
      )}
      <div className="vh" aria-hidden="true">
        <label htmlFor="c-web">No llenar</label>
        <input id="c-web" tabIndex={-1} autoComplete="off" value={web} onChange={(e) => setWeb(e.target.value)} />
      </div>
      <div className="note">La familia recibe tu mensaje por correo. Si no dejas tu teléfono ni tu correo, no podrá responderte.</div>
      {error && <p className="err" role="alert">{error}</p>}
      <div className="spacer" />
      <button className="btn" type="submit" disabled={enviando}>{enviando ? "Enviando…" : "Enviar mensaje"}</button>
    </form>
  );
}
