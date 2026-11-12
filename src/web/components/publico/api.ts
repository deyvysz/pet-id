// Utilidades para las rutas /api/v1 públicas.
import { NextResponse } from "next/server";

export const error = (status: number, mensaje: string) =>
  NextResponse.json({ error: mensaje }, { status, headers: { "Cache-Control": "no-store" } });

export const ok = <T,>(datos: T, status = 200) =>
  NextResponse.json(datos, { status, headers: { "Cache-Control": "no-store" } });

/** Límite simple por IP en memoria (por instancia). Sirve contra abuso básico; en producción conviene uno compartido. */
const ventanas = new Map<string, number[]>();
export function limitar(req: Request, clave: string, maximo: number, ventanaMs: number): boolean {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || req.headers.get("x-real-ip") || "local";
  const k = `${clave}:${ip}`;
  const ahora = Date.now();
  const lista = (ventanas.get(k) ?? []).filter((t) => ahora - t < ventanaMs);
  if (lista.length >= maximo) { ventanas.set(k, lista); return false; }
  lista.push(ahora);
  ventanas.set(k, lista);
  if (ventanas.size > 5000) ventanas.clear();
  return true;
}

export const texto = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
