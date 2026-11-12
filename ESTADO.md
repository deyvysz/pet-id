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
- Aviso al propietario por correo (decisión 010).
- Revisión independiente hecha: 6 fallas corregidas (migración 0008, middleware de sesión, ruta del certificado, QR con sesión, vista pública con un solo reporte, contacto con hallazgo inexistente).

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

## Riesgos abiertos

- El servicio de reconocimiento no tiene autenticación: debe correr en red privada y con `URL_HOSTS_PERMITIDOS` fijado al dominio de Supabase.

- Nada se ha probado aún contra Supabase real ni con los pesos reales del modelo.
- Precisión del reconocimiento sin datos propios: se mide con Recall@1/5/10 antes de prometer porcentajes.
- En este entorno Google Fonts está bloqueado; el build se verificó con las fuentes simuladas.
