# Reparto de rutas (para que los agentes no se pisen)

Agente 3, web del propietario: `app/(propietario)/**` y `components/propietario/**`.
Rutas: /ingresar, /crear-cuenta, /verificar, /mis-mascotas, /mascotas/nueva, /mascotas/[id]/fotos, /mascotas/[id]/dni, /mascotas/[id]/salud, /mascotas/[id]/reportar, /perfil.
API: app/api/v1/mascotas/[id]/certificado (PDF), app/api/v1/mascotas/[id]/qr.

Agente 4, web pública y administración: `app/page.tsx` (inicio), `app/(publico)/**`, `app/admin/**`, `components/publico/**`, `components/admin/**`.
Rutas: /, /m/[pet_id] (lo que abre el QR), /m/[pet_id]/contactar, /encontre, /encontre/resultados, /verificar-certificado/[codigo], /admin.
API: app/api/v1/verificar/[codigo], app/api/v1/mascotas/[pet_id]/publico, app/api/v1/hallazgos, app/api/v1/contacto.

Compartido (solo lo cambia el coordinador): `app/layout.tsx`, `app/globals.css`, `lib/contratos.ts`, `lib/supabase.ts`, `package.json`.
Si un agente necesita una dependencia nueva, la anota en su resumen y el coordinador la agrega.
