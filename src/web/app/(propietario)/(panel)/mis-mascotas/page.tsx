"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FOTOS_OBLIGATORIAS } from "@/lib/contratos";
import {
  cerrarSesion, listarMascotas, listarSalud, obtenerPerfil, type MascotaVista, type RegistroSaludVista,
} from "@/components/propietario/datos";
import { ESPECIE_TXT, ESTADO_CHIP, ESTADO_TXT, estadoProxima, fecha, tituloSalud } from "@/components/propietario/textos";
import { Estado, FotoMascota, Logo, cx, s, useCarga } from "@/components/propietario/ui";

function proximo(salud: RegistroSaludVista[]) {
  const ultimo: Record<string, RegistroSaludVista> = {};
  salud.forEach((e) => { const k = e.tipo + e.nombre; if (!ultimo[k] || ultimo[k].fecha < e.fecha) ultimo[k] = e; });
  return Object.values(ultimo).filter((e) => e.proxima_fecha).sort((a, b) => a.proxima_fecha!.localeCompare(b.proxima_fecha!))[0] ?? null;
}

function Tarjeta({ m, salud }: { m: MascotaVista; salud: RegistroSaludVista[] }) {
  const validas = FOTOS_OBLIGATORIAS.filter((t) => m.fotos.some((f) => f.tipo === t && f.estado !== "rechazada")).length;
  const faltan = FOTOS_OBLIGATORIAS.length - validas;
  const n = proximo(salud);
  const base = `/mascotas/${m.id}`;
  return (
    <article className={s.card}>
      <div className={s.petRow}>
        <FotoMascota url={m.foto_url} alt={`Foto de ${m.nombre}`} alto={96} />
        <div>
          <h2>{m.nombre}</h2>
          <p>{ESPECIE_TXT[m.especie]} · {m.color}</p>
          <div className={s.chips} style={{ marginTop: 6 }}>
            <span className={cx(s.chip, s[ESTADO_CHIP[m.estado]])}>{ESTADO_TXT[m.estado]}</span>
          </div>
          <p className={s.mono} style={{ fontSize: 14, marginTop: 6 }}>{m.pet_id}</p>
        </div>
      </div>
      <div className={s.chips}>
        {m.lista_para_busqueda
          ? <span className={cx(s.chip, s.ok)}>Búsqueda por foto activa</span>
          : faltan > 0
            ? <span className={cx(s.chip, s.warn)}>Búsqueda por foto inactiva: {faltan === 1 ? "falta 1 foto" : `faltan ${faltan} fotos`}</span>
            : <span className={s.chip}>Fotos en revisión</span>}
      </div>
      {n && (
        <p className={s.muted}>Próximo en salud: {tituloSalud(n)}, {fecha(n.proxima_fecha)}{" "}
          <span className={cx(s.chip, s[estadoProxima(n.proxima_fecha).cls])}>{estadoProxima(n.proxima_fecha).t}</span></p>
      )}
      <div className={s.btnRow}>
        <Link className={cx(s.btn, s.sec, s.small)} href={`${base}/dni`}>DNI</Link>
        <Link className={cx(s.btn, s.sec, s.small)} href={`${base}/fotos`}>Fotos</Link>
        <Link className={cx(s.btn, s.sec, s.small)} href={`${base}/salud`}>Vacunas</Link>
      </div>
      {m.estado === "extraviada"
        ? <Link className={cx(s.btn, s.danger)} href={`${base}/reportar`}>Ver el aviso de extravío</Link>
        : <Link className={s.btn} href={`${base}/reportar`}>Reportar extravío</Link>}
    </article>
  );
}

export default function MisMascotas() {
  const router = useRouter();
  const [carga] = useCarga("mis-mascotas", async () => {
    const [perfil, mascotas] = await Promise.all([obtenerPerfil(), listarMascotas()]);
    const salud = await Promise.all(mascotas.map((m) => listarSalud(m.id).catch(() => [])));
    return { perfil, mascotas, salud };
  });
  const salir = async () => { await cerrarSesion(); router.push("/ingresar"); };

  return (
    <>
      <header className={cx(s.bar, s.barMarca, s.mobOnly)}><Logo /></header>
      <Estado carga={carga}>{({ perfil, mascotas, salud }) => (
        <main className={s.screen}>
          <div><p className={s.muted}>Hola, {perfil?.nombres}</p><h1>Mis mascotas</h1></div>
          {mascotas.length ? (
            <div className={s.pets}>{mascotas.map((m, i) => <Tarjeta key={m.id} m={m} salud={salud[i]} />)}</div>
          ) : (
            <div className={s.note}><b>Aún no registras mascotas</b>Registra a tu mascota para obtener su PET ID, su DNI digital y su placa QR.</div>
          )}
          <Link className={cx(s.btn, s.dashed)} href="/mascotas/nueva">+ Registrar {mascotas.length ? "otra mascota" : "mi mascota"}</Link>
          <h2 className={s.h2s}>Mi cuenta</h2>
          <div className={s.menuList}>
            <Link href="/perfil"><span>Mi perfil</span><span>›</span></Link>
            <Link href="/perfil"><span>Suscripción</span><span>PET ID Free ›</span></Link>
            <button type="button" onClick={salir}><span>Cerrar sesión</span><span>›</span></button>
          </div>
          <p className={cx(s.muted, s.center)}>Si alguien encuentra a tu mascota y te escribe desde su página, el mensaje te llega a tu correo.</p>
        </main>
      )}</Estado>
    </>
  );
}
