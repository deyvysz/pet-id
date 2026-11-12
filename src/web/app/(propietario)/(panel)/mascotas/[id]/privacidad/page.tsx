"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { obtenerMascota } from "@/components/propietario/datos";
import { Barra, Estado, cx, s, useCarga } from "@/components/propietario/ui";

export default function Privacidad() {
  const { id } = useParams<{ id: string }>();
  const [carga] = useCarga(`priv-${id}`, () => obtenerMascota(id));
  return (
    <>
      <Barra titulo="Qué ve quien escanea" volver={`/mascotas/${id}/dni`} />
      <Estado carga={carga}>{(m) => (
        <main className={s.screen}>
          <p className={s.lead}>Esto aparece en la página de {m.nombre} cuando alguien escanea su placa.</p>
          <div className={s.toggles}>
            <div className={s.tg}><span>Foto, nombre y número PET ID</span><span className={s.chip}>Siempre</span></div>
            <div className={s.tg}><span>Especie, raza, sexo y color</span><span className={s.chip}>Siempre</span></div>
            <div className={s.tg}><span>Estado del registro<small>Activa, extraviada o encontrada</small></span><span className={s.chip}>Siempre</span></div>
            <div className={s.tg}><span>Aviso de extravío<small>Distrito, fecha y tu mensaje para quien la encuentre</small></span><span className={cx(s.chip, s.lost)}>Solo si está extraviada</span></div>
          </div>
          <div className={s.note}><b>Nunca se muestra</b>Tu nombre, tu documento, tu celular, tu correo ni tu dirección. Quien encuentra a {m.nombre} te escribe desde su página y el mensaje te llega a tu correo.</div>
          <div className={s.spacer} />
          <Link className={cx(s.btn, s.sec)} href={`/m/${m.pet_id}`}>Ver la página como la ve otra persona</Link>
          <Link className={s.btn} href={`/mascotas/${m.id}/dni`}>Ir al DNI de {m.nombre}</Link>
        </main>
      )}</Estado>
    </>
  );
}
