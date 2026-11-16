# Estado del proyecto

Actualizado: 12 de noviembre de 2026.

## Fase actual

Construcción de la fase 1: los cuatro frentes están integrados en `main`. Falta conectar servicios reales (Supabase, modelo de reconocimiento, correo y SMS).

## Hecho

- Día 1: esquema, contratos y reparto de rutas congelados (decisión 006).
- Base de datos: migraciones 0001 a 0009, seed de demo y pruebas de acceso que pasan contra Postgres 16 con pgvector (`infra/supabase/pruebas/probar.sh`).
- Reconocimiento: servicio FastAPI, worker de cola, script de evaluación; 48 pruebas pasan con modelos simulados.
- Web: 27 rutas (propietario, pública, administración y API). tsc, lint y build pasan; en modo demo (`NEXT_PUBLIC_DEMO=1`) todas responden 200.
- Decisiones 007, 008 y 009 con los ajustes de contrato de la integración.
- Entorno local levantado en WSL (distribución PetId, carpeta ~/petid-infra) el 12 de noviembre de 2026: Supabase local, web y reconocimiento con modelo simulado; ingreso por celular con código de prueba funciona.
- Pruebas en modo simulado (12 de noviembre de 2026), aprobadas: fotos guiadas procesadas por el worker, reporte de pérdida, página del QR sin datos del propietario, búsqueda por foto, contacto guardado en `mensajes_contacto`, mascota encontrada y panel de administración. Pendiente: PDF del DNI y certificado, registro de vacuna.
- Aviso al propietario por correo (decisión 010).
- Revisión independiente hecha: 6 fallas corregidas (migración 0008, middleware de sesión, ruta del certificado, QR con sesión, vista pública con un solo reporte, contacto con hallazgo inexistente).

## Despliegue del piloto (decisión 013)

Infraestructura lista en el repositorio: Dockerfiles, GitHub Actions para GHCR, Ansible en `infra/ansible/` y guía en `docs/operacion/despliegue-piloto.md`. Verificado aquí: sintaxis del playbook, plantillas de los stacks y build de la web en modo standalone. No se ha corrido contra un servidor.

Avance del 15 y 16 de noviembre de 2026, contra el servidor real (Contabo Cloud VPS 4, US Central, 194.238.30.239): usuario `admin` con llave, base, SSH solo con llave, VPN WireGuard (servidor 10.10.0.1, cliente 10.10.0.2), cortafuegos con denegación por defecto (comprobado: el 22 no responde desde internet), Docker 29.9.2, Swarm de un nodo y redes `edge` e `internal`.

El 16 de noviembre de 2026 el piloto quedó publicado en https://piloto.petid.com.pe: Traefik, web, reconocimiento y worker corriendo en el swarm, Supabase Cloud con las migraciones 0001 a 0010 y los datos de demo, dominio delegado a Cloudflare e imágenes en GHCR. Se entra con el celular de prueba `987654321` y el código `123456`.

Pendiente en el despliegue: Cloudflare está en modo "Completo" con un certificado autofirmado en el servidor, porque su panel no deja crear el certificado de origen ("This zone is either not part of your account", con la zona activa). Al crearlo hay que reemplazar `secret_origin_cert` y `secret_origin_key`, correr `--tags traefik` y volver a "Completo (estricto)".

## Siguiente

1. Crear el proyecto en Supabase, aplicar migraciones 0001 a 0009 y el seed, activar el proveedor SMS de Auth.
2. Cargar las variables de `src/web/.env.example` y del servicio de reconocimiento.
3. Desplegar el servicio de reconocimiento con los pesos reales (OWL-ViT y DINOv2) y probarlo con fotos reales.
4. Reunir el conjunto de evaluación (50 mascotas, 3 fotos o más) y calibrar el umbral con `src/reconocimiento/eval/evaluar.py`.

## Pendiente de Deyvys


- Precio de Premium (la portada muestra S/ 9.90 como referencial).
- Correo de contacto del pie de página.
- Textos legales: términos, privacidad, libro de reclamaciones.
- Si la vista pública debe aceptar solo consultas por PET ID exacto (decisión 007).
- Confirmar con el cliente qué significa "Face ID": escaneo guiado de la mascota con cámara o ingreso del dueño con biometría (passkeys). En espera; no se trabaja hasta confirmar.

## Riesgos abiertos

- El servicio de reconocimiento no tiene autenticación: debe correr en red privada y con `URL_HOSTS_PERMITIDOS` fijado al dominio de Supabase.

- Nada se ha probado aún contra Supabase real ni con los pesos reales del modelo.
- Precisión del reconocimiento sin datos propios: se mide con Recall@1/5/10 antes de prometer porcentajes.
- En este entorno Google Fonts está bloqueado; el build se verificó con las fuentes simuladas.
