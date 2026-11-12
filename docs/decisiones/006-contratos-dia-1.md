# 006. Contratos y esquema congelados (día 1)

Fecha: 12 de noviembre de 2026. Decidió: Deyvys (coordinación de Claude).

Quedan fijos `infra/supabase/migrations/0001_esquema.sql`, `src/web/lib/contratos.ts`, `src/reconocimiento/app/contratos.py` y el reparto de rutas en `src/web/RUTAS.md`. La web es Next.js 15 con App Router, sin Tailwind; los estilos usan los tokens del prototipo en `app/globals.css`.

Por qué: cuatro agentes construyen en paralelo; sin un contrato fijo cada uno inventaría nombres distintos.

Cambios: una decisión nueva en esta carpeta y una migración nueva (0002, 0003...). La 0001 no se edita.
