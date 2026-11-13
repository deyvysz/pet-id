// Ubicaciones para los formularios del propietario: todo el Perú (ver lib/ubigeo.ts).
import { DEPARTAMENTOS as DEPS, distritosDe, provinciasDe } from "@/lib/ubigeo";

export const DEPARTAMENTOS = DEPS;
export const PROVINCIAS: Record<string, string[]> = Object.fromEntries(DEPS.map((d) => [d, provinciasDe(d)]));
export const DISTRITOS: Record<string, string[]> = Object.fromEntries(
  DEPS.flatMap((d) => provinciasDe(d).map((p) => [`${d}/${p}`, distritosDe(d, p)])),
);
