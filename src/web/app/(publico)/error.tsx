"use client";
import Link from "next/link";
import "@/components/publico/publico.css";

export default function ErrorPublico({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="pub">
      <main className="screen" style={{ maxWidth: 480, margin: "0 auto", width: "100%" }}>
        <h1>No pudimos cargar esta página</h1>
        <p className="muted">El servicio no respondió. Vuelve a intentarlo en unos minutos.</p>
        <button className="btn" type="button" onClick={reset}>Reintentar</button>
        <Link className="btn sec" href="/">Ir al inicio</Link>
      </main>
    </div>
  );
}
