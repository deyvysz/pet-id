// Ubigeo del INEI (1,893 distritos). Datos en lib/ubigeo.json, generados por scripts/generar-ubigeo.py
// a partir de jmcastagnetto/ubigeo-peru-aumentado (MIT). La base valida lo mismo (migración 0010, decisión 012).
import datos from "./ubigeo.json";

type Arbol = Record<string, Record<string, [string, string][]>>;
const ARBOL = datos as unknown as Arbol;

export type Ubicacion = { departamento: string; provincia: string; distrito: string };

export const DEPARTAMENTOS = Object.keys(ARBOL);
export const provinciasDe = (dep: string) => Object.keys(ARBOL[dep] ?? {});
export const distritosDe = (dep: string, prov: string) => (ARBOL[dep]?.[prov] ?? []).map(([, d]) => d);

const POR_CODIGO = new Map<string, Ubicacion>();
for (const [departamento, provs] of Object.entries(ARBOL))
  for (const [provincia, dists] of Object.entries(provs))
    for (const [codigo, distrito] of dists) POR_CODIGO.set(codigo, { departamento, provincia, distrito });

export const ubicacionDe = (codigo: string | null | undefined) => (codigo ? POR_CODIGO.get(codigo) ?? null : null);
export const codigoDe = (u: Partial<Ubicacion>) =>
  ARBOL[u.departamento ?? ""]?.[u.provincia ?? ""]?.find(([, d]) => d === u.distrito)?.[0] ?? null;
export const esCodigoValido = (codigo: string) => POR_CODIGO.has(codigo);

/** Primera provincia y primer distrito de un departamento (para reiniciar la cascada). */
export function primeroDe(dep: string, prov?: string): Ubicacion {
  const p = prov ?? provinciasDe(dep)[0] ?? "";
  return { departamento: dep, provincia: p, distrito: distritosDe(dep, p)[0] ?? "" };
}
