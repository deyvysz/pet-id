"use client";
/* eslint-disable @next/next/no-img-element -- vistas previas con object URL o URL firmada */
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { FOTOS_OBLIGATORIAS, type TipoFoto } from "@/lib/contratos";
import { analizarFoto, type Analisis } from "@/components/propietario/analizarFoto";
import { modo, obtenerMascota, quitarFoto, subirFoto, type MascotaVista } from "@/components/propietario/datos";
import { ICONO_TOMA } from "@/components/propietario/iconos";
import { MOTIVO_TXT, TOMAS } from "@/components/propietario/textos";
import { Barra, Estado, cx, mensajeError, s, useCarga } from "@/components/propietario/ui";

type Toma = (typeof TOMAS)[number];
interface Borrador { analisis?: Analisis; ocupado?: string; error?: string }

function TarjetaToma({ toma, m, obligatoria, borrador, elegir, usarIgual, quitar }: {
  toma: Toma; m: MascotaVista; obligatoria: boolean; borrador: Borrador;
  elegir: (f: File) => void; usarIgual: () => void; quitar: () => void;
}) {
  const foto = m.fotos.find((f) => f.tipo === toma.tipo);
  const id = `toma-${toma.tipo}`;
  const input = <input className={s.vh} type="file" accept="image/*" capture="environment" id={id}
    onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) elegir(f); }} />;

  let chip: React.ReactNode, cls = "", cuerpo: React.ReactNode;
  if (borrador.ocupado) {
    chip = <span className={s.chip}>Revisando</span>;
    cuerpo = <p className={s.busy}>{borrador.ocupado}</p>;
  } else if (borrador.analisis) {
    chip = <span className={cx(s.chip, s.warn)}>Revisar</span>; cls = s.warn;
    cuerpo = <>
      <div className={s.shotThumb}><img src={borrador.analisis.url} alt={`${toma.t} de ${m.nombre}`} /></div>
      <ul className={s.issues}>{borrador.analisis.problemas.map((p) => <li key={p}>{p}</li>)}</ul>
      <div className={s.btnRow}>
        <label className={cx(s.btn, s.small)} htmlFor={id}>Tomar otra</label>
        <button className={cx(s.btn, s.sec, s.small)} type="button" onClick={usarIgual}>Usar igual</button>
      </div>
    </>;
  } else if (foto) {
    const rech = foto.estado === "rechazada";
    if (rech) { chip = <span className={cx(s.chip, s.lost)}>Rechazada</span>; cls = s.lost; }
    else if (foto.estado === "lista") { chip = <span className={cx(s.chip, s.ok)}>Lista</span>; cls = s.ok; }
    else chip = <span className={cx(s.chip, s.warn)}>Pendiente</span>;
    cuerpo = <>
      <div className={s.shotThumb}>{foto.url && <img src={foto.url} alt={`${toma.t} de ${m.nombre}`} />}</div>
      {rech && <ul className={cx(s.issues, s.lost)}><li>{foto.motivo_rechazo ? MOTIVO_TXT[foto.motivo_rechazo] : "No sirve para el reconocimiento."} Toma otra.</li></ul>}
      {!rech && foto.estado !== "lista" && <p className={s.hint}>La estamos procesando para el reconocimiento. Puedes seguir con las demás.</p>}
      <div className={s.btnRow}>
        <label className={cx(s.btn, rech ? "" : s.sec, s.small)} htmlFor={id}>{rech ? "Tomar otra" : "Cambiar foto"}</label>
        <button className={cx(s.btn, s.sec, s.small)} type="button" onClick={quitar}>Quitar</button>
      </div>
    </>;
  } else {
    chip = <span className={s.chip}>{obligatoria ? "Falta" : "Opcional"}</span>;
    cuerpo = <label className={cx(s.btn, obligatoria ? "" : s.sec, s.small)} htmlFor={id}>Tomar o subir foto</label>;
  }

  return (
    <article className={cx(s.shot, cls)}>
      <div className={s.shotHead}>
        <div className={s.shotIc}>{ICONO_TOMA[toma.tipo]}</div>
        <div><div className={s.shotTitle}>{toma.t} {chip}</div><p className={s.muted}>{toma.d}</p></div>
      </div>
      {cuerpo}
      {borrador.error && <p className={s.err} role="alert">{borrador.error}</p>}
      {input}
    </article>
  );
}

export default function Fotos() {
  const { id } = useParams<{ id: string }>();
  const [carga, recargar] = useCarga(`fotos-${id}`, () => obtenerMascota(id));
  const [borradores, setBorradores] = useState<Partial<Record<TipoFoto, Borrador>>>({});
  const setB = (t: TipoFoto, b: Borrador) => setBorradores((x) => ({ ...x, [t]: b }));

  // Mientras haya fotos en proceso, se consulta su estado cada 8 segundos.
  const enProceso = carga.estado === "ok" && carga.datos.fotos.some((f) => f.estado === "pendiente" || f.estado === "procesando");
  useEffect(() => {
    if (!enProceso || modo() !== "supabase") return;
    const t = setInterval(recargar, 8000);
    return () => clearInterval(t);
  }, [enProceso, recargar]);

  async function subir(m: MascotaVista, tipo: TipoFoto, a: Analisis) {
    setB(tipo, { ocupado: "Subiendo la foto" });
    try { await subirFoto(m, tipo, a.jpg); setB(tipo, {}); recargar(); }
    catch (e) { setB(tipo, { analisis: a.problemas.length ? a : undefined, error: mensajeError(e) }); }
  }
  async function elegir(m: MascotaVista, tipo: TipoFoto, file: File) {
    setB(tipo, { ocupado: "Revisando tamaño, luz y enfoque" });
    try {
      const a = await analizarFoto(file);
      if (a.problemas.length) setB(tipo, { analisis: a });
      else await subir(m, tipo, a);
    } catch (e) { setB(tipo, { error: mensajeError(e) }); }
  }
  async function quitar(m: MascotaVista, tipo: TipoFoto) {
    const f = m.fotos.find((x) => x.tipo === tipo);
    if (!f) return;
    try { await quitarFoto(f); recargar(); } catch (e) { setB(tipo, { error: mensajeError(e) }); }
  }

  const nombre = carga.estado === "ok" ? carga.datos.nombre : "tu mascota";
  return (
    <>
      <Barra titulo={`Fotos de ${nombre}`} volver="/mis-mascotas" />
      <Estado carga={carga}>{(m) => {
        const valida = (t: TipoFoto) => m.fotos.some((f) => f.tipo === t && f.estado !== "rechazada");
        const rd = FOTOS_OBLIGATORIAS.filter(valida).length, total = FOTOS_OBLIGATORIAS.length;
        const marcas = valida("marcas");
        const etiqueta = rd < total ? "Incompleto" : marcas ? "Completo" : "Mínimo completo";
        const texto = rd < total
          ? `${total - rd === 1 ? "Falta 1 foto obligatoria" : `Faltan ${total - rd} fotos obligatorias`}. Sin ellas, ${m.nombre} no aparece en la búsqueda por foto.`
          : m.lista_para_busqueda
            ? `${m.nombre} ya aparece en la búsqueda por foto.`
            : `Tienes las fotos obligatorias. ${m.nombre} entra en la búsqueda por foto cuando terminemos de procesarlas.`;
        const props = (t: Toma, ob: boolean) => ({
          toma: t, m, obligatoria: ob, borrador: borradores[t.tipo] ?? {},
          elegir: (f: File) => elegir(m, t.tipo, f),
          usarIgual: () => { const a = borradores[t.tipo]?.analisis; if (a) subir(m, t.tipo, a); },
          quitar: () => quitar(m, t.tipo),
        });
        return (
          <main className={s.screen}>
            <p className={s.muted}>Paso 4 de 4: fotos para reconocimiento.</p>
            <p className={s.lead}>Con estas fotos comparamos a {m.nombre} con las mascotas que otras personas encuentran. Cada toma muestra rasgos distintos.</p>
            <section className={s.meterCard} aria-label="Estado de las fotos">
              <div className={s.meterTop}><strong>{etiqueta}</strong><span className={s.muted}>Obligatorias {rd} de {total} · Marcas {marcas ? "1" : "0"} de 1</span></div>
              <div className={s.meter} aria-hidden="true">
                {FOTOS_OBLIGATORIAS.map((t, i) => <span key={t} className={i < rd ? s.req : undefined} />)}
                <span className={marcas ? s.rec : undefined} />
              </div>
              <div className={s.meterLegend}><span><i style={{ background: "var(--brand)" }} />Obligatoria</span><span><i style={{ background: "var(--accent)" }} />Opcional</span></div>
              <p>{texto}</p>
            </section>
            <div className={s.note}><b>Antes de empezar</b><ul><li>Luz de día, sin flash.</li><li>Una sola mascota en cada foto.</li><li>Fotos de este mes, no de cuando era cachorro.</li></ul></div>
            <h3 className={s.sectionH}>Obligatorias</h3>
            <div className={s.shots}>{TOMAS.filter((t) => t.tipo !== "marcas").map((t) => <TarjetaToma key={t.tipo} {...props(t, true)} />)}</div>
            <h3 className={s.sectionH}>Opcional</h3>
            <div className={s.shots}>{TOMAS.filter((t) => t.tipo === "marcas").map((t) => <TarjetaToma key={t.tipo} {...props(t, false)} />)}</div>
            <p className={s.hint}>Antes de subir cada foto le quitamos la ubicación GPS y los demás datos internos del archivo.</p>
            {rd === total
              ? <Link className={s.btn} href={`/mascotas/${m.id}/dni`}>Guardar y continuar</Link>
              : <>
                <Link className={cx(s.btn, s.sec)} href={`/mascotas/${m.id}/dni`}>Guardar y completar después</Link>
                <p className={cx(s.hint, s.center)}>Puedes seguir, pero la búsqueda por foto no se activa hasta tener las obligatorias.</p>
              </>}
          </main>
        );
      }}</Estado>
    </>
  );
}
