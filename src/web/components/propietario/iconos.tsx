// Íconos SVG del prototipo.
import type { ReactNode } from "react";
import type { TipoFoto } from "@/lib/contratos";

const i24 = (b: ReactNode) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{b}</svg>
);
const sv = (b: ReactNode) => (
  <svg width="34" height="34" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{b}</svg>
);

export const Huella = ({ size }: { size?: number }) => (
  <svg viewBox="0 0 64 64" width={size} height={size} fill="currentColor" aria-hidden="true">
    <ellipse cx="32" cy="42" rx="13" ry="11" /><ellipse cx="15" cy="27" rx="6" ry="7.5" /><ellipse cx="49" cy="27" rx="6" ry="7.5" />
    <ellipse cx="24" cy="15" rx="5.5" ry="7" /><ellipse cx="40" cy="15" rx="5.5" ry="7" />
  </svg>
);

export const IcVolver = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7" /></svg>
);
export const IcUsuario = () => i24(<><circle cx="12" cy="8" r="4" /><path d="M4 21c1-4 4-6 8-6s7 2 8 6" /></>);
export const IcCarnet = () => i24(<><rect x="3" y="5" width="18" height="14" rx="2" /><circle cx="9" cy="11" r="2.2" /><path d="M5.5 16c.6-1.6 1.9-2.4 3.5-2.4s2.9.8 3.5 2.4M14 10h5M14 13h4" /></>);
export const IcSalud = () => i24(<><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" /><path d="M12 10v5M9.5 12.5h5" /></>);
export const IcCampana = () => i24(<><path d="M6 16v-5a6 6 0 0 1 12 0v5l2 2H4z" /><path d="M10 20a2 2 0 0 0 4 0" /></>);
export const IcEscudo = () => i24(<><path d="M12 3l7 3v5c0 5-3.5 8.5-7 10-3.5-1.5-7-5-7-10V6z" /><path d="M9 12l2 2 4-4" /></>);
export const IcCelular = () => i24(<><rect x="7" y="2.5" width="10" height="19" rx="2.5" /><path d="M11 18h2" /></>);
export const IcCamara = () => i24(<><path d="M4 8h3l2-3h6l2 3h3v11H4z" /><circle cx="12" cy="13" r="3.5" /></>);
export const IcMas = () => i24(<path d="M12 5v14M5 12h14" />);

export const ICONO_TOMA: Record<Exclude<TipoFoto, "hallazgo">, ReactNode> = {
  frente: sv(<><path d="M14 19l-3-9 8 4M34 19l3-9-8 4" /><circle cx="24" cy="26" r="13" /><circle cx="19" cy="24" r="1.6" fill="currentColor" /><circle cx="29" cy="24" r="1.6" fill="currentColor" /><path d="M21.5 30h5L24 33z" /></>),
  perfil_izq: sv(<><path d="M10 22c3-7 13-9 19-4l9 7c2 2 1 5-2 5h-6c-2 4-7 7-12 6-6-1-9-7-8-14z" /><path d="M15 18l-3-8 8 5" /><circle cx="25" cy="22" r="1.6" fill="currentColor" /></>),
  perfil_der: sv(<g transform="matrix(-1 0 0 1 48 0)"><path d="M10 22c3-7 13-9 19-4l9 7c2 2 1 5-2 5h-6c-2 4-7 7-12 6-6-1-9-7-8-14z" /><path d="M15 18l-3-8 8 5" /><circle cx="25" cy="22" r="1.6" fill="currentColor" /></g>),
  cuerpo: sv(<><ellipse cx="22" cy="25" rx="12" ry="7" /><circle cx="37" cy="17" r="5" /><path d="M33 21l-2 3M14 31v8M20 31v8M27 31v8M31 30v9M10 23c-3-2-4-5-3-8" /></>),
  marcas: sv(<><circle cx="21" cy="21" r="11" /><path d="M29 29l9 9" /><circle cx="18" cy="18" r="2.6" fill="currentColor" /><circle cx="24" cy="23" r="1.6" fill="currentColor" /></>),
};
