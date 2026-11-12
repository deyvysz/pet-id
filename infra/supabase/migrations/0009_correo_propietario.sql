-- Decisión 010: el propietario registra un correo; los avisos de quien encuentra la mascota llegan ahí.
alter table public.perfiles add column correo text
  check (correo is null or correo ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$');

-- El propietario puede escribir el correo al crear su perfil y cambiarlo después.
grant insert (correo) on public.perfiles to authenticated;

drop trigger limitar_actualizacion on public.perfiles;
create trigger limitar_actualizacion before update on public.perfiles for each row
  execute function privado.limitar_actualizacion(
    'nombres,apellidos,tipo_documento,numero_documento,celular,correo,departamento,provincia,distrito,acepta_terminos_at,acepta_privacidad_at',
    '');
