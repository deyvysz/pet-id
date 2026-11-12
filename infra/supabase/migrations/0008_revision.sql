-- Revisión independiente (12 de noviembre de 2026). Depende de 0001 a 0007.

-- 1. celular_verificado en el alta.
-- En el registro por SMS, verifyOtp marca auth.users.phone_confirmed_at antes de que la web inserte
-- el perfil, así que el trigger de 0007 no encuentra fila que actualizar y el perfil quedaba con
-- celular_verificado = false para siempre. Al insertar el perfil se copia el estado de auth.users.
create or replace function privado.celular_verificado_al_crear() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  new.celular_verificado := exists (
    select 1 from auth.users u where u.id = new.id and u.phone_confirmed_at is not null
  );
  return new;
end $$;
revoke all on function privado.celular_verificado_al_crear() from public, anon, authenticated;

create trigger celular_verificado_al_crear before insert on public.perfiles
  for each row execute function privado.celular_verificado_al_crear();

-- 2. Vista pública sin filas repetidas.
-- Con dos reportes activos de la misma mascota, la vista devolvía dos filas y la web
-- (maybeSingle por pet_id) respondía 500 en /m/{pet_id}. Se toma el reporte activo más reciente,
-- como buscar_similares en 0006. Mismas columnas que 0001.
create or replace view public.mascotas_publico as
  select m.pet_id, m.nombre, m.especie, m.raza, m.sexo, m.color, m.estado,
         f.ruta_storage as foto_principal, rp.distrito as distrito_perdida, rp.fecha_perdida, rp.mensaje as mensaje_perdida
  from public.mascotas m
  left join public.fotos f on f.id = m.foto_principal_id
  left join lateral (
    select r.distrito, r.fecha_perdida, r.mensaje
    from public.reportes_perdida r
    where r.mascota_id = m.id and r.activo
    order by r.fecha_perdida desc, r.creado_at desc
    limit 1
  ) rp on true;

alter view public.mascotas_publico set (security_invoker = false);
revoke all on public.mascotas_publico from public, anon, authenticated;
grant select on public.mascotas_publico to anon, authenticated, service_role;
