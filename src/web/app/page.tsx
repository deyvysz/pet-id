// Página de inicio (agente 4). Fuente: docs/diseno/prototipo.html (pantalla "inicio") y docs/diseno/maqueta-inicio.jpg.
/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { CabeceraSitio, PieSitio } from "@/components/publico/Estructura";
import BotonAviso from "@/components/publico/BotonAviso";
import { esDemo } from "@/components/publico/demo";
import { IMG_HERO, IMG_PERRO } from "@/components/publico/img/imagenes";
import {
  Huella, IcBuscar, IcCampana, IcCarne, IcCheck, IcCorazon, IcCorona, IcFlecha, IcPlay, IcTienda, IcUsuario, QrDecorativo,
} from "@/components/publico/iconos";

const PASOS = [
  { ic: <IcUsuario />, t: "Crea tu cuenta y verifica tu identidad." },
  { ic: <Huella />, t: "Registra a tu mascota con sus datos y fotos guiadas." },
  { ic: <IcCarne />, t: "Obtén su PET ID, su DNI digital y su código QR." },
  { ic: <IcCorazon />, t: "Gestiona su salud, vacunas y más." },
];

const PREGUNTAS = [
  ["¿El DNI PET ID es un documento oficial?", "No. Es una credencial privada de registro en PET ID. No reemplaza el registro municipal de canes ni documentos emitidos por una autoridad."],
  ["¿Qué ve una persona que escanea el QR de mi mascota?", "Su nombre, su foto, su número PET ID y si está extraviada. Tu DNI, dirección, teléfono y correo no se muestran."],
  ["¿Cómo funciona la búsqueda por foto?", "Quien encuentra una mascota sube su foto y la comparamos con las mascotas extraviadas de la zona. Mostramos las más parecidas y siempre confirma una persona: el parecido no es una identificación."],
  ["¿Por qué me piden varias fotos?", "La cara de frente, la cara de perfil y el cuerpo entero muestran rasgos distintos. Con esas fotos tu mascota entra en la búsqueda por foto."],
  ["¿Cuánto cuesta?", "El registro, el DNI digital, el QR, el reporte de extravío y la búsqueda por foto son gratuitos. El plan Premium agrega historial veterinario y recordatorios."],
];

const Item = ({ children }: { children: React.ReactNode }) => <li><IcCheck />{children}</li>;

export default function Inicio() {
  return (
    <div className="pub">
      <CabeceraSitio variante="inicio" />
      <main className="home">
        <section className="hero">
          <div className="in">
            <div>
              <p className="eyebrow">Identidad digital para mascotas</p>
              <h1>Cada mascota merece una <em>identidad</em><Huella className="paw-deco" /></h1>
              <p className="lead">Registra a tu mascota, obtén su PET ID, administra su salud y aumenta sus posibilidades de volver a casa, con su placa QR o con una foto.</p>
              <div className="hero-ctas">
                <Link className="btn" href="/crear-cuenta"><span className="ico"><Huella /></span>Registra a tu mascota<span className="ico"><IcFlecha /></span></Link>
                <Link className="btn sec" href="#como"><span className="play"><IcPlay /></span>Ver cómo funciona</Link>
              </div>
            </div>
            <div className="hero-art">
              <div className="hero-photo"><img src={IMG_HERO} alt="Un perro golden retriever y un gato atigrado" /></div>
              <div className="mini-id" aria-label="Ejemplo de DNI PET ID">
                <div className="mini-id-head">
                  <span className="logo"><span className="logo-mark"><Huella /></span><span>Pet<b>ID</b></span></span>
                  <span className="chip">DNI de mascota</span>
                </div>
                <div className="mini-id-body">
                  <img src={IMG_PERRO} alt="" />
                  <div>
                    <span className="k">Nombre</span><span className="v">MAX</span>
                    <span className="k" style={{ marginTop: 4 }}>N.° PET ID</span><span className="v mono">PE-00000125</span>
                  </div>
                  <div className="mini-qr"><QrDecorativo codigo="PE-00000125" etiqueta="Código QR de ejemplo" /></div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="band" id="perdidas">
          <div className="in">
            <div className="sec-title">
              <h2>¿Perdiste o encontraste una mascota?</h2>
              <p className="muted">El reporte y la búsqueda son gratuitos. Para avisar que encontraste una mascota no necesitas cuenta.</p>
            </div>
            <div className="lostfound">
              <article className="lf-card">
                <div className="round-ic"><IcCampana /></div>
                <h3>Perdí a mi mascota</h3>
                <p>Repórtala desde tu cuenta. Su página QR muestra el aviso y comparamos sus fotos con las mascotas que otras personas encuentran en tu zona.</p>
                <div className="btn-row"><Link className="btn" href="/mis-mascotas">Reportar extravío</Link></div>
              </article>
              <article className="lf-card">
                <div className="round-ic"><IcBuscar /></div>
                <h3>Encontré una mascota</h3>
                <p>Si tiene placa, escanea el QR con la cámara de tu teléfono. Si no la tiene, sube una foto y te mostramos las mascotas extraviadas que más se parecen.</p>
                <div className="btn-row">
                  <Link className="btn" href="/encontre">Buscar por foto</Link>
                  {esDemo() && <Link className="btn sec" href="/m/PE-00000125">Ver una página QR</Link>}
                </div>
              </article>
            </div>
          </div>
        </section>

        <section id="como">
          <div className="in">
            <div className="sec-title lines">
              <h2>¿Cómo funciona?</h2>
              <p className="muted">En 4 pasos creas la identidad digital de tu mascota.</p>
            </div>
            <ol className="steps">
              {PASOS.map((p, i) => (
                <li className="step" key={i}><div className="step-ic"><span className="step-n">{i + 1}</span>{p.ic}</div>{p.t}</li>
              ))}
            </ol>
            <p className="center muted" style={{ marginTop: 28 }}>Las fotos de frente, de perfil y de cuerpo entero permiten buscar a tu mascota por foto si se pierde sin placa.</p>
          </div>
        </section>

        <section className="band" id="planes">
          <div className="in">
            <div className="sec-title">
              <h2>Planes PET ID</h2>
              <p className="muted">Elige el plan que se adapte a ti y a tu mascota.</p>
            </div>
            <div className="plans">
              <article className="plan">
                <div className="plan-head"><Huella />PET ID Free</div>
                <ul>
                  <Item>Registro de tu mascota</Item><Item>Número único PET ID</Item><Item>DNI digital y código QR</Item>
                  <Item>Reporte de extravío</Item><Item>Búsqueda por foto</Item>
                </ul>
                <div className="plan-foot"><span className="price">Gratis</span><Link className="btn sec" href="/crear-cuenta">Registrarme</Link></div>
              </article>
              <article className="plan featured">
                <div className="plan-head"><IcCorona />PET ID Premium</div>
                <ul>
                  <Item>Todo lo del plan Free</Item><Item>Historial veterinario completo</Item><Item>Recordatorios de vacunas y controles</Item>
                  <Item>Mayor espacio para documentos</Item><Item>Beneficios y promociones exclusivas</Item>
                </ul>
                <div className="plan-foot">
                  <span className="price">S/ 9.90 <small>/ mes</small></span><span className="hint">Precio referencial</span>
                  <BotonAviso className="btn" aviso="Los pagos se habilitan en la fase 2">Suscribirme</BotonAviso>
                </div>
              </article>
              <article className="plan" id="veterinarias">
                <div className="plan-head"><IcTienda />Para veterinarias</div>
                <ul>
                  <Item>Gestión de mascotas y pacientes</Item><Item>Registro de vacunas y controles validados</Item>
                  <Item>Acceso autorizado al expediente</Item><Item>Búsqueda por PET ID o por foto</Item>
                </ul>
                <div className="plan-foot">
                  <span className="price" style={{ fontSize: 20 }}>Plan empresarial</span>
                  <BotonAviso className="btn sec" aviso="El portal para veterinarias llega en la fase 2">Conoce el plan empresarial</BotonAviso>
                </div>
              </article>
            </div>
          </div>
        </section>

        <section id="ayuda">
          <div className="in">
            <div className="sec-title"><h2>Preguntas frecuentes</h2></div>
            <div className="faq">
              {PREGUNTAS.map(([q, a]) => <details key={q}><summary>{q}</summary><p>{a}</p></details>)}
            </div>
          </div>
        </section>
      </main>
      <PieSitio />
    </div>
  );
}
