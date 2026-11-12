# Base de datos (Supabase)

Postgres con pgvector, políticas RLS, Storage y la cola pgmq de PET ID.

## Archivos

| Archivo | Contenido |
| --- | --- |
| `migrations/0001_esquema.sql` | Tablas, tipos, `buscar_similares`, vista `mascotas_publico`. Congelada: no se edita. |
| `migrations/0002_politicas.sql` | RLS de todas las tablas, permisos por columna, `verificar_certificado(codigo)`. |
| `migrations/0003_storage_y_colas.sql` | Buckets `fotos` y `documentos`, políticas de `storage.objects`, cola `fotos_por_procesar` y trigger que encola. |
| `migrations/0004_triggers.sql` | `actualizado_at`, `lista_para_busqueda`, historial, certificado al crear mascota, perfil desde `auth.users`. |
| `seed.sql` | Datos de demostración. Solo local o pruebas. |
| `pruebas/` | Stub de Supabase y pruebas de acceso para un Postgres local. No se aplica en Supabase. |

## Aplicar en un proyecto Supabase

Antes: en el panel, Database > Extensions, activar `vector` y `pgmq` (o Integrations > Queues). 0003 intenta crear `pgmq` si no está.

Opción A, Supabase CLI (desde la raíz del repositorio):

```bash
cd infra
supabase init            # solo la primera vez; crea supabase/config.toml y respeta migrations/ y seed.sql
supabase link --project-ref <ref-del-proyecto>
supabase db push         # aplica 0001 a 0004 en orden
```

Para desarrollo local con Docker: `supabase start` y luego `supabase db reset` (aplica migraciones y `seed.sql`).

Opción B, SQL editor del panel: pegar y ejecutar en este orden `0001_esquema.sql`, `0002_politicas.sql`, `0003_storage_y_colas.sql`, `0004_triggers.sql`. El seed solo en un proyecto de pruebas.

## Variables de la web

En `src/web/.env.local` (ver `.env.example`):

- `NEXT_PUBLIC_SUPABASE_URL`: URL del proyecto.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: clave anónima; el navegador la usa y RLS la limita.
- `SUPABASE_SERVICE_ROLE_KEY`: clave de servicio, solo en el servidor (rutas `/api`). Omite RLS.

El servicio de reconocimiento usa la misma URL y la clave de servicio para leer la cola y escribir `vectores_foto`.

## Crear el primer administrador

1. La persona crea su cuenta en la web (o en Authentication > Users) y completa su perfil.
2. En el SQL editor (corre como `postgres`):

```sql
update perfiles set rol = 'admin'
where id = (select id from auth.users where email = 'correo@dominio.pe');
```

Un usuario no puede cambiar su propio `rol` desde la API: el trigger `limitar_actualizacion` lo impide.

## Quién puede qué

- Propietario: crea, lee, edita y borra su perfil, sus mascotas, fotos, registros de salud y reportes de pérdida; lee certificados, historial y mensajes de contacto de sus mascotas. No puede tocar `rol`, `celular_verificado`, `pet_id`, `estado` de fotos, `lista_para_busqueda` ni `declarado_por_propietario`.
- Admin: lee todo menos `vectores_foto`; cambia `mascotas.estado`, `fotos.estado` y `motivo_rechazo`, `reportes_perdida.activo` y `cerrado_at`.
- Anónimo: lee `mascotas_publico` y llama a `verificar_certificado('PID-XXXX-XXXX')`, que devuelve `pet_id, nombre, especie, estado, emitido_at` o ninguna fila.
- Clave de servicio: inserta `hallazgos`, `mensajes_contacto`, fotos de hallazgo y `vectores_foto`; ejecuta `buscar_similares`; escribe `certificados.ruta_pdf`.

Rutas de Storage (buckets privados, el servidor genera URL firmadas):

- `fotos/{mascota_id}/{foto_id}.jpg`: el propietario sube y lee.
- `fotos/hallazgos/{hallazgo_id}/{foto_id}.jpg`: solo la clave de servicio.
- `documentos/{mascota_id}/...`: adjuntos de salud del propietario.
- `documentos/{mascota_id}/certificados/...`: PDF del certificado; el propietario lo lee pero no lo escribe.

## Cola de fotos

Cada INSERT en `fotos` con `mascota_id` y estado `pendiente` envía a `fotos_por_procesar`:

```json
{ "foto_id": "uuid", "mascota_id": "uuid", "tipo": "frente", "ruta_storage": "{mascota_id}/{foto_id}.jpg" }
```

El trabajador lee con `pgmq.read('fotos_por_procesar', 60, 10)`, crea la URL firmada a partir de `ruta_storage`, llama a `/embed`, guarda los vectores, actualiza `fotos.estado` y borra el mensaje con `pgmq.delete`. Las fotos de hallazgo no se encolan.

## Alta con perfil automático (opcional)

Si `supabase.auth.signUp` recibe en `options.data` los campos `nombres`, `apellidos`, `tipo_documento`, `numero_documento`, `celular`, `departamento`, `provincia`, `distrito`, `acepta_terminos: true` y `acepta_privacidad: true`, el trigger de 0004 crea el perfil. Si falta alguno o el documento ya existe, el alta sigue y la web inserta el perfil después.

## Datos de demostración

`seed.sql` crea a Ana Pérez (`ana.perez@correo.com`) con Max (`PE-00000125`, certificado `PID-7Q4K-92XM`) y Luna (`PE-00000126`), y un admin (`admin@petid.local`). Contraseña de ambos: `demo1234`. Las fotos existen como filas pero no como archivos, y no hay vectores.

## Pruebas locales

Con Postgres 16 y pgvector instalados (sin Supabase):

```bash
PGHOST=localhost PGPORT=5432 PGUSER=postgres infra/supabase/pruebas/probar.sh
```

Crea la base `petid_prueba`, aplica el stub (`auth`, `storage`, roles y pgmq simulado si la extensión no existe), las cuatro migraciones y el seed, y corre `pruebas/10_rls.sql`, que comprueba los permisos de cada rol dentro de una transacción que se deshace.
