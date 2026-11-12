-- PET ID: triggers de mantenimiento.
-- Depende de 0001 a 0003. Las funciones que escriben en tablas que el propietario no puede
-- escribir (certificados, historial, mascotas.lista_para_busqueda) son security definer.

-- ---------------------------------------------------------------------------
-- 1. mascotas.actualizado_at
-- ---------------------------------------------------------------------------
create or replace function privado.poner_actualizado_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.actualizado_at := now();
  return new;
end $$;

create trigger poner_actualizado_at before update on public.mascotas
  for each row execute function privado.poner_actualizado_at();

-- ---------------------------------------------------------------------------
-- 2. mascotas.lista_para_busqueda = true con >= 1 vector de rostro y >= 1 de cuerpo.
--    Se recalcula al insertar, borrar o cambiar vectores (vuelve a false si faltan).
-- ---------------------------------------------------------------------------
create or replace function privado.recalcular_lista_para_busqueda(p_mascota uuid) returns void
language sql security definer set search_path = '' as $$
  update public.mascotas m
  set lista_para_busqueda = v.lista
  from (
    select exists (select 1 from public.vectores_foto where mascota_id = p_mascota and tipo = 'rostro')
       and exists (select 1 from public.vectores_foto where mascota_id = p_mascota and tipo = 'cuerpo') as lista
  ) v
  where m.id = p_mascota and m.lista_para_busqueda is distinct from v.lista
$$;

create or replace function privado.vectores_cambiaron() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op in ('INSERT', 'UPDATE') and new.mascota_id is not null then
    perform privado.recalcular_lista_para_busqueda(new.mascota_id);
  end if;
  if tg_op in ('DELETE', 'UPDATE') and old.mascota_id is not null
     and (tg_op = 'DELETE' or old.mascota_id is distinct from new.mascota_id) then
    perform privado.recalcular_lista_para_busqueda(old.mascota_id);
  end if;
  return null;
end $$;

create trigger vectores_cambiaron after insert or update of mascota_id, tipo or delete on public.vectores_foto
  for each row execute function privado.vectores_cambiaron();

-- ---------------------------------------------------------------------------
-- 3. Historial: registro de la mascota, cambios de estado y nuevos registros de salud.
--    actor_id es el usuario de la sesión (null si lo hizo service_role).
-- ---------------------------------------------------------------------------
create or replace function privado.historial_mascota() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    insert into public.historial (mascota_id, actor_id, accion, detalle)
    values (new.id, auth.uid(), 'registro', jsonb_build_object('pet_id', new.pet_id));
  elsif new.estado is distinct from old.estado then
    insert into public.historial (mascota_id, actor_id, accion, detalle)
    values (new.id, auth.uid(), 'cambio_estado',
            jsonb_build_object('de', old.estado, 'a', new.estado));
  end if;
  return null;
end $$;

create trigger historial_mascota after insert or update of estado on public.mascotas
  for each row execute function privado.historial_mascota();

create or replace function privado.historial_salud() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.historial (mascota_id, actor_id, accion, detalle)
  values (new.mascota_id, auth.uid(), 'nuevo_registro_salud',
          jsonb_build_object('registro_id', new.id, 'tipo', new.tipo, 'nombre', new.nombre, 'fecha', new.fecha));
  return null;
end $$;

create trigger historial_salud after insert on public.registros_salud
  for each row execute function privado.historial_salud();

-- ---------------------------------------------------------------------------
-- 4. Certificado al crear la mascota (código PID-XXXX-XXXX por defecto). El PDF lo genera la web
--    después y guarda la ruta en certificados.ruta_pdf con service_role.
-- ---------------------------------------------------------------------------
create or replace function privado.crear_certificado() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  i int;
begin
  -- Reintenta si el código aleatorio choca con uno existente (32^8 combinaciones; casi nunca pasa).
  for i in 1..5 loop
    begin
      insert into public.certificados (mascota_id, codigo)
      values (new.id, public.nuevo_codigo_verificacion());
      return null;
    exception when unique_violation then
      if i = 5 then raise; end if;
    end;
  end loop;
  return null;
end $$;

create trigger crear_certificado after insert on public.mascotas
  for each row execute function privado.crear_certificado();

-- ---------------------------------------------------------------------------
-- 5. Perfil a partir de auth.users.raw_user_meta_data (opcional).
--    Si la web llama a supabase.auth.signUp({ ..., options: { data: {...} } }) con todos estos campos,
--    el perfil se crea solo:
--      nombres, apellidos, tipo_documento ('DNI'|'CE'|'PAS'), numero_documento, celular,
--      departamento, provincia, distrito, acepta_terminos (true), acepta_privacidad (true)
--    Las fechas de aceptación se guardan como now(). Si falta algún campo, o el documento ya está
--    registrado, no se crea el perfil, el alta en Auth sigue adelante y la web debe insertar el perfil
--    (política perfiles_crear). Los errores se registran como WARNING en los logs de Postgres.
-- ---------------------------------------------------------------------------
create or replace function privado.crear_perfil_desde_auth() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  d jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
begin
  if not (d ?& array['nombres', 'apellidos', 'tipo_documento', 'numero_documento', 'celular',
                     'departamento', 'provincia', 'distrito'])
     or coalesce(d ->> 'acepta_terminos', '') <> 'true'
     or coalesce(d ->> 'acepta_privacidad', '') <> 'true' then
    return new;
  end if;

  begin
    insert into public.perfiles (id, nombres, apellidos, tipo_documento, numero_documento, celular,
                                 departamento, provincia, distrito, acepta_terminos_at, acepta_privacidad_at)
    values (new.id, d ->> 'nombres', d ->> 'apellidos', upper(d ->> 'tipo_documento'), d ->> 'numero_documento',
            d ->> 'celular', d ->> 'departamento', d ->> 'provincia', d ->> 'distrito', now(), now())
    on conflict (id) do nothing;
  exception when others then
    raise warning 'crear_perfil_desde_auth: no se creó el perfil de %: %', new.id, sqlerrm;
  end;
  return new;
end $$;

create trigger crear_perfil_desde_auth after insert on auth.users
  for each row execute function privado.crear_perfil_desde_auth();

revoke all on function
  privado.poner_actualizado_at(), privado.recalcular_lista_para_busqueda(uuid), privado.vectores_cambiaron(),
  privado.historial_mascota(), privado.historial_salud(), privado.crear_certificado(),
  privado.crear_perfil_desde_auth()
from public, anon, authenticated;
