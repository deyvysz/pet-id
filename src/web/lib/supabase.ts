// Clientes de Supabase. Variables en .env.local (ver .env.example).
import { createBrowserClient } from "@supabase/ssr";
import { createClient as createAdmin } from "@supabase/supabase-js";

export const supabaseNavegador = () =>
  createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

/** Solo en servidor (rutas /api). Usa la clave de servicio; nunca exponer al navegador. */
export const supabaseServicio = () =>
  createAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  });

export const BUCKET_FOTOS = "fotos";
export const BUCKET_DOCUMENTOS = "documentos";
