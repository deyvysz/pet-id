-- PET ID: políticas de acceso (RLS), permisos por columna y funciones públicas.
-- Depende de 0001_esquema.sql. Roles de Supabase: anon (sin sesión), authenticated (con sesión),
-- service_role (rutas API del servidor; omite RLS).
--
-- Resumen:
--   propietario  CRUD de su perfil, mascotas, fotos, registros_salud y reportes_perdida;
--                lectura de certificados, historial y mensajes_contacto de sus mascotas.
--   admin        (perfiles.rol = 'admin') lectura de todo excepto vectores_foto; actualiza
--                mascotas.estado, fotos.estado/motivo_rechazo y reportes_perdida.activo/cerrado_at.
--   anon         lectura de la vista mascotas_publico y verificar_certificado(codigo).
--   service_role todo lo demás: hallazgos, mensajes_contacto, vectores_foto, buscar_similares.
--
-- Las INSERT del cliente se limitan con permisos por columna (las columnas que no se conceden
-- toman su valor por defecto). Las UPDATE se limitan con el trigger privado.limitar_actualizacion.

-- ---------------------------------------------------------------------------
-- Funciones auxiliares (esquema privado, no expuesto por la API de datos)
-- ---------------------------------------------------------------------------
create schema if not exists privado;
revoke all on schema privado from public;
grant usage on schema privado to anon, authenticated, service_role;

-- ¿El usuario de la sesión es administrador? security definer para no recursar en RLS de perfiles.
create or replace function privado.es_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.perfiles p
    where p.id = auth.uid() and p.rol = 'admin'
  )
$$;

-- ¿La mascota pertenece al usuario de la sesión?
create or replace function privado.es_mi_mascota(p_mascota uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.mascotas m
    where m.id = p_mascota and m.propietario_id = auth.uid()
  )
$$;

-- Igual, pero recibe texto (primer segmento de una ruta de Storage). Devuelve false si no es un uuid.
create or replace function privado.es_mi_mascota_txt(p_mascota text) returns boolean
language sql stable security definer set search_path = '' as $$
  select case
    when p_mascota ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      then privado.es_mi_mascota(p_mascota::uuid)
    else false
  end
$$;

revoke all on all functions in schema privado from public;
grant execute on all functions in schema privado to anon, authenticated, service_role;

-- Limita qué columnas puede cambiar un cliente en un UPDATE.
-- Argumentos del trigger: (columnas del propietario, columnas del admin), separadas por coma.
-- Solo actúa con los roles anon y authenticated; service_role y las funciones security definer
-- (que corren como su dueño) pasan sin restricción. actualizado_at se ignora (lo pone 0004).
create or replace function privado.limitar_actualizacion() returns trigger
language plpgsql set search_path = '' as $$
declare
  v_viejo jsonb := to_jsonb(old);
  v_cambiadas text[];
  v_permitidas text[] := '{}';
  v_dueno boolean;
begin
  if current_user not in ('anon', 'authenticated') then
    return new;
  end if;

  select coalesce(array_agg(n.key), '{}') into v_cambiadas
  from jsonb_each(to_jsonb(new)) n
  where n.key <> 'actualizado_at' and n.value is distinct from (v_viejo -> n.key);

  if tg_table_name = 'perfiles' then
    v_dueno := (v_viejo ->> 'id')::uuid = auth.uid();
  elsif tg_table_name = 'mascotas' then
    v_dueno := (v_viejo ->> 'propietario_id')::uuid = auth.uid();
  else
    v_dueno := privado.es_mi_mascota((v_viejo ->> 'mascota_id')::uuid);
  end if;

  if v_dueno then
    v_permitidas := v_permitidas || string_to_array(tg_argv[0], ',');
  end if;
  if privado.es_admin() then
    v_permitidas := v_permitidas || string_to_array(tg_argv[1], ',');
  end if;

  if not v_cambiadas <@ v_permitidas then
    raise exception 'No puede modificar estas columnas de %: %', tg_table_name,
      array_to_string(array(select unnest(v_cambiadas) except select unnest(v_permitidas)), ', ')
      using errcode = '42501';
  end if;
  return new;
end $$;

create trigger limitar_actualizacion before update on public.perfiles for each row
  execute function privado.limitar_actualizacion(
    'nombres,apellidos,tipo_documento,numero_documento,celular,departamento,provincia,distrito,acepta_terminos_at,acepta_privacidad_at',
    '');
create trigger limitar_actualizacion before update on public.mascotas for each row
  execute function privado.limitar_actualizacion(
    'nombre,raza,sexo,fecha_nacimiento,fecha_nacimiento_estimada,color,senas,microchip,esterilizado,estado,foto_principal_id',
    'estado');
create trigger limitar_actualizacion before update on public.fotos for each row
  execute function privado.limitar_actualizacion('tipo', 'estado,motivo_rechazo');
create trigger limitar_actualizacion before update on public.registros_salud for each row
  execute function privado.limitar_actualizacion('tipo,nombre,fecha,proxima_fecha,notas,ruta_adjunto', '');
create trigger limitar_actualizacion before update on public.reportes_perdida for each row
  execute function privado.limitar_actualizacion(
    'fecha_perdida,distrito,referencia,lat,lng,mensaje,activo,cerrado_at', 'activo,cerrado_at');

-- ---------------------------------------------------------------------------
-- Permisos de tabla (Supabase concede ALL a anon y authenticated por defecto; aquí se recorta)
-- ---------------------------------------------------------------------------
revoke all on table
  public.perfiles, public.mascotas, public.fotos, public.vectores_foto, public.certificados,
  public.registros_salud, public.reportes_perdida, public.hallazgos, public.mensajes_contacto,
  public.historial
from anon, authenticated;

-- Tablas que el propietario escribe: SELECT, UPDATE y DELETE de tabla; INSERT solo de ciertas columnas.
grant select, update, delete on public.perfiles, public.mascotas, public.fotos,
  public.registros_salud, public.reportes_perdida to authenticated;

grant insert (id, nombres, apellidos, tipo_documento, numero_documento, celular,
              departamento, provincia, distrito, acepta_terminos_at, acepta_privacidad_at)
  on public.perfiles to authenticated;
grant insert (id, propietario_id, nombre, especie, raza, sexo, fecha_nacimiento,
              fecha_nacimiento_estimada, color, senas, microchip, esterilizado, foto_principal_id)
  on public.mascotas to authenticated;
grant insert (id, mascota_id, tipo, ruta_storage) on public.fotos to authenticated;
grant insert (id, mascota_id, tipo, nombre, fecha, proxima_fecha, notas, ruta_adjunto)
  on public.registros_salud to authenticated;
grant insert (id, mascota_id, fecha_perdida, distrito, referencia, lat, lng, mensaje)
  on public.reportes_perdida to authenticated;

-- Solo lectura para clientes con sesión (el filtro lo hace RLS).
grant select on public.certificados, public.historial, public.hallazgos, public.mensajes_contacto
  to authenticated;

-- vectores_foto: sin permisos para anon ni authenticated (revocados arriba).

grant all on table
  public.perfiles, public.mascotas, public.fotos, public.vectores_foto, public.certificados,
  public.registros_salud, public.reportes_perdida, public.hallazgos, public.mensajes_contacto,
  public.historial
to service_role;

-- ---------------------------------------------------------------------------
-- Políticas
-- (select auth.uid()) se evalúa una vez por consulta, no por fila.
-- ---------------------------------------------------------------------------

-- perfiles
create policy perfiles_leer on public.perfiles for select to authenticated
  using (id = (select auth.uid()) or (select privado.es_admin()));
create policy perfiles_crear on public.perfiles for insert to authenticated
  with check (id = (select auth.uid()));
create policy perfiles_editar on public.perfiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));
create policy perfiles_borrar on public.perfiles for delete to authenticated
  using (id = (select auth.uid()));

-- mascotas
create policy mascotas_leer on public.mascotas for select to authenticated
  using (propietario_id = (select auth.uid()) or (select privado.es_admin()));
create policy mascotas_crear on public.mascotas for insert to authenticated
  with check (propietario_id = (select auth.uid()) and foto_principal_id is null);
-- foto_principal_id solo puede apuntar a una foto de la misma mascota (la vista pública la muestra).
create policy mascotas_editar on public.mascotas for update to authenticated
  using (propietario_id = (select auth.uid()))
  with check (
    propietario_id = (select auth.uid())
    and (foto_principal_id is null
         or exists (select 1 from public.fotos f where f.id = foto_principal_id and f.mascota_id = mascotas.id))
  );
create policy mascotas_editar_admin on public.mascotas for update to authenticated
  using ((select privado.es_admin())) with check ((select privado.es_admin()));
create policy mascotas_borrar on public.mascotas for delete to authenticated
  using (propietario_id = (select auth.uid()));

-- fotos (las de hallazgo tienen mascota_id null y solo las maneja service_role)
create policy fotos_leer on public.fotos for select to authenticated
  using ((mascota_id is not null and privado.es_mi_mascota(mascota_id)) or (select privado.es_admin()));
create policy fotos_crear on public.fotos for insert to authenticated
  with check (
    mascota_id is not null and privado.es_mi_mascota(mascota_id)
    and tipo <> 'hallazgo'
    and split_part(ruta_storage, '/', 1) = mascota_id::text
  );
create policy fotos_editar on public.fotos for update to authenticated
  using (mascota_id is not null and privado.es_mi_mascota(mascota_id))
  with check (mascota_id is not null and privado.es_mi_mascota(mascota_id) and tipo <> 'hallazgo');
create policy fotos_editar_admin on public.fotos for update to authenticated
  using ((select privado.es_admin())) with check ((select privado.es_admin()));
create policy fotos_borrar on public.fotos for delete to authenticated
  using (mascota_id is not null and privado.es_mi_mascota(mascota_id));

-- registros_salud
create policy salud_leer on public.registros_salud for select to authenticated
  using (privado.es_mi_mascota(mascota_id) or (select privado.es_admin()));
create policy salud_crear on public.registros_salud for insert to authenticated
  with check (
    privado.es_mi_mascota(mascota_id)
    and (ruta_adjunto is null or split_part(ruta_adjunto, '/', 1) = mascota_id::text)
  );
create policy salud_editar on public.registros_salud for update to authenticated
  using (privado.es_mi_mascota(mascota_id))
  with check (
    privado.es_mi_mascota(mascota_id)
    and (ruta_adjunto is null or split_part(ruta_adjunto, '/', 1) = mascota_id::text)
  );
create policy salud_borrar on public.registros_salud for delete to authenticated
  using (privado.es_mi_mascota(mascota_id));

-- reportes_perdida
create policy reportes_leer on public.reportes_perdida for select to authenticated
  using (privado.es_mi_mascota(mascota_id) or (select privado.es_admin()));
create policy reportes_crear on public.reportes_perdida for insert to authenticated
  with check (privado.es_mi_mascota(mascota_id));
create policy reportes_editar on public.reportes_perdida for update to authenticated
  using (privado.es_mi_mascota(mascota_id)) with check (privado.es_mi_mascota(mascota_id));
create policy reportes_editar_admin on public.reportes_perdida for update to authenticated
  using ((select privado.es_admin())) with check ((select privado.es_admin()));
create policy reportes_borrar on public.reportes_perdida for delete to authenticated
  using (privado.es_mi_mascota(mascota_id));

-- certificados (los crea el trigger de 0004; ruta_pdf la escribe service_role)
create policy certificados_leer on public.certificados for select to authenticated
  using (privado.es_mi_mascota(mascota_id) or (select privado.es_admin()));

-- historial (lo escriben los triggers de 0004)
create policy historial_leer on public.historial for select to authenticated
  using ((mascota_id is not null and privado.es_mi_mascota(mascota_id)) or (select privado.es_admin()));

-- hallazgos: escritura solo service_role; lectura solo admin
create policy hallazgos_leer_admin on public.hallazgos for select to authenticated
  using ((select privado.es_admin()));

-- mensajes_contacto: escritura solo service_role; lectura del propietario de la mascota y del admin
create policy mensajes_leer on public.mensajes_contacto for select to authenticated
  using (privado.es_mi_mascota(mascota_id) or (select privado.es_admin()));

-- vectores_foto: RLS activo y sin políticas; solo service_role.

-- ---------------------------------------------------------------------------
-- Funciones de 0001
-- ---------------------------------------------------------------------------
-- buscar_similares lee vectores_foto: solo service_role (la llama la ruta /api/v1/hallazgos o el servicio).
revoke execute on function public.buscar_similares(vector, vector, especie, text, boolean, int)
  from public, anon, authenticated;
grant execute on function public.buscar_similares(vector, vector, especie, text, boolean, int)
  to service_role;

-- nuevo_pet_id es el DEFAULT de mascotas.pet_id: el propietario lo ejecuta al insertar, pero no
-- tiene permiso sobre la secuencia, así que la función corre como su dueño.
alter function public.nuevo_pet_id() security definer set search_path = public;
revoke execute on function public.nuevo_pet_id() from public, anon;
grant execute on function public.nuevo_pet_id() to authenticated, service_role;

-- nuevo_codigo_verificacion: solo la usa el trigger de certificados (security definer).
revoke execute on function public.nuevo_codigo_verificacion() from public, anon, authenticated;
grant execute on function public.nuevo_codigo_verificacion() to service_role;

-- ---------------------------------------------------------------------------
-- Vista pública
-- Corre con los permisos de su dueño (security_invoker = false), así anon la lee sin tener acceso
-- a las tablas. Expone solo las columnas definidas en 0001 (nada del propietario).
-- foto_principal es la ruta en el bucket privado 'fotos'; el servidor genera la URL firmada.
-- ---------------------------------------------------------------------------
alter view public.mascotas_publico set (security_invoker = false);
revoke all on public.mascotas_publico from public, anon, authenticated;
grant select on public.mascotas_publico to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Verificación de certificado por código (GET /api/v1/verificar/{codigo})
-- Acepta minúsculas y espacios alrededor. Devuelve 0 filas si el código no existe.
-- ---------------------------------------------------------------------------
create or replace function public.verificar_certificado(codigo text)
returns table (pet_id text, nombre text, especie especie, estado estado_mascota, emitido_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select m.pet_id, m.nombre, m.especie, m.estado, c.emitido_at
  from public.certificados c
  join public.mascotas m on m.id = c.mascota_id
  where c.codigo = upper(btrim(verificar_certificado.codigo))
$$;
revoke execute on function public.verificar_certificado(text) from public;
grant execute on function public.verificar_certificado(text) to anon, authenticated, service_role;
