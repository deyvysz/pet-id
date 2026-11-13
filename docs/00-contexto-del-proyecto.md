# PET ID: contexto del proyecto

Actualizado: 12 de noviembre de 2026. Todo chat nuevo lee este archivo primero. Si difiere del repositorio, manda el repositorio.

## Qué es

Plataforma de identidad digital para mascotas en Perú. Cada mascota recibe un número PET ID (formato `PE-00000125`), una placa con QR, un DNI digital, un certificado con código de verificación (formato `PID-7Q4K-92XM`) y un registro de salud que llena el propietario. Si se pierde, quien la encuentra lee el QR o sube una foto, y el sistema la compara con las mascotas registradas por reconocimiento de patrones de rostro y cuerpo.

## Quiénes

- Deyvys: responsable del proyecto y del desarrollo.
- Dra. Isabel De Castro: autora de los requisitos.
- Proyecto interno.

## Decisiones vigentes (detalle en docs/decisiones/ del repositorio)

1. Reconocimiento por foto desde la fase 1 (001).
2. Stack: Next.js 15.5.28 con React 19.1.10, Supabase (Auth, Postgres con pgvector, Storage, pgmq) y servicio Python FastAPI (002, 011).
3. Modelos: DINOv2 ViT-B/14 y OWL-ViT o DETR. Excluidos Ultralytics YOLO (AGPL) y MegaDescriptor (CC BY-NC) (003).
4. Vacunas y salud las registra el propietario (004).
5. Contratos y esquema congelados el día 1; cambios solo con decisión y migración nueva (006).
6. El estado de la mascota sigue al reporte de pérdida; la cola lleva `ruta_storage` (007).
7. Puntaje 60 % rostro y 40 % cuerpo; rostro solo en fotos de frente y perfil; motivos de rechazo `pequena` y `error_proceso` (008).
8. Ingreso con celular y código SMS; QR apunta a `/m/{pet_id}`; PDF con pdf-lib (009).
9. Correo obligatorio del propietario; los avisos de quien encuentra la mascota llegan por correo con Resend (010).

## Estado

Construcción de la fase 1 integrada en `main`. Migraciones 0001 a 0009. Web con 32 rutas: propietario, pública, administración (resumen, reportes, mascotas con ficha, usuarios) y API.

Entorno local funcionando en WSL `PetId`, carpeta `~/petid-infra`, con `scripts/local.sh preparar` e `iniciar`. En modo simulado pasaron: fotos guiadas, reporte de pérdida, página del QR, búsqueda por foto, contacto, mascota encontrada y panel de administración. Faltan: PDF del DNI y certificado, registro de vacuna. Después: modelo real.

## Pendiente de Deyvys

- Confirmar con el cliente qué piden con "Face ID": escaneo guiado de la mascota con la cámara (2 a 3 días) o ingreso del dueño con Face ID o huella mediante passkeys (unos 2 días, por verificar con Supabase). No se trabaja hasta que lo confirme.
- Precio de Premium (la portada muestra S/ 9.90 como referencial), correo de contacto del pie, textos legales.
- Si la vista pública debe aceptar solo consultas por PET ID exacto.
- Para producción: proyecto Supabase, cuenta y dominio de Resend, servidor para el reconocimiento.

## Dónde está cada cosa

- Repositorio privado: https://github.com/deyvysz/pet-id (README, ESTADO.md, docs/, infra/supabase/, src/web/, src/reconocimiento/, scripts/local.sh).
- Drive, carpeta `Interno - PET ID`: 00 Índice, requisitos del cliente (02 Análisis), prototipo, maqueta y referencia del DNI (03 Diseño), costos y tiempos (90 Interno).
- Documentos vivos en Claude: requisitos reestructurados (https://claude.ai/artifact/1RHFKkQTeWrh4bC71r5eVM), flujo funcional (https://claude.ai/artifact/TzTAZftFAzrSQUkQMF2tas), prototipo (https://claude.ai/artifact/7Xy3ntciccD7bNchUAMk1z).

## Reglas de trabajo

- Español, tono neutro, reglas de escritura de Deyvys.
- Cada cosa en un solo lugar; sin "v2" en los nombres; versiones viejas a 99 Superados.
- Decisión nueva: archivo en `docs/decisiones/` el mismo día y una línea aquí.
- Costos y precios solo en 90 Interno; nunca en documentos para el cliente.
- Al agregar un documento, actualizar el 00 Índice de Drive y este archivo.
