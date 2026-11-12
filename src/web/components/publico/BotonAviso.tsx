"use client";
// Botón que muestra un aviso breve (para funciones de fase 2 o páginas que aún no existen).
import { useEffect, useState } from "react";

export default function BotonAviso({ aviso, className, children }: { aviso: string; className?: string; children: React.ReactNode }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!visible) return;
    const t = setTimeout(() => setVisible(false), 2600);
    return () => clearTimeout(t);
  }, [visible]);
  return (
    <>
      <button type="button" className={className} onClick={() => setVisible(true)}>{children}</button>
      {visible && <div className="toast" role="status">{aviso}</div>}
    </>
  );
}
