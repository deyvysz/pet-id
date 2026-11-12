/* eslint-disable @next/next/no-img-element */
// Foto de una mascota o, si no tiene, la huella sobre un fondo de color. Las URL son firmadas de Storage o data URL de demo.
import { Huella } from "./iconos";
import { FONDO_DEMO } from "./demo";

export function FotoMascota({ url, nombre, alto, petId }: { url: string | null; nombre: string; alto: number; petId?: string }) {
  return (
    <div className="photo" style={{ height: alto, background: url ? undefined : (petId && FONDO_DEMO[petId]) || undefined }}>
      {url ? <img src={url} alt={`Foto de ${nombre}`} /> : <Huella />}
    </div>
  );
}

export function Miniatura({ url, alt, fondo }: { url: string | null; alt: string; fondo?: string }) {
  return (
    <div className="thumb" style={{ background: url ? "var(--sunk)" : fondo || "var(--accent)" }}>
      {url ? <img src={url} alt={alt} /> : <Huella />}
    </div>
  );
}
