// Íconos SVG tomados del prototipo (docs/diseno/prototipo.html).
import type { ReactNode, SVGProps } from "react";

type P = SVGProps<SVGSVGElement>;

const I24 = ({ children, ...p }: P & { children: ReactNode }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9}
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...p}>{children}</svg>
);

export const Huella = (p: P) => (
  <svg viewBox="0 0 64 64" fill="currentColor" aria-hidden="true" {...p}>
    <ellipse cx="32" cy="42" rx="13" ry="11" /><ellipse cx="15" cy="27" rx="6" ry="7.5" />
    <ellipse cx="49" cy="27" rx="6" ry="7.5" /><ellipse cx="24" cy="15" rx="5.5" ry="7" />
    <ellipse cx="40" cy="15" rx="5.5" ry="7" />
  </svg>
);
export const IcUsuario = (p: P) => <I24 {...p}><circle cx="12" cy="8" r="4" /><path d="M4 21c1-4 4-6 8-6s7 2 8 6" /></I24>;
export const IcCarne = (p: P) => (
  <I24 {...p}><rect x="3" y="5" width="18" height="14" rx="2" /><circle cx="9" cy="11" r="2.2" />
    <path d="M5.5 16c.6-1.6 1.9-2.4 3.5-2.4s2.9.8 3.5 2.4M14 10h5M14 13h4" /></I24>
);
export const IcCorazon = (p: P) => (
  <I24 {...p}><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" /><path d="M12 10v5M9.5 12.5h5" /></I24>
);
export const IcCampana = (p: P) => <I24 {...p}><path d="M6 16v-5a6 6 0 0 1 12 0v5l2 2H4z" /><path d="M10 20a2 2 0 0 0 4 0" /></I24>;
export const IcBuscar = (p: P) => <I24 {...p}><circle cx="11" cy="11" r="6.5" /><path d="M16 16l4.5 4.5" /></I24>;
export const IcCorona = (p: P) => <I24 {...p}><path d="M4 8l4 4 4-6 4 6 4-4-2 10H6z" /></I24>;
export const IcTienda = (p: P) => <I24 {...p}><path d="M4 10h16v10H4zM3 10l2-5h14l2 5" /><path d="M9 20v-5h6v5" /></I24>;
export const IcCheck = (p: P) => <I24 {...p}><path d="M5 12.5l4.5 4.5L19 7.5" /></I24>;
export const IcEscudo = (p: P) => <I24 {...p}><path d="M12 3l7 3v5c0 5-3.5 8.5-7 10-3.5-1.5-7-5-7-10V6z" /><path d="M9 12l2 2 4-4" /></I24>;
export const IcResumen = (p: P) => <I24 {...p}><path d="M4 13h6V4H4zM14 20h6v-9h-6zM4 20h6v-4H4zM14 8h6V4h-6z" /></I24>;
export const IcMenu = (p: P) => <I24 strokeWidth={2.2} {...p}><path d="M4 7h16M4 12h16M4 17h16" /></I24>;
export const IcVolver = (p: P) => <I24 strokeWidth={2.4} {...p}><path d="M15 5l-7 7 7 7" /></I24>;
export const IcCamara = (p: P) => (
  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinejoin="round" aria-hidden="true" {...p}>
    <path d="M4 8h3l2-3h6l2 3h3v11H4z" /><circle cx="12" cy="13" r="3.5" />
  </svg>
);
export const IcCheckGrande = (p: P) => (
  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...p}>
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </svg>
);
export const IcPlay = (p: P) => <svg viewBox="0 0 12 12" fill="currentColor" aria-hidden="true" {...p}><path d="M3 1.5l7 4.5-7 4.5z" /></svg>;
export const IcFlecha = (p: P) => <I24 strokeWidth={2.4} {...p}><path d="M9 5l7 7-7 7" /></I24>;

/** QR decorativo del prototipo (no codifica nada). El QR real de la placa lo genera el agente 3. */
export function QrDecorativo({ codigo, etiqueta }: { codigo: string; etiqueta: string }) {
  let seed = 0;
  for (const c of codigo) seed = (seed * 31 + c.charCodeAt(0)) >>> 0;
  const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  const N = 25;
  const celdas: [number, number][] = [];
  const enMarco = (x: number, y: number) => (x < 8 && y < 8) || (x >= N - 8 && y < 8) || (x < 8 && y >= N - 8);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { if (!enMarco(x, y) && rnd() < 0.48) celdas.push([x, y]); }
  const marco = (x: number, y: number) => (
    <g key={`f${x}-${y}`}>
      <rect x={x} y={y} width="7" height="7" /><rect x={x + 1} y={y + 1} width="5" height="5" fill="#fff" />
      <rect x={x + 2} y={y + 2} width="3" height="3" />
    </g>
  );
  return (
    <svg viewBox={`0 0 ${N} ${N}`} shapeRendering="crispEdges" fill="#111" role="img" aria-label={etiqueta}>
      {marco(0, 0)}{marco(N - 7, 0)}{marco(0, N - 7)}
      {celdas.map(([x, y]) => <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" />)}
    </svg>
  );
}
