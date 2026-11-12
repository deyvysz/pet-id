"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { FOTOS_OBLIGATORIAS } from "@/lib/contratos";
import {
  marcarEncontrada, modo, obtenerMascota, obtenerPerfil, reportarPerdida, reporteActivo,
  type MascotaVista, type ReporteNuevo,
} from "@/components/propietario/datos";
import { fecha, hoyISO } from "@/components/propietario/textos";
import { DISTRITOS_LIMA_CALLAO } from "@/components/propietario/ubigeo";
import { Barra, Estado, cx, mensajeError, s, useCarga } from "@/components/propietario/ui";

const hora = (iso: string) => new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "America/Lima" });
const fechaLima = (iso: string) => new Date(iso).toLocaleDateString("en-CA", { timeZone: "America/Lima" });

function Formulario({ m, inicial, alGuardar }: { m: MascotaVista; inicial: ReporteNuevo; alGuardar: () => void }) {
  const [f, setF] = useState({
    fecha: fechaLima(inicial.fecha_perdida), hora: hora(inicial.fecha_perdida),
    distrito: inicial.distrito, referencia: inicial.referencia ?? "", mensaje: inicial.mensaje ?? "",
  });
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });
  const conFotos = FOTOS_OBLIGATORIAS.every((t) => m.fotos.some((x) => x.tipo === t && x.estado !== "rechazada"));
  const ella = m.sexo === "hembra";

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (!f.fecha || f.fecha > hoyISO()) return setError("Indica una fecha válida (hoy o antes).");
    if (!f.distrito.trim()) return setError("Indica el distrito donde se perdió.");
    setError(""); setEnviando(true);
    try {
      await reportarPerdida(m.id, {
        fecha_perdida: `${f.fecha}T${f.hora || "12:00"}:00-05:00`, distrito: f.distrito.trim(),
        referencia: f.referencia.trim() || null, mensaje: f.mensaje.trim() || null,
      });
      alGuardar();
    } catch (err) { setError(mensajeError(err)); setEnviando(false); }
  }

  return (
    <form className={s.screen} onSubmit={enviar} noValidate>
      <p className={s.lead}>La página de {m.nombre} mostrará que está {ella ? "perdida" : "perdido"} a quien escanee su placa{conFotos ? ", y aparecerá en la búsqueda por foto de tu zona" : ""}.</p>
      {!conFotos && (
        <div className={cx(s.note, s.warn)}><b>Sin búsqueda por foto</b>{m.nombre} no tiene las fotos obligatorias, así que no aparecerá cuando alguien busque por foto.
          <Link className={cx(s.btn, s.sec, s.small)} href={`/mascotas/${m.id}/fotos`} style={{ marginTop: 8 }}>Completar fotos</Link></div>
      )}
      <div className={s.field}><label htmlFor="r-dist">¿En qué distrito se perdió?</label>
        <input className={s.input} id="r-dist" list="r-distritos" value={f.distrito} onChange={set("distrito")} />
        <datalist id="r-distritos">{DISTRITOS_LIMA_CALLAO.map((d) => <option key={d} value={d} />)}</datalist>
      </div>
      <div className={s.two}>
        <div className={s.field}><label htmlFor="r-fecha">Fecha</label><input className={s.input} type="date" id="r-fecha" max={hoyISO()} value={f.fecha} onChange={set("fecha")} /></div>
        <div className={s.field}><label htmlFor="r-hora">Hora aprox.</label><input className={s.input} type="time" id="r-hora" value={f.hora} onChange={set("hora")} /></div>
      </div>
      <div className={s.field}><label htmlFor="r-ref">Referencia (opcional)</label>
        <input className={s.input} id="r-ref" value={f.referencia} onChange={set("referencia")} placeholder="Ej.: parque Kennedy, cerca de la avenida Larco" /></div>
      <div className={s.field}><label htmlFor="r-msg">Mensaje para quien {ella ? "la" : "lo"} encuentre</label>
        <textarea className={s.input} id="r-msg" value={f.mensaje} onChange={set("mensaje")} placeholder="Ej.: es tímido, no lo persigas. Responde a su nombre." /></div>
      <p className={s.muted}>Solo mostramos el distrito, la referencia y tu mensaje. Tu dirección y tu celular nunca aparecen.</p>
      {error && <p className={s.err} role="alert">{error}</p>}
      <div className={s.spacer} />
      <button className={cx(s.btn, s.danger)} type="submit" disabled={enviando || modo() === "sin-config"}>
        {enviando ? "Guardando" : m.estado === "extraviada" ? "Guardar cambios del aviso" : `Marcar como ${ella ? "perdida" : "perdido"}`}
      </button>
    </form>
  );
}

export default function Reportar() {
  const { id } = useParams<{ id: string }>();
  const [carga, recargar] = useCarga(`reportar-${id}`, async () => {
    const [m, rep, perfil] = await Promise.all([obtenerMascota(id), reporteActivo(id), obtenerPerfil()]);
    return { m, rep, perfil };
  });
  const [editando, setEditando] = useState(false);
  const [error, setError] = useState("");
  const [cerrando, setCerrando] = useState(false);

  const titulo = carga.estado === "ok"
    ? (carga.datos.m.estado === "extraviada" ? "Aviso de extravío" : `${carga.datos.m.nombre} se perdió`) : "Reportar extravío";

  return (
    <>
      <Barra titulo={titulo} volver="/mis-mascotas" />
      <Estado carga={carga}>{({ m, rep, perfil }) => {
        const ella = m.sexo === "hembra";
        if (m.estado === "extraviada" && rep && !editando) {
          const encontrada = async () => {
            setCerrando(true); setError("");
            try { await marcarEncontrada(m.id); recargar(); } catch (e) { setError(mensajeError(e)); }
            setCerrando(false);
          };
          return (
            <>
              <div className={s.ownerband}><strong>{m.nombre} está {ella ? "perdida" : "perdido"}</strong>
                <span>Desde el {fecha(fechaLima(rep.fecha_perdida))}, {hora(rep.fecha_perdida)} · {rep.distrito}</span></div>
              <main className={s.screen}>
                <dl className={cx(s.dl, s.card)}>
                  <div><dt>Distrito</dt><dd>{rep.distrito}</dd></div>
                  <div><dt>Fecha</dt><dd>{fecha(fechaLima(rep.fecha_perdida))}, {hora(rep.fecha_perdida)}</dd></div>
                  <div className={s.wide}><dt>Referencia</dt><dd>{rep.referencia ?? "Sin referencia"}</dd></div>
                  <div className={s.wide}><dt>Mensaje para quien {ella ? "la" : "lo"} encuentre</dt><dd>{rep.mensaje ?? "Sin mensaje"}</dd></div>
                </dl>
                <p className={s.muted}>La página pública de {m.nombre} muestra el aviso y el distrito.
                  {m.lista_para_busqueda ? ` ${m.nombre} aparece en la búsqueda por foto de la zona.` : ""} Si alguien te escribe, el mensaje te llega a tu correo.</p>
                <Link className={cx(s.btn, s.sec)} href={`/m/${m.pet_id}`}>Ver la página pública</Link>
                {error && <p className={s.err} role="alert">{error}</p>}
                <div className={s.spacer} />
                <button className={s.btn} type="button" onClick={encontrada} disabled={cerrando}>{cerrando ? "Guardando" : `Ya ${ella ? "la" : "lo"} encontré`}</button>
                <button className={cx(s.btn, s.sec)} type="button" onClick={() => setEditando(true)}>Editar el aviso</button>
              </main>
            </>
          );
        }
        return (
          <>
            {m.estado === "encontrada" && !editando && (
              <div className={cx(s.note, s.med)} style={{ margin: "16px 20px 0" }}><b>{ella ? "Encontrada" : "Encontrado"}</b>
                Marcaste a {m.nombre} como {ella ? "encontrada" : "encontrado"}. Si vuelve a perderse, repórtalo aquí.</div>
            )}
            <Formulario m={m} alGuardar={() => { setEditando(false); recargar(); }}
              inicial={rep ?? { fecha_perdida: new Date().toISOString(), distrito: perfil?.distrito ?? "", referencia: null, mensaje: null }} />
          </>
        );
      }}</Estado>
    </>
  );
}
