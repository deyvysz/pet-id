"use client";
/* eslint-disable @next/next/no-img-element -- foto del carné con URL firmada */
import Link from "next/link";
import { useParams } from "next/navigation";
import { listarSalud, obtenerMascota, type RegistroSaludVista } from "@/components/propietario/datos";
import { TIPO_SALUD_TXT, estadoProxima, fecha, tituloSalud } from "@/components/propietario/textos";
import { Barra, Estado, cx, s, useCarga } from "@/components/propietario/ui";

export default function Salud() {
  const { id } = useParams<{ id: string }>();
  const [carga] = useCarga(`salud-${id}`, async () => {
    const [m, lista] = await Promise.all([obtenerMascota(id), listarSalud(id)]);
    return { m, lista };
  });

  return (
    <>
      <Barra titulo="Vacunas y controles" volver="/mis-mascotas" />
      <Estado carga={carga}>{({ m, lista }) => {
        const rabia = lista.filter((e) => e.tipo === "vacuna" && /antirr/i.test(e.nombre))[0];
        const er = rabia ? estadoProxima(rabia.proxima_fecha) : null;
        const ultimo: Record<string, RegistroSaludVista> = {};
        lista.forEach((e) => { const k = e.tipo + e.nombre; if (!ultimo[k]) ultimo[k] = e; });
        const prox = Object.values(ultimo).filter((e) => e.proxima_fecha).sort((a, b) => a.proxima_fecha!.localeCompare(b.proxima_fecha!))[0];
        return (
          <main className={s.screen}>
            <section className={s.card}>
              <div className={s.entryTop}><strong>Antirrábica</strong>
                {er ? <span className={cx(s.chip, s[er.cls])}>{er.t}</span> : <span className={cx(s.chip, s.warn)}>Sin registro</span>}</div>
              <p className={s.muted}>{rabia
                ? `Aplicada el ${fecha(rabia.fecha)}${rabia.proxima_fecha ? `. Próxima: ${fecha(rabia.proxima_fecha)}` : ""}.`
                : `No registraste la vacuna antirrábica de ${m.nombre}.`}</p>
              {prox && <p className={s.muted}>Lo próximo: {tituloSalud(prox)}, {fecha(prox.proxima_fecha)}.</p>}
            </section>
            <Link className={s.btn} href={`/mascotas/${id}/salud/nuevo`}>+ Registrar vacuna o control</Link>
            <h3 className={s.sectionH}>Historial ({lista.length})</h3>
            {lista.length ? (
              <div className={s.entries}>{lista.map((e) => {
                const st = estadoProxima(e.proxima_fecha);
                return (
                  <article key={e.id} className={s.entry}>
                    <div className={s.entryTop}><strong>{tituloSalud(e)}</strong>
                      {e.proxima_fecha ? <span className={cx(s.chip, s[st.cls])}>{st.t}</span> : <span className={s.chip}>{TIPO_SALUD_TXT[e.tipo]}</span>}</div>
                    <p className={s.muted}>{e.tipo === "vacuna" || e.tipo === "desparasitacion" ? "Aplicada el" : "Fecha:"} {fecha(e.fecha)}{e.proxima_fecha ? ` · Próxima: ${fecha(e.proxima_fecha)}` : ""}</p>
                    {e.notas && <p>{e.notas}</p>}
                    {e.adjunto_url && <a className={s.carne} href={e.adjunto_url} target="_blank" rel="noreferrer"><img src={e.adjunto_url} alt="Foto del carné" /></a>}
                    {e.declarado_por_propietario && <p className={s.hint}>Declarado por el propietario</p>}
                  </article>
                );
              })}</div>
            ) : <p className={s.muted}>Todavía no hay registros.</p>}
            <p className={s.hint}>Estos registros los ingresas tú y figuran como declarados por el propietario en el DNI y el certificado. Guarda la foto del carné como respaldo para mostrarla en la veterinaria.</p>
          </main>
        );
      }}</Estado>
    </>
  );
}
