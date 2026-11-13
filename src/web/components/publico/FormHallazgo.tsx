"use client";
// Búsqueda por foto: quien encontró una mascota sube su foto y datos opcionales (POST /api/v1/hallazgos).
/* eslint-disable @next/next/no-img-element */
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { HallazgoRespuesta } from "@/lib/contratos";
import { COLORES, MOTIVO_TXT } from "./formato";
import { SelectorUbigeo } from "@/components/comun/SelectorUbigeo";
import type { Ubicacion } from "@/lib/ubigeo";
import { guardarBusqueda, prepararFoto, type FotoPreparada } from "./foto";
import { IcCamara } from "./iconos";

export default function FormHallazgo() {
  const router = useRouter();
  const [foto, setFoto] = useState<FotoPreparada | null>(null);
  const [revisando, setRevisando] = useState(false);
  const [especie, setEspecie] = useState("");
  const [color, setColor] = useState("");
  const [ubic, setUbic] = useState<Ubicacion | null>(null);
  const [ubigeo, setUbigeo] = useState<string | null>(null);
  const distrito = ubic?.distrito ?? "";
  const [contacto, setContacto] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [buscando, setBuscando] = useState(false);

  async function elegir(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    setError(null);
    setRevisando(true);
    try { setFoto(await prepararFoto(f)); } catch (err) {
      setError(err instanceof Error ? err.message : "No pudimos leer la foto.");
    } finally { setRevisando(false); }
  }

  async function buscar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!foto) return setError("Primero toma o sube una foto de la mascota.");
    const c = contacto.trim();
    if (c && !c.includes("@") && !/^\+?[\d\s-]{6,20}$/.test(c)) return setError("Revisa tu teléfono o correo.");

    const fd = new FormData();
    fd.append("foto", foto.archivo, "hallazgo.jpg");
    if (especie) fd.append("especie", especie);
    if (ubigeo) fd.append("ubigeo", ubigeo);
    if (color) fd.append("color", color);
    if (c) fd.append(c.includes("@") ? "correo" : "celular", c);

    setBuscando(true);
    try {
      const r = await fetch("/api/v1/hallazgos", { method: "POST", body: fd });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || "No pudimos hacer la búsqueda. Vuelve a intentarlo.");
      const resp = j as HallazgoRespuesta;
      if (!resp.detectado) {
        setError(resp.motivo ? MOTIVO_TXT[resp.motivo] : MOTIVO_TXT.sin_mascota);
        setBuscando(false);
        return;
      }
      guardarBusqueda({ respuesta: resp, vista: foto.vista, especie, distrito });
      router.push(`/encontre/resultados?h=${resp.hallazgo_id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No pudimos hacer la búsqueda.");
      setBuscando(false);
    }
  }

  let subida: React.ReactNode;
  if (revisando) subida = <div className="drop"><p className="busy">Revisando tamaño, luz y enfoque</p></div>;
  else if (foto) subida = (
    <div className={`shot ${foto.observaciones.length ? "warn" : "ok"}`}>
      <div className="shot-thumb"><img src={foto.vista} alt="Foto de la mascota encontrada" /></div>
      {foto.observaciones.length ? (
        <>
          <ul className="issues">{foto.observaciones.map((t) => <li key={t}>{t}</li>)}</ul>
          <p className="hint">Puedes buscar igual, pero con otra foto los resultados suelen ser mejores.</p>
        </>
      ) : <span className="chip ok" style={{ alignSelf: "flex-start" }}>Foto lista</span>}
      <label className="btn sec small" htmlFor="find-photo">Cambiar foto</label>
    </div>
  );
  else subida = (
    <label className="drop" htmlFor="find-photo">
      <IcCamara /><span>Tomar o subir una foto</span><span className="hint">Mejor si se ve la cara de frente. Máximo 8 MB.</span>
    </label>
  );

  return (
    <form className="screen" onSubmit={buscar} noValidate>
      <p className="lead">Sube una foto de la mascota que encontraste. La comparamos con las mascotas reportadas como perdidas.</p>
      {subida}
      <input className="vh" type="file" accept="image/*" id="find-photo" onChange={elegir} />
      <p className="hint">Encuadra solo a la mascota: que no salgan personas, placas de autos ni fachadas.</p>
      <fieldset className="field">
        <legend className="legend" style={{ marginBottom: 6 }}>Especie</legend>
        <div className="pills">
          {[["perro", "Perro"], ["gato", "Gato"], ["", "No sé"]].map(([v, t]) => (
            <label className="pill" key={t}>
              <input type="radio" name="f-species" value={v} checked={especie === v} onChange={() => setEspecie(v)} /><span>{t}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <div className="field">
        <label htmlFor="f-color">Color principal (opcional)</label>
        <select className="input" id="f-color" value={color} onChange={(e) => setColor(e.target.value)}>
          <option value="">No sé</option>{COLORES.map((c) => <option key={c}>{c}</option>)}
        </select>
      </div>
      <p className="hint" style={{ margin: 0 }}>¿Dónde está? (opcional). Si eliges el distrito, primero buscamos mascotas perdidas en esa zona.</p>
      <SelectorUbigeo id="f-ubi" valor={ubic} alCambiar={(u, c) => { setUbic(u); setUbigeo(c); }} opcional
        etiquetaDistrito="Distrito" claseCampo="field" claseControl="input" claseFila="two" />
      <div className="field">
        <label htmlFor="f-contact">Tu teléfono o correo (opcional)</label>
        <input className="input" id="f-contact" maxLength={120} value={contacto} onChange={(e) => setContacto(e.target.value)} placeholder="Para que la familia te contacte" />
      </div>
      {error && <p className="err" role="alert">{error}</p>}
      <div className="spacer" />
      <button className="btn" type="submit" disabled={buscando || revisando}>{buscando ? "Buscando parecidos…" : "Buscar parecidos"}</button>
    </form>
  );
}
