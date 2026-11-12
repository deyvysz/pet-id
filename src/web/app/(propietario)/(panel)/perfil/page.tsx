"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { actualizarPerfil, cerrarSesion, obtenerPerfil, reiniciarDemo, modo, type Perfil } from "@/components/propietario/datos";
import { TIPO_DOC_TXT } from "@/components/propietario/textos";
import { DEPARTAMENTOS, DISTRITOS, PROVINCIAS } from "@/components/propietario/ubigeo";
import { Barra, Estado, cx, mensajeError, s, useCarga } from "@/components/propietario/ui";

function Formulario({ p }: { p: Perfil }) {
  const router = useRouter();
  const [f, setF] = useState({ nombres: p.nombres, apellidos: p.apellidos, departamento: p.departamento, provincia: p.provincia, distrito: p.distrito });
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const [enviando, setEnviando] = useState(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });
  const provincias = PROVINCIAS[f.departamento];
  const distritos = DISTRITOS[`${f.departamento}/${f.provincia}`];
  const cel = p.celular.replace(/(\d{3})(\d{3})(\d{3})/, "$1 $2 $3");
  // El número de documento se muestra parcialmente.
  const doc = p.numero_documento.replace(/.(?=.{3})/g, "•");

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (!f.nombres.trim() || !f.apellidos.trim() || !f.provincia.trim() || !f.distrito.trim()) { setMsg({ ok: false, t: "Completa todos los campos." }); return; }
    setEnviando(true); setMsg(null);
    try { await actualizarPerfil({ ...f, nombres: f.nombres.trim(), apellidos: f.apellidos.trim() }); setMsg({ ok: true, t: "Cambios guardados." }); }
    catch (err) { setMsg({ ok: false, t: mensajeError(err) }); }
    setEnviando(false);
  }

  return (
    <form className={s.screen} onSubmit={enviar} noValidate>
      <div><p className={s.muted}>Mi cuenta</p><h1>{p.nombres} {p.apellidos}</h1></div>
      <dl className={cx(s.dl, s.card)}>
        <div><dt>Documento</dt><dd>{TIPO_DOC_TXT[p.tipo_documento]}</dd></div>
        <div><dt>Número</dt><dd className={s.mono}>{doc}</dd></div>
        <div><dt>Celular</dt><dd className={s.mono}>+51 {cel}</dd></div>
        <div><dt>Verificación</dt><dd>{p.celular_verificado ? <span className={cx(s.chip, s.ok)}>Verificado</span> : <span className={cx(s.chip, s.warn)}>Pendiente</span>}</dd></div>
        <div className={s.wide}><dd className={s.hint} style={{ fontWeight: 400 }}>Tu documento y tu celular no aparecen en el DNI de tu mascota ni en ninguna página pública. Para cambiarlos, escríbenos.</dd></div>
      </dl>
      <h2 className={s.h2s}>Datos personales</h2>
      <div className={s.two}>
        <div className={s.field}><label htmlFor="p-nom">Nombres</label><input className={s.input} id="p-nom" value={f.nombres} onChange={set("nombres")} /></div>
        <div className={s.field}><label htmlFor="p-ape">Apellidos</label><input className={s.input} id="p-ape" value={f.apellidos} onChange={set("apellidos")} /></div>
      </div>
      <div className={s.two}>
        <div className={s.field}><label htmlFor="p-dep">Departamento</label>
          <select className={s.input} id="p-dep" value={f.departamento} onChange={(e) => {
            const d = e.target.value, pr = PROVINCIAS[d]?.[0] ?? "", l = DISTRITOS[`${d}/${pr}`];
            setF({ ...f, departamento: d, provincia: pr, distrito: l ? l[0] : "" });
          }}>{DEPARTAMENTOS.map((d) => <option key={d}>{d}</option>)}</select></div>
        <div className={s.field}><label htmlFor="p-prov">Provincia</label>
          {provincias
            ? <select className={s.input} id="p-prov" value={f.provincia} onChange={(e) => { const l = DISTRITOS[`${f.departamento}/${e.target.value}`]; setF({ ...f, provincia: e.target.value, distrito: l ? l[0] : "" }); }}>{provincias.map((x) => <option key={x}>{x}</option>)}</select>
            : <input className={s.input} id="p-prov" value={f.provincia} onChange={set("provincia")} />}</div>
      </div>
      <div className={s.field}><label htmlFor="p-dist">Distrito</label>
        {distritos
          ? <select className={s.input} id="p-dist" value={f.distrito} onChange={set("distrito")}>{distritos.map((x) => <option key={x}>{x}</option>)}</select>
          : <input className={s.input} id="p-dist" value={f.distrito} onChange={set("distrito")} />}</div>
      {msg && <p className={msg.ok ? s.hint : s.err} role="status">{msg.t}</p>}
      <button className={s.btn} type="submit" disabled={enviando}>{enviando ? "Guardando" : "Guardar cambios"}</button>
      <div className={s.note}><b>Plan</b>PET ID Free. Los planes de pago llegan en la fase 2.</div>
      <div className={s.spacer} />
      <button className={cx(s.btn, s.sec)} type="button" onClick={async () => { await cerrarSesion(); router.push("/ingresar"); }}>Cerrar sesión</button>
      {modo() === "demo" && <button className={s.linkbtn} type="button" onClick={() => { reiniciarDemo(); router.push("/mis-mascotas"); }}>Reiniciar datos de ejemplo</button>}
    </form>
  );
}

export default function PerfilPagina() {
  const [carga] = useCarga("perfil", async () => {
    const p = await obtenerPerfil();
    if (!p) throw new Error("Aún no completas tu perfil.");
    return p;
  });
  return (
    <>
      <Barra titulo="Mi perfil" volver="/mis-mascotas" />
      <Estado carga={carga}>{(p) => <Formulario p={p} />}</Estado>
    </>
  );
}
