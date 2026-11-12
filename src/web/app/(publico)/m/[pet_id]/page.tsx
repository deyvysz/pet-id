// Página que abre el QR de la placa. Muestra nombre, foto, PET ID y estado. Nunca datos del propietario.
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { PantallaPublica } from "@/components/publico/Estructura";
import { FotoMascota } from "@/components/publico/FotoMascota";
import { ESPECIE_TXT, ESTADO_TXT, RE_PET_ID, fecha, normalizarPetId, perdidoTxt } from "@/components/publico/formato";
import { obtenerMascotaPublica } from "@/components/publico/servidor";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ pet_id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const petId = normalizarPetId((await params).pet_id);
  return { title: `${petId} · PET ID`, robots: { index: false } };
}

export default async function PerfilPublico({ params }: Props) {
  const petId = normalizarPetId((await params).pet_id);
  if (!RE_PET_ID.test(petId)) notFound();
  const m = await obtenerMascotaPublica(petId);
  if (!m) notFound();

  const estado = ESTADO_TXT[m.estado];
  const descripcion = [ESPECIE_TXT[m.especie], m.raza, m.color].filter(Boolean).join(" · ");
  const contactar = `/m/${m.pet_id}/contactar`;

  if (m.estado === "extraviada") {
    return (
      <PantallaPublica
        banda={
          <div className="lostband" role="alert">
            <strong>Estoy {perdidoTxt(m.sexo)}</strong>
            <span>
              {m.fecha_perdida ? `Desde el ${fecha(m.fecha_perdida)}` : "Mi familia reportó que me perdí"}
              {m.distrito_perdida ? ` en ${m.distrito_perdida}` : ""}
            </span>
          </div>
        }
      >
        <main className="screen">
          <div className="pet-row">
            <div style={{ width: 132, flex: "none" }}><FotoMascota url={m.foto_url} nombre={m.nombre} alto={132} petId={m.pet_id} /></div>
            <div>
              <h1 style={{ fontSize: 32 }}>Soy {m.nombre}</h1>
              <p>{descripcion}</p>
              <p className="mono" style={{ fontSize: 14 }}>PET ID {m.pet_id}</p>
              <span className={`chip ${estado.cls}`} style={{ marginTop: 6 }}>{estado.t}</span>
            </div>
          </div>
          {m.mensaje_perdida && <div className="note"><b>Mensaje de mi familia</b>{m.mensaje_perdida}</div>}
          <div className="spacer" />
          <Link className="btn danger" href={contactar}>Encontré esta mascota</Link>
          <p className="muted center">Tu mensaje llega al correo de mi familia. No necesitas registrarte.</p>
          <p className="muted center">Si puedes, quédate con {m.nombre} hasta que respondan.</p>
        </main>
      </PantallaPublica>
    );
  }

  return (
    <PantallaPublica marca={m.pet_id}>
      <main className="screen">
        <div className="perfil-grid">
          <FotoMascota url={m.foto_url} nombre={m.nombre} alto={300} petId={m.pet_id} />
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <h1 style={{ fontSize: 36 }}>Hola, soy {m.nombre}</h1>
            <p className="lead">{descripcion}</p>
            <p className="mono" style={{ fontSize: 14 }}>PET ID {m.pet_id}</p>
            <div className="chips"><span className={`chip ${estado.cls}`}>{estado.t}</span></div>
          </div>
        </div>
        <div className="spacer" />
        {m.estado !== "fallecida" && (
          <>
            <Link className="btn" href={contactar}>Encontré esta mascota</Link>
            <p className="muted center">Tu mensaje llega al correo de mi familia. No necesitas registrarte.</p>
          </>
        )}
      </main>
    </PantallaPublica>
  );
}
