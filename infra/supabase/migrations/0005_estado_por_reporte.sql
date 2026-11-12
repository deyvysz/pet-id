-- Decisión 007: el estado de la mascota sigue al reporte de pérdida.
-- Al crear un reporte activo, la mascota pasa a 'extraviada'.
-- Al cerrarlo (activo=false), pasa a 'encontrada' si seguía extraviada.
create or replace function sincronizar_estado_por_reporte() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' and new.activo then
    update mascotas set estado = 'extraviada' where id = new.mascota_id and estado <> 'fallecida';
  elsif tg_op = 'UPDATE' and old.activo and not new.activo then
    update mascotas set estado = 'encontrada' where id = new.mascota_id and estado = 'extraviada';
  end if;
  return new;
end $$;

create trigger reportes_perdida_estado
  after insert or update of activo on reportes_perdida
  for each row execute function sincronizar_estado_por_reporte();
