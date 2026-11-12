import Link from "next/link";
import { PantallaPublica } from "@/components/publico/Estructura";

export default function PlacaNoEncontrada() {
  return (
    <PantallaPublica titulo="Placa no encontrada" volver="/">
      <main className="screen">
        <p className="lead">No encontramos una mascota con ese número PET ID.</p>
        <p className="muted">Revisa que el número esté escrito igual que en la placa, con el formato PE-00000000. Si la mascota no tiene placa, puedes buscarla por foto.</p>
        <div className="spacer" />
        <Link className="btn" href="/encontre">Buscar por foto</Link>
      </main>
    </PantallaPublica>
  );
}
