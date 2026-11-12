-- Decisión 009: perfiles.celular_verificado sigue a auth.users.phone_confirmed_at (OTP por SMS de Supabase Auth).
create or replace function public.marcar_celular_verificado() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.phone_confirmed_at is not null and (old.phone_confirmed_at is null) then
    update public.perfiles set celular_verificado = true where id = new.id;
  end if;
  return new;
end $$;

create trigger auth_users_celular_verificado
  after update of phone_confirmed_at on auth.users
  for each row execute function public.marcar_celular_verificado();
