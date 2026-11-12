-- PET ID: buckets de Storage, políticas de storage.objects y cola de procesamiento de fotos.
-- Depende de 0001 y 0002 (usa privado.es_mi_mascota_txt y privado.es_admin).

-- ---------------------------------------------------------------------------
-- Buckets privados
--   fotos:       {mascota_id}/{foto_id}.jpg            (propietario)
--                hallazgos/{hallazgo_id}/{foto_id}.jpg (solo service_role)
--   documentos:  {mascota_id}/...                      (carnés y adjuntos del propietario)
--                {mascota_id}/certificados/...         (PDF del certificado; solo service_role escribe)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('fotos', 'fotos', false, 10485760,
   array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']),
  ('documentos', 'documentos', false, 10485760,
   array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'application/pdf'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- ---------------------------------------------------------------------------
-- Políticas de storage.objects
-- El primer segmento de la ruta debe ser el id de una mascota del usuario.
-- (Subir con upsert necesita SELECT, INSERT y UPDATE.)
-- ---------------------------------------------------------------------------
create policy petid_objetos_leer on storage.objects for select to authenticated
  using (
    bucket_id in ('fotos', 'documentos')
    and privado.es_mi_mascota_txt((storage.foldername(name))[1])
  );

create policy petid_objetos_subir on storage.objects for insert to authenticated
  with check (
    bucket_id in ('fotos', 'documentos')
    and privado.es_mi_mascota_txt((storage.foldername(name))[1])
    and not (bucket_id = 'documentos' and coalesce((storage.foldername(name))[2], '') = 'certificados')
  );

create policy petid_objetos_reemplazar on storage.objects for update to authenticated
  using (
    bucket_id in ('fotos', 'documentos')
    and privado.es_mi_mascota_txt((storage.foldername(name))[1])
    and not (bucket_id = 'documentos' and coalesce((storage.foldername(name))[2], '') = 'certificados')
  )
  with check (
    bucket_id in ('fotos', 'documentos')
    and privado.es_mi_mascota_txt((storage.foldername(name))[1])
    and not (bucket_id = 'documentos' and coalesce((storage.foldername(name))[2], '') = 'certificados')
  );

create policy petid_objetos_borrar on storage.objects for delete to authenticated
  using (
    bucket_id in ('fotos', 'documentos')
    and privado.es_mi_mascota_txt((storage.foldername(name))[1])
    and not (bucket_id = 'documentos' and coalesce((storage.foldername(name))[2], '') = 'certificados')
  );

create policy petid_objetos_leer_admin on storage.objects for select to authenticated
  using (bucket_id in ('fotos', 'documentos') and (select privado.es_admin()));

-- ---------------------------------------------------------------------------
-- Cola pgmq 'fotos_por_procesar'
-- En Supabase: Integrations > Queues (o la extensión pgmq). Si el esquema pgmq ya existe
-- (extensión instalada, o el stub de pruebas), no se vuelve a crear.
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_extension where extname = 'pgmq')
     and not exists (select 1 from pg_namespace where nspname = 'pgmq') then
    create extension pgmq;
  end if;
  if not exists (select 1 from pgmq.list_queues() q where q.queue_name = 'fotos_por_procesar') then
    perform pgmq.create('fotos_por_procesar');
  end if;
end $$;

-- El trabajador (servicio de reconocimiento) lee la cola con la clave de servicio.
grant usage on schema pgmq to service_role;
grant select, insert, update, delete on all tables in schema pgmq to service_role;
grant execute on all functions in schema pgmq to service_role;

-- Encola un trabajo por cada foto de mascota que entra como 'pendiente'.
-- Mensaje: {"foto_id", "mascota_id", "tipo", "ruta_storage"}. La URL firmada no se genera en SQL
-- (caduca y requiere la API de Storage): el trabajador la crea con la ruta al leer el mensaje.
-- Las fotos de hallazgo no se encolan: /api/v1/hallazgos llama a /embed de forma síncrona.
create or replace function privado.encolar_foto() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.mascota_id is not null and new.estado = 'pendiente' then
    perform pgmq.send(
      'fotos_por_procesar',
      jsonb_build_object(
        'foto_id', new.id,
        'mascota_id', new.mascota_id,
        'tipo', new.tipo,
        'ruta_storage', new.ruta_storage
      )
    );
  end if;
  return new;
end $$;
revoke all on function privado.encolar_foto() from public, anon, authenticated;

create trigger encolar_foto after insert on public.fotos
  for each row execute function privado.encolar_foto();
