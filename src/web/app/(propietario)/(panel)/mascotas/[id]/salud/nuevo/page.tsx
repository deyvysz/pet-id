"use client";
/* eslint-disable @next/next/no-img-element -- vista previa con object URL */
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import type { TipoRegistroSalud } from "@/lib/contratos";
import { prepararImagen } from "@/components/propietario/analizarFoto";
import { crearSalud, modo, obtenerMascota } from "@/components/propietario/datos";
import { TIPO_SALUD_TXT, hoyISO, opcionesSalud } from "@/components/propietario/textos";
import { Barra, Estado, cx, mensajeError, s, useCarga } from "@/components/propietario/ui";

const TIPOS = Object.keys(TIPO_SALUD_TXT) as TipoRegistroSalud[];
const ETIQUETA: Record<TipoRegistroSalud, string> = {
  vacuna: "Vacuna", desparasitacion: "Desparasitación", control: "Motivo", alergia: "Alergia a",
  medicamento: "Medicamento", documento: "Documento",
};
const EJEMPLO: Partial<Record<TipoRegistroSalud, string>> = {
  alergia: "Ej.: penicilina", medicamento: "Ej.: enalapril 5 mg, dos veces al día", documento: "Ej.: carné de vacunación",
};
const CON_PROXIMA: TipoRegistroSalud[] = ["vacuna", "desparasitacion", "control", "medicamento"];

export default function NuevoRegistroSalud() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [carga] = useCarga(`salud-nuevo-${id}`, () => obtenerMascota(id));
  const [tipo, setTipo] = useState<TipoRegistroSalud>("vacuna");
  const [nombre, setNombre] = useState("");
  const [otro, setOtro] = useState("");
  const [fechaAp, setFechaAp] = useState(hoyISO());
  const [proxima, setProxima] = useState("");
  const [notas, setNotas] = useState("");
  const [adjunto, setAdjunto] = useState<{ jpg: Blob; url: string } | null>(null);
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);

  return (
    <>
      <Barra titulo="Registrar vacuna o control" volver={`/mascotas/${id}/salud`} />
      <Estado carga={carga}>{(m) => {
        const opts = opcionesSalud(tipo, m.especie);
        const elegido = opts.length ? (opts.includes(nombre) ? nombre : opts[0]) : nombre;
        const esOtro = /^Otr[oa]$/.test(elegido);

        async function enviar(e: React.FormEvent) {
          e.preventDefault();
          const final = (esOtro ? otro : elegido).trim();
          if (!final) return setError(`Completa el campo "${esOtro ? "¿Cuál?" : ETIQUETA[tipo]}".`);
          if (!fechaAp) return setError("Indica la fecha.");
          if (fechaAp > hoyISO()) return setError("La fecha no puede ser futura.");
          if (proxima && proxima <= fechaAp) return setError("La próxima fecha debe ser posterior a la fecha aplicada.");
          setError(""); setEnviando(true);
          try {
            await crearSalud(id, {
              tipo, nombre: final, fecha: fechaAp, proxima_fecha: CON_PROXIMA.includes(tipo) && proxima ? proxima : null, notas: notas.trim() || null,
            }, adjunto?.jpg ?? null);
            router.push(`/mascotas/${id}/salud`);
          } catch (err) { setError(mensajeError(err)); setEnviando(false); }
        }

        return (
          <form className={s.screen} onSubmit={enviar} noValidate>
            <fieldset className={s.field}><legend className={s.legend}>Tipo</legend>
              <div className={s.pills}>{TIPOS.map((t) => (
                <label key={t} className={s.pill}><input type="radio" name="tipo" value={t} checked={tipo === t} onChange={() => { setTipo(t); setNombre(""); setOtro(""); }} /><span>{TIPO_SALUD_TXT[t]}</span></label>
              ))}</div>
            </fieldset>
            <div className={s.field}><label htmlFor="h-nombre">{ETIQUETA[tipo]}</label>
              {opts.length
                ? <select className={s.input} id="h-nombre" value={elegido} onChange={(e) => setNombre(e.target.value)}>{opts.map((o) => <option key={o}>{o}</option>)}</select>
                : <input className={s.input} id="h-nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder={EJEMPLO[tipo]} />}
            </div>
            {esOtro && <div className={s.field}><label htmlFor="h-otro">¿Cuál?</label><input className={s.input} id="h-otro" value={otro} onChange={(e) => setOtro(e.target.value)} /></div>}
            <div className={s.two}>
              <div className={s.field}><label htmlFor="h-fecha">{tipo === "vacuna" || tipo === "desparasitacion" ? "Fecha aplicada" : "Fecha"}</label>
                <input className={s.input} type="date" id="h-fecha" max={hoyISO()} value={fechaAp} onChange={(e) => setFechaAp(e.target.value)} /></div>
              {CON_PROXIMA.includes(tipo) && <div className={s.field}><label htmlFor="h-prox">{tipo === "vacuna" ? "Próxima dosis" : "Próxima fecha"}</label>
                <input className={s.input} type="date" id="h-prox" value={proxima} onChange={(e) => setProxima(e.target.value)} /></div>}
            </div>
            {CON_PROXIMA.includes(tipo) && <span className={s.hint} style={{ marginTop: -10 }}>Usa la próxima fecha que figura en el carné o la que te dio la veterinaria.</span>}
            <div className={s.field}><span className={s.legend}>Foto del carné o documento (opcional)</span>
              {adjunto && <div className={cx(s.carne, s.carneGrande)}><img src={adjunto.url} alt="Foto del carné" /></div>}
              <label className={cx(s.btn, s.sec, s.small)} htmlFor="h-adj">{adjunto ? "Cambiar foto" : "Tomar o subir foto del carné"}</label>
              <input className={s.vh} type="file" accept="image/*" id="h-adj" onChange={async (e) => {
                const f = e.target.files?.[0]; e.target.value = "";
                if (!f) return;
                try { setAdjunto(await prepararImagen(f)); } catch (err) { setError(mensajeError(err)); }
              }} />
            </div>
            <div className={s.field}><label htmlFor="h-notas">Notas (opcional)</label>
              <textarea className={s.input} id="h-notas" value={notas} onChange={(e) => setNotas(e.target.value)} placeholder="Ej.: lote de la vacuna, peso, veterinaria" /></div>
            <div className={s.note}><b>Declarado por el propietario</b>Este registro lo ingresas tú. En el DNI y el certificado figura como dato declarado, no validado por una veterinaria.</div>
            {error && <p className={s.err} role="alert">{error}</p>}
            <div className={s.spacer} />
            <button className={s.btn} type="submit" disabled={enviando || modo() === "sin-config"}>{enviando ? "Guardando" : "Guardar registro"}</button>
          </form>
        );
      }}</Estado>
    </>
  );
}
