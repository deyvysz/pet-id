// Administración: listado de usuarios.
import type { Metadata } from "next";
import { fecha } from "@/components/publico/formato";
import { listarUsuarios } from "@/components/admin/datos";
import { exigirAdmin, MarcoAdmin } from "@/components/admin/Marco";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Usuarios · Administración · PET ID", robots: { index: false } };

export default async function Usuarios() {
  const { acceso, bloqueo } = await exigirAdmin();
  if (bloqueo) return bloqueo;
  const usuarios = await listarUsuarios();
  return (
    <MarcoAdmin activo="usuarios" demo={acceso === "demo"}>
      <h1>Usuarios ({usuarios.length})</h1>
      {usuarios.length ? (
        <div className="list">
          {usuarios.map((u) => (
            <div className="li" key={u.id}>
              <div>
                <b>{u.nombre}</b>
                <span className="hint">{u.distrito} · desde el {fecha(u.creado_at)} · {u.mascotas} {u.mascotas === 1 ? "mascota" : "mascotas"}{u.celular_verificado ? "" : " · celular sin verificar"}</span>
              </div>
              <span className={`chip${u.rol === "admin" ? " warn" : ""}`}>{u.rol === "admin" ? "Admin" : "Propietario"}</span>
            </div>
          ))}
        </div>
      ) : <p className="muted">Aún no hay usuarios.</p>}
    </MarcoAdmin>
  );
}
