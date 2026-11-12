"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Especie, Sexo } from "@/lib/contratos";
import { crearMascota, modo } from "@/components/propietario/datos";
import { hoyISO } from "@/components/propietario/textos";
import { Barra, cx, mensajeError, s } from "@/components/propietario/ui";

export default function NuevaMascota() {
  const router = useRouter();
  const [f, setF] = useState({
    nombre: "", especie: "perro" as Especie, sexo: "macho" as Sexo, raza: "", fecha_nacimiento: "",
    estimada: true, color: "", senas: "", microchip: "", esterilizado: "nose" as "si" | "no" | "nose",
  });
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (!f.nombre.trim()) return setError("Escribe el nombre de tu mascota.");
    if (!f.fecha_nacimiento) return setError("Indica su fecha de nacimiento. Si no la sabes, pon una aproximada.");
    if (f.fecha_nacimiento > hoyISO()) return setError("La fecha de nacimiento no puede ser futura.");
    if (!f.color.trim()) return setError("Describe su color.");
    const chip = f.microchip.replace(/\s/g, "");
    if (chip && !/^\d{15}$/.test(chip)) return setError("El número de microchip tiene 15 dígitos, solo números.");
    setError(""); setEnviando(true);
    try {
      const id = await crearMascota({
        nombre: f.nombre.trim(), especie: f.especie, sexo: f.sexo, raza: f.raza.trim() || "Mestizo",
        fecha_nacimiento: f.fecha_nacimiento, fecha_nacimiento_estimada: f.estimada, color: f.color.trim(),
        senas: f.senas.trim() || null, microchip: chip || null,
        esterilizado: f.esterilizado === "nose" ? null : f.esterilizado === "si",
      });
      router.push(`/mascotas/${id}/fotos`);
    } catch (err) {
      setError(mensajeError(err));
      setEnviando(false);
    }
  }

  const pills = <T extends string>(name: string, val: T, opts: [T, string][], on: (v: T) => void) => (
    <div className={s.pills}>
      {opts.map(([v, t]) => (
        <label key={v} className={s.pill}><input type="radio" name={name} value={v} checked={val === v} onChange={() => on(v)} /><span>{t}</span></label>
      ))}
    </div>
  );

  return (
    <>
      <Barra titulo="Registrar mascota" volver="/mis-mascotas" />
      <form className={s.screen} onSubmit={enviar} noValidate>
        <p className={s.muted}>Paso 3 de 4: tu mascota. Después te pedimos fotos.</p>
        <div className={s.field}><label htmlFor="m-nom">Nombre</label><input className={s.input} id="m-nom" value={f.nombre} onChange={set("nombre")} placeholder="Ej.: Max" /></div>
        <fieldset className={s.field}><legend className={s.legend}>Especie</legend>
          {pills("especie", f.especie, [["perro", "Perro"], ["gato", "Gato"]], (v) => setF({ ...f, especie: v }))}
        </fieldset>
        <fieldset className={s.field}><legend className={s.legend}>Sexo</legend>
          {pills("sexo", f.sexo, [["macho", "Macho"], ["hembra", "Hembra"]], (v) => setF({ ...f, sexo: v }))}
        </fieldset>
        <div className={s.two}>
          <div className={s.field}><label htmlFor="m-raza">Raza</label><input className={s.input} id="m-raza" value={f.raza} onChange={set("raza")} placeholder="Ej.: mestizo" /></div>
          <div className={s.field}><label htmlFor="m-nac">Nacimiento</label><input className={s.input} id="m-nac" type="date" max={hoyISO()} value={f.fecha_nacimiento} onChange={set("fecha_nacimiento")} /></div>
        </div>
        <label className={s.check}><input type="checkbox" checked={f.estimada} onChange={(e) => setF({ ...f, estimada: e.target.checked })} /><span>La fecha de nacimiento es aproximada.</span></label>
        <div className={s.field}><label htmlFor="m-color">Color</label><input className={s.input} id="m-color" value={f.color} onChange={set("color")} placeholder="Ej.: marrón con pecho blanco" /></div>
        <div className={s.field}><label htmlFor="m-senas">Señas particulares (opcional)</label>
          <textarea className={s.input} id="m-senas" value={f.senas} onChange={set("senas")} placeholder="Ej.: mancha negra en la oreja izquierda, cola corta" />
          <span className={s.hint}>Ayudan a reconocerla si se pierde.</span></div>
        <div className={s.field}><label htmlFor="m-chip">N.° de microchip (opcional)</label>
          <input className={cx(s.input, s.mono)} id="m-chip" inputMode="numeric" maxLength={15} value={f.microchip} onChange={set("microchip")} placeholder="15 dígitos" />
          <span className={s.hint}>Figura en el carné. Si no lo tienes, una veterinaria lo lee con un lector.</span></div>
        <fieldset className={s.field}><legend className={s.legend}>¿Está esterilizado?</legend>
          {pills("esterilizado", f.esterilizado, [["si", "Sí"], ["no", "No"], ["nose", "No sé"]], (v) => setF({ ...f, esterilizado: v }))}
        </fieldset>
        {error && <p className={s.err} role="alert">{error}</p>}
        <div className={s.spacer} />
        <button className={s.btn} type="submit" disabled={enviando || modo() === "sin-config"}>{enviando ? "Guardando" : "Continuar a las fotos"}</button>
      </form>
    </>
  );
}
