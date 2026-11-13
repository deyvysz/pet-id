"use client";
// Cierra la sesión de Supabase y vuelve al inicio.
import { useRouter } from "next/navigation";
import { useState } from "react";
import { supabaseNavegador } from "@/lib/supabase";

export function SalirBoton() {
  const router = useRouter();
  const [ocupado, setOcupado] = useState(false);
  async function salir() {
    setOcupado(true);
    try { if (process.env.NEXT_PUBLIC_SUPABASE_URL) await supabaseNavegador().auth.signOut(); } catch { /* sin sesión */ }
    router.replace("/");
    router.refresh();
  }
  return <button type="button" className="btn sec auto small" onClick={salir} disabled={ocupado}>{ocupado ? "Saliendo…" : "Cerrar sesión"}</button>;
}
