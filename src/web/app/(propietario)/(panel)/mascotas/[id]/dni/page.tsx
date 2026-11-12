"use client";
/* eslint-disable @next/next/no-img-element -- foto con URL firmada y QR servido por la API */
import Link from "next/link";
import { useParams } from "next/navigation";
import { listarSalud, obtenerCertificado, obtenerMascota, obtenerPerfil } from "@/components/propietario/datos";
import { Huella, IcEscudo } from "@/components/propietario/iconos";
import { ESPECIE_DNI, ESPECIE_TXT, ESTADO_TXT, SEXO_TXT, estadoProxima, fecha } from "@/components/propietario/textos";
import { Barra, Estado, Logo, cx, s, useCarga } from "@/components/propietario/ui";

const ESTADO_DNI = { activa: "Registro activo", extraviada: "Extraviada", encontrada: "Registro activo", fallecida: "Fallecida" } as const;

export default function Dni() {
  const { id } = useParams<{ id: string }>();
  const [carga] = useCarga(`dni-${id}`, async () => {
    const [m, salud, cert, perfil] = await Promise.all([obtenerMascota(id), listarSalud(id), obtenerCertificado(id), obtenerPerfil()]);
    return { m, salud, cert, perfil };
  });
  const nombre = carga.estado === "ok" ? carga.datos.m.nombre : "tu mascota";
  const api = `/api/v1/mascotas/${id}`;

  return (
    <>
      <Barra titulo={`DNI de ${nombre}`} volver="/mis-mascotas" />
      <Estado carga={carga}>{({ m, salud, cert, perfil }) => {
        const rabia = salud.filter((e) => e.tipo === "vacuna" && /antirr/i.test(e.nombre)).sort((a, b) => b.fecha.localeCompare(a.fecha))[0];
        const er = rabia ? estadoProxima(rabia.proxima_fecha) : null;
        return (
          <main className={s.screen}>
            <div className={s.dniGrid}>
              <section className={s.idcard} aria-label={`DNI de ${m.nombre}`}>
                <div className={s.idHead}><Logo enlace={false} /><small>DOCUMENTO DE IDENTIDAD DIGITAL ANIMAL</small></div>
                <div className={s.idBody}>
                  <div className={s.idPhoto}>{m.foto_url ? <img src={m.foto_url} alt={`Foto de ${m.nombre}`} /> : <Huella />}</div>
                  <dl className={s.dl}>
                    <div className={s.wide}><dt>Nombre</dt><dd className={s.idNombre}>{m.nombre.toUpperCase()}</dd></div>
                    <div><dt>Especie</dt><dd>{ESPECIE_DNI[m.especie]}</dd></div>
                    <div><dt>Sexo</dt><dd>{SEXO_TXT[m.sexo]}</dd></div>
                    <div><dt>Raza</dt><dd>{m.raza}</dd></div>
                    <div><dt>Nacimiento</dt><dd>{fecha(m.fecha_nacimiento)}{m.fecha_nacimiento_estimada ? " (aprox.)" : ""}</dd></div>
                    <div><dt>Registrado el</dt><dd>{fecha(m.creado_at)}</dd></div>
                    <div><dt>Estado</dt><dd>{ESTADO_DNI[m.estado]}</dd></div>
                  </dl>
                </div>
                <div className={s.idFoot}>
                  <div>
                    <span className={s.cap}>N.° PET ID</span>
                    <span className={s.mono} style={{ fontSize: 18 }}>{m.pet_id}</span>
                    <span className={s.cap} style={{ marginTop: 6 }}>Responsable</span>
                    <span className={s.verificado}><IcEscudo />Identidad verificada</span>
                    <span className={s.hint}>Datos personales protegidos</span>
                  </div>
                  <div className={s.idQr}><img src={`${api}/qr`} alt={`Código QR de ${m.pet_id}`} width={74} height={74} /></div>
                </div>
                <p className={cx(s.hint, s.idLegend)}>Credencial privada de registro en PET ID. No constituye documento oficial ni acreditación legal de propiedad.</p>
              </section>
              <dl className={cx(s.dl, s.card, s.noPrint)}>
                <div className={s.wide}><dt>Color</dt><dd>{m.color}</dd></div>
                {m.senas && <div className={s.wide}><dt>Señas</dt><dd>{m.senas}</dd></div>}
                <div className={s.wide}><dt>Microchip</dt><dd className={s.mono}>{m.microchip ?? "No registrado"}</dd></div>
                <div><dt>Estado</dt><dd>{ESTADO_TXT[m.estado]}</dd></div>
                <div><dt>Esterilizado</dt><dd>{m.esterilizado == null ? "Sin dato" : m.esterilizado ? "Sí" : "No"}</dd></div>
                <div className={s.wide}><dt>Vacuna antirrábica</dt><dd>{rabia
                  ? <>{rabia.proxima_fecha ? `Próxima: ${fecha(rabia.proxima_fecha)}` : `Aplicada el ${fecha(rabia.fecha)}`} <span className={cx(s.chip, er && s[er.cls])}>{er?.t}</span></>
                  : "Sin registro"}</dd></div>
                <div className={s.wide}><dd className={s.hint} style={{ fontWeight: 400 }}>Datos de salud declarados por el propietario.</dd></div>
              </dl>
            </div>
            <div className={cx(s.btnRow, s.noPrint)}>
              <a className={s.btn} href={`${api}/certificado?documento=dni`} download>Descargar PDF</a>
              <button className={cx(s.btn, s.sec)} type="button" onClick={() => window.print()}>Imprimir</button>
            </div>
            <article className={cx(s.card, s.noPrint)}>
              <h2 className={s.h2s}>Certificado de Registro e Identificación PET ID</h2>
              <p>N.° {m.pet_id}. {m.nombre}, {ESPECIE_TXT[m.especie].toLowerCase()} {SEXO_TXT[m.sexo].toLowerCase()}, quedó {m.sexo === "hembra" ? "inscrita" : "inscrito"} en PET ID el {fecha(m.creado_at)}{perfil ? ` a nombre de ${perfil.nombres} ${perfil.apellidos}` : ""}.</p>
              {cert ? (
                <dl className={s.dl}>
                  <div><dt>Código de verificación</dt><dd className={s.mono}>{cert.codigo}</dd></div>
                  <div><dt>Emitido el</dt><dd>{fecha(cert.emitido_at)}</dd></div>
                </dl>
              ) : <p className={s.muted}>El código de verificación se genera la primera vez que descargas el certificado.</p>}
              {cert && <Link className={s.linkbtn} style={{ alignSelf: "flex-start", paddingLeft: 0 }} href={`/verificar-certificado/${cert.codigo}`}>Verificar este certificado</Link>}
              <p className={s.hint}>El certificado acredita la inscripción en PET ID. No reemplaza documentos oficiales ni es por sí solo prueba definitiva de propiedad.</p>
              <a className={cx(s.btn, s.sec)} href={`${api}/certificado`} download>Descargar certificado (PDF)</a>
            </article>
          </main>
        );
      }}</Estado>
    </>
  );
}
