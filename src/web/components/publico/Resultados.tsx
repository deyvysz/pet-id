"use client";
// Candidatos de la búsqueda por foto. Lee la última búsqueda de sessionStorage; en modo demo, si no hay, usa candidatos simulados.
import Link from "next/link";
import { useEffect, useState } from "react";
import { UMBRAL_CANDIDATO } from "@/lib/contratos";
import { CANDIDATOS_DEMO, FONDO_DEMO, esDemo } from "./demo";
import { leerBusqueda, type BusquedaGuardada } from "./foto";
import { ESTADO_TXT } from "./formato";
import { Miniatura } from "./FotoMascota";

const DEMO: BusquedaGuardada = {
  respuesta: { hallazgo_id: "00000000-0000-4000-8000-000000000000", detectado: true, candidatos: CANDIDATOS_DEMO },
  vista: null,
};

export default function Resultados() {
  const [b, setB] = useState<BusquedaGuardada | null | undefined>(undefined);
  useEffect(() => {
    // sessionStorage solo existe en el navegador; se lee después de montar.
    setB(leerBusqueda() ?? (esDemo() ? DEMO : null));
  }, []);

  if (b === undefined) return <main className="screen"><p className="busy">Cargando resultados</p></main>;
  if (b === null) {
    return (
      <main className="screen">
        <p className="lead">No hay una búsqueda reciente en este navegador.</p>
        <Link className="btn" href="/encontre">Buscar por foto</Link>
      </main>
    );
  }

  const lista = b.respuesta.candidatos.filter((c) => c.puntaje >= UMBRAL_CANDIDATO).slice(0, 5);
  const hid = b.respuesta.hallazgo_id;
  return (
    <main className="screen">
      <p className="lead">
        {lista.length
          ? `${lista.length} ${lista.length === 1 ? "mascota perdida se parece" : "mascotas perdidas se parecen"} a tu foto. La primera es la más parecida.`
          : "No encontramos mascotas perdidas parecidas a tu foto."}
      </p>
      <div className="note warn">
        <b>Posibles coincidencias</b>
        Son mascotas parecidas, no identificaciones definitivas. Compara las fotos tú mismo: orejas, manchas, color de ojos y cola.
      </div>
      {esDemo() && <p className="hint">Resultados de ejemplo: el modo demo no usa el servicio de reconocimiento.</p>}
      {lista.length > 0 && (
        <div className="results">
          {lista.map((c, i) => {
            const est = ESTADO_TXT[c.estado];
            return (
              <article className="card" key={c.pet_id}>
                <div className="res-top">
                  <span className="rank">{i + 1} de {lista.length}</span>
                  <span className="score">{Math.round(c.puntaje * 100)} % <small>de parecido</small></span>
                </div>
                <div className="pair">
                  <div><span className="cap">Tu foto</span><Miniatura url={b.vista} alt="Tu foto" fondo="var(--sunk)" /></div>
                  <div><span className="cap">{c.nombre}</span><Miniatura url={c.foto_url} alt={`Foto de ${c.nombre}`} fondo={FONDO_DEMO[c.pet_id]} /></div>
                </div>
                <div className="chips"><span className={`chip ${est.cls}`}>{est.t}</span><span className="chip mono">{c.pet_id}</span></div>
                <div className="btn-row">
                  <Link className="btn small" href={`/m/${c.pet_id}/contactar?hallazgo=${hid}`}>Contactar</Link>
                  <Link className="btn sec small" href={`/m/${c.pet_id}`}>Ver su página</Link>
                </div>
              </article>
            );
          })}
        </div>
      )}
      <div className="note">
        <b>Mientras esperas</b>
        Si puedes, deja a la mascota en un lugar cerrado y con agua. Una veterinaria cercana puede revisar si tiene microchip.
      </div>
      <div className="spacer" />
      <Link className="btn sec" href="/encontre">Ninguno es: buscar con otra foto</Link>
    </main>
  );
}
