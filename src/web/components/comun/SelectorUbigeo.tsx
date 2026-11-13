"use client";
// Departamento, provincia y distrito en cascada, con los 1,893 distritos del INEI.
import { DEPARTAMENTOS, codigoDe, distritosDe, primeroDe, provinciasDe, type Ubicacion } from "@/lib/ubigeo";

type Props = {
  valor: Ubicacion | null;
  /** Recibe la ubicación elegida y su código INEI (null si se eligió "No sé"). */
  alCambiar: (u: Ubicacion | null, codigo: string | null) => void;
  id: string;
  etiquetaDistrito?: string;
  /** Agrega la opción "No sé" en departamento. */
  opcional?: boolean;
  claseCampo?: string;
  claseControl?: string;
  claseFila?: string;
};

export function SelectorUbigeo({ valor, alCambiar, id, etiquetaDistrito = "Distrito", opcional, claseCampo, claseControl, claseFila }: Props) {
  const emitir = (u: Ubicacion | null) => alCambiar(u, u ? codigoDe(u) : null);
  const provincias = valor ? provinciasDe(valor.departamento) : [];
  const distritos = valor ? distritosDe(valor.departamento, valor.provincia) : [];
  return (
    <>
      <div className={claseFila}>
        <div className={claseCampo}><label htmlFor={`${id}-dep`}>Departamento</label>
          <select className={claseControl} id={`${id}-dep`} value={valor?.departamento ?? ""}
            onChange={(e) => emitir(e.target.value ? primeroDe(e.target.value) : null)}>
            {opcional && <option value="">No sé</option>}
            {DEPARTAMENTOS.map((d) => <option key={d} value={d}>{d}</option>)}
          </select></div>
        <div className={claseCampo}><label htmlFor={`${id}-prov`}>Provincia</label>
          <select className={claseControl} id={`${id}-prov`} value={valor?.provincia ?? ""} disabled={!valor}
            onChange={(e) => valor && emitir(primeroDe(valor.departamento, e.target.value))}>
            {!valor && <option value="">—</option>}
            {provincias.map((p) => <option key={p} value={p}>{p}</option>)}
          </select></div>
      </div>
      <div className={claseCampo}><label htmlFor={`${id}-dist`}>{etiquetaDistrito}</label>
        <select className={claseControl} id={`${id}-dist`} value={valor?.distrito ?? ""} disabled={!valor}
          onChange={(e) => valor && emitir({ ...valor, distrito: e.target.value })}>
          {!valor && <option value="">—</option>}
          {distritos.map((d) => <option key={d} value={d}>{d}</option>)}
        </select></div>
    </>
  );
}
