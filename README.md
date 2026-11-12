# PET ID

Plataforma de identidad digital para mascotas en Perú. Cada mascota tiene un número PET ID (formato `PE-00000125`), una placa con código QR, un DNI digital, un certificado verificable y un registro de salud que lleva el propietario. Si la mascota se pierde, quien la encuentra puede leer el QR o subir una foto; el sistema la compara con las mascotas registradas por reconocimiento de patrones (rostro y cuerpo).

Proyecto interno. Requisitos de la Dra. Isabel De Castro.

## Componentes

- `src/web/`: aplicación Next.js (web responsiva, móvil y escritorio).
- `src/reconocimiento/`: servicio Python FastAPI que extrae vectores de imagen (DINOv2 ViT-B/14, 768 dimensiones) y responde búsquedas.
- `infra/supabase/`: esquema Postgres con pgvector, políticas RLS, buckets de Storage y colas.

## Cómo empezar

1. Leer `ESTADO.md` y las decisiones en `docs/decisiones/`.
2. Abrir `docs/diseno/prototipo.html` en el navegador: son las 24 pantallas acordadas.
3. Leer `docs/diseno/arquitectura.md` y `docs/diseno/contratos-api.md` antes de escribir código.

## Documentos vivos (fuera del repositorio)

- Requisitos reestructurados: https://claude.ai/artifact/1RHFKkQTeWrh4bC71r5eVM
- Flujo funcional: https://claude.ai/artifact/TzTAZftFAzrSQUkQMF2tas
- Prototipo publicado: https://claude.ai/artifact/7Xy3ntciccD7bNchUAMk1z
