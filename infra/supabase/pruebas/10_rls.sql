-- Pruebas de acceso sobre el seed. Se ejecuta en una transacción que se deshace al final.
-- Uso: psql -v ON_ERROR_STOP=1 -f pruebas/10_rls.sql   (ver pruebas/probar.sh)
\set QUIET on
begin;

-- Un tercer usuario sin mascotas para probar aislamiento.
insert into auth.users (id, raw_user_meta_data) values
  ('0a000000-0000-4000-8000-000000000003',
   '{"nombres":"Beto","apellidos":"Ríos","tipo_documento":"dni","numero_documento":"11112222",
     "celular":"911111111","departamento":"Lima","provincia":"Lima","distrito":"Surco",
     "acepta_terminos":true,"acepta_privacidad":true}');
-- Usuario sin metadatos completos: no se crea perfil, pero el alta no falla.
insert into auth.users (id, raw_user_meta_data) values ('0a000000-0000-4000-8000-000000000004', '{"nombres":"X"}');
-- Documento repetido: no se crea perfil, el alta no falla.
insert into auth.users (id, raw_user_meta_data) values
  ('0a000000-0000-4000-8000-000000000005',
   '{"nombres":"Dup","apellidos":"Dup","tipo_documento":"DNI","numero_documento":"12345678",
     "celular":"9","departamento":"Lima","provincia":"Lima","distrito":"Lima",
     "acepta_terminos":true,"acepta_privacidad":true}');

do $$ begin
  assert (select tipo_documento from perfiles where id = '0a000000-0000-4000-8000-000000000003') = 'DNI',
    'trigger de perfil: debió crear a Beto con DNI en mayúsculas';
  assert not exists (select 1 from perfiles where id = '0a000000-0000-4000-8000-000000000004'),
    'trigger de perfil: no debió crear perfil sin metadatos';
  assert not exists (select 1 from perfiles where id = '0a000000-0000-4000-8000-000000000005'),
    'trigger de perfil: no debió crear perfil con documento repetido';
  assert (select count(*) from historial where accion = 'registro') = 2, 'historial de registro del seed';
  assert (select count(*) from historial where accion = 'nuevo_registro_salud') = 4, 'historial de salud del seed';
  assert (select count(*) from certificados) = 2, 'un certificado por mascota';
  assert (select codigo from certificados where mascota_id = '0c000000-0000-4000-8000-000000000126') ~ '^PID-[2-9A-HJ-NP-Z]{4}-[2-9A-HJ-NP-Z]{4}$',
    'formato del código';
  assert (select count(*) from pgmq.list_queues() where queue_name = 'fotos_por_procesar') = 1, 'cola creada';
  assert (select count(*) from storage.buckets where id in ('fotos','documentos') and not public) = 2, 'buckets privados';
end $$;

-- ---------------------------------------------------------------- anon
set local role anon;
set local request.jwt.claims to '{"role":"anon"}';
do $$
declare n int;
begin
  assert (select count(*) from mascotas_publico) = 2, 'anon lee la vista pública';
  assert (select foto_principal from mascotas_publico where pet_id = 'PE-00000125') like '0c000000-%/0d000000-%.jpg',
    'la vista trae la ruta de la foto principal';
  assert (select count(*) from verificar_certificado(' pid-7q4k-92xm ')) = 1, 'verificación por código';
  assert (select nombre from verificar_certificado('PID-7Q4K-92XM')) = 'Max', 'verificación devuelve el nombre';
  assert (select count(*) from verificar_certificado('PID-0000-0000')) = 0, 'código inexistente: 0 filas';
  begin perform 1 from mascotas; raise exception 'anon no debe leer mascotas';
  exception when insufficient_privilege then null; end;
  begin perform 1 from perfiles; raise exception 'anon no debe leer perfiles';
  exception when insufficient_privilege then null; end;
  begin insert into hallazgos (especie) values ('perro'); raise exception 'anon no debe insertar hallazgos';
  exception when insufficient_privilege then null; end;
  begin insert into mensajes_contacto (mascota_id, nombre, mensaje)
        values ('0c000000-0000-4000-8000-000000000125', 'x', 'y'); raise exception 'anon no debe insertar mensajes';
  exception when insufficient_privilege then null; end;
  begin perform 1 from vectores_foto; raise exception 'anon no debe leer vectores';
  exception when insufficient_privilege then null; end;
  begin perform * from buscar_similares(null, array_fill(0.1, array[768])::vector, 'perro'); raise exception 'anon no debe buscar';
  exception when insufficient_privilege then null; end;
  begin perform nuevo_pet_id(); raise exception 'anon no debe consumir pet_id';
  exception when insufficient_privilege then null; end;
  assert not has_table_privilege('anon', 'mascotas_publico', 'insert,update,delete'), 'anon solo lee la vista';
  select count(*) into n from storage.objects;
  assert n = 0, 'anon no ve objetos';
end $$;
reset role;

-- ---------------------------------------------------------------- propietaria (Ana)
set local role authenticated;
set local request.jwt.claims to '{"role":"authenticated","sub":"0a000000-0000-4000-8000-000000000001"}';
do $$
declare v_id uuid; v_pet text;
begin
  assert (select count(*) from perfiles) = 1, 'Ana solo ve su perfil';
  assert (select count(*) from mascotas) = 2, 'Ana ve sus 2 mascotas';
  assert (select count(*) from fotos) = 5, 'Ana ve sus fotos';
  assert (select count(*) from registros_salud) = 4, 'Ana ve su registro de salud';
  assert (select count(*) from certificados) = 2, 'Ana ve sus certificados';
  assert (select count(*) from historial) = 6, 'Ana ve su historial';
  assert (select count(*) from hallazgos) = 0, 'Ana no ve hallazgos';

  -- Alta de mascota: pet_id por defecto, certificado e historial por trigger.
  insert into mascotas (propietario_id, nombre, especie, raza, sexo, fecha_nacimiento, color)
  values ('0a000000-0000-4000-8000-000000000001', 'Toby', 'perro', 'Mestizo', 'macho', '2024-01-01', 'Negro')
  returning id, pet_id into v_id, v_pet;
  assert v_pet = 'PE-00000127', 'pet_id siguiente: ' || v_pet;
  assert exists (select 1 from certificados where mascota_id = v_id), 'certificado creado';
  assert exists (select 1 from historial where mascota_id = v_id and accion = 'registro'
                 and actor_id = '0a000000-0000-4000-8000-000000000001'), 'historial de registro con actor';

  -- Foto: se encola.
  insert into fotos (mascota_id, tipo, ruta_storage) values (v_id, 'frente', v_id || '/f1.jpg');

  -- Cambio de estado: historial.
  update mascotas set estado = 'extraviada' where id = v_id;
  assert exists (select 1 from historial where mascota_id = v_id and accion = 'cambio_estado'
                 and detalle = '{"de":"activa","a":"extraviada"}'), 'historial de cambio de estado';

  -- Columnas protegidas.
  begin update mascotas set lista_para_busqueda = true where id = v_id; raise exception 'no debe marcar lista_para_busqueda';
  exception when insufficient_privilege then null; end;
  begin update mascotas set propietario_id = '0a000000-0000-4000-8000-000000000003' where id = v_id; raise exception 'no debe ceder la mascota';
  exception when insufficient_privilege then null; end;
  begin update perfiles set rol = 'admin'; raise exception 'no debe hacerse admin';
  exception when insufficient_privilege then null; end;
  begin insert into mascotas (propietario_id, nombre, especie, raza, sexo, fecha_nacimiento, color, lista_para_busqueda)
        values ('0a000000-0000-4000-8000-000000000001', 'X', 'gato', 'M', 'hembra', '2024-01-01', 'X', true);
        raise exception 'no debe insertar lista_para_busqueda';
  exception when insufficient_privilege then null; end;
  begin update fotos set estado = 'lista' where mascota_id = v_id; raise exception 'no debe aprobar sus fotos';
  exception when insufficient_privilege then null; end;
  begin insert into certificados (mascota_id) values (v_id); raise exception 'no debe crear certificados';
  exception when insufficient_privilege then null; end;
  -- foto_principal de otra mascota: rechazado por la política.
  begin update mascotas set foto_principal_id = '0d000000-0000-4000-8000-000000000011' where id = v_id;
        raise exception 'no debe usar una foto de otra mascota';
  exception when insufficient_privilege then null; end;
  -- Foto con ruta fuera de su carpeta.
  begin insert into fotos (mascota_id, tipo, ruta_storage) values (v_id, 'cuerpo', 'otra/f.jpg');
        raise exception 'ruta fuera de la carpeta';
  exception when insufficient_privilege then null; end;

  -- Edición permitida.
  update mascotas set color = 'Negro con blanco', foto_principal_id = (select id from fotos where mascota_id = v_id)
  where id = v_id;
  update perfiles set celular = '987000000';
  insert into registros_salud (mascota_id, tipo, nombre, fecha) values (v_id, 'vacuna', 'Antirrábica', '2026-11-01');
  insert into reportes_perdida (mascota_id, fecha_perdida, distrito) values (v_id, now(), 'Miraflores');
  assert (select estado from mascotas where id = v_id) = 'extraviada', 'reporte activo pasa a extraviada (0005)';
  update reportes_perdida set activo = false, cerrado_at = now() where mascota_id = v_id;
  assert (select estado from mascotas where id = v_id) = 'encontrada', 'reporte cerrado pasa a encontrada (0005)';

  -- Storage.
  insert into storage.objects (bucket_id, name) values ('fotos', v_id || '/f1.jpg');
  insert into storage.objects (bucket_id, name) values ('documentos', v_id || '/carne.jpg');
  begin insert into storage.objects (bucket_id, name) values ('documentos', v_id || '/certificados/c.pdf');
        raise exception 'no debe escribir certificados';
  exception when insufficient_privilege then null; end;
  begin insert into storage.objects (bucket_id, name) values ('fotos', 'hallazgos/x/f.jpg');
        raise exception 'no debe escribir en hallazgos';
  exception when insufficient_privilege then null; end;
  assert (select count(*) from storage.objects) = 2, 'Ana ve sus objetos';
end $$;
reset role;

do $$ begin
  -- pgmq.mensajes es la tabla del stub (con la extensión real la cola es pgmq.q_fotos_por_procesar).
  assert (select count(*) from pgmq.mensajes where message->>'tipo' = 'frente' and message ? 'ruta_storage') = 1,
    'un mensaje encolado (las fotos del seed no se encolan)';
end $$;

-- ---------------------------------------------------------------- otro propietario (Beto)
set local role authenticated;
set local request.jwt.claims to '{"role":"authenticated","sub":"0a000000-0000-4000-8000-000000000003"}';
do $$
declare n int;
begin
  assert (select count(*) from perfiles) = 1, 'Beto solo ve su perfil';
  assert (select count(*) from mascotas) = 0, 'Beto no ve mascotas ajenas';
  assert (select count(*) from fotos) + (select count(*) from registros_salud) + (select count(*) from certificados)
       + (select count(*) from historial) + (select count(*) from reportes_perdida) + (select count(*) from mensajes_contacto) = 0,
    'Beto no ve nada ajeno';
  assert (select count(*) from storage.objects) = 0, 'Beto no ve objetos ajenos';
  update mascotas set nombre = 'Robado' where id = '0c000000-0000-4000-8000-000000000125';
  get diagnostics n = row_count; assert n = 0, 'Beto no edita mascotas ajenas';
  delete from registros_salud where mascota_id = '0c000000-0000-4000-8000-000000000125';
  get diagnostics n = row_count; assert n = 0, 'Beto no borra registros ajenos';
  begin insert into mascotas (propietario_id, nombre, especie, raza, sexo, fecha_nacimiento, color)
        values ('0a000000-0000-4000-8000-000000000001', 'X', 'gato', 'M', 'hembra', '2024-01-01', 'X');
        raise exception 'no debe crear mascotas a nombre de otro';
  exception when insufficient_privilege then null; end;
  begin insert into registros_salud (mascota_id, tipo, nombre, fecha)
        values ('0c000000-0000-4000-8000-000000000125', 'vacuna', 'X', '2026-01-01');
        raise exception 'no debe agregar salud a mascota ajena';
  exception when insufficient_privilege then null; end;
  begin insert into storage.objects (bucket_id, name) values ('fotos', '0c000000-0000-4000-8000-000000000125/x.jpg');
        raise exception 'no debe subir a carpeta ajena';
  exception when insufficient_privilege then null; end;
  begin insert into perfiles (id, nombres, apellidos, tipo_documento, numero_documento, celular, departamento,
                              provincia, distrito, acepta_terminos_at, acepta_privacidad_at)
        values ('0a000000-0000-4000-8000-000000000004', 'X', 'X', 'DNI', '1', '1', 'L', 'L', 'L', now(), now());
        raise exception 'no debe crear perfiles de otro';
  exception when insufficient_privilege then null; end;
end $$;
reset role;

-- El usuario sin perfil lo crea desde la web.
set local role authenticated;
set local request.jwt.claims to '{"role":"authenticated","sub":"0a000000-0000-4000-8000-000000000004"}';
insert into perfiles (id, nombres, apellidos, tipo_documento, numero_documento, celular, departamento,
                      provincia, distrito, acepta_terminos_at, acepta_privacidad_at)
values ('0a000000-0000-4000-8000-000000000004', 'X', 'Y', 'CE', '000111', '922222222', 'Lima', 'Lima', 'Lince', now(), now());
do $$ begin
  begin insert into perfiles (id, nombres, apellidos, tipo_documento, numero_documento, celular, departamento,
                              provincia, distrito, acepta_terminos_at, acepta_privacidad_at, rol)
        values ('0a000000-0000-4000-8000-000000000004', 'X', 'Y', 'CE', '9', '9', 'L', 'L', 'L', now(), now(), 'admin');
        raise exception 'no debe insertar rol';
  exception when insufficient_privilege then null; end;
end $$;
reset role;

-- ---------------------------------------------------------------- admin
set local role authenticated;
set local request.jwt.claims to '{"role":"authenticated","sub":"0a000000-0000-4000-8000-000000000002"}';
do $$
declare n int;
begin
  assert (select count(*) from perfiles) >= 4, 'admin lee perfiles';
  assert (select count(*) from mascotas) = 3, 'admin lee mascotas';
  assert (select count(*) from historial) > 0, 'admin lee historial';
  perform 1 from hallazgos; perform 1 from mensajes_contacto;
  update mascotas set estado = 'activa' where pet_id = 'PE-00000127';
  get diagnostics n = row_count; assert n = 1, 'admin cambia estado';
  assert exists (select 1 from historial where accion = 'cambio_estado' and actor_id = '0a000000-0000-4000-8000-000000000002'),
    'historial con el admin como actor';
  update fotos set estado = 'rechazada', motivo_rechazo = 'borrosa' where ruta_storage like '%/f1.jpg';
  get diagnostics n = row_count; assert n = 1, 'admin modera fotos';
  begin update mascotas set nombre = 'Otro' where pet_id = 'PE-00000125'; raise exception 'admin no debe editar el nombre';
  exception when insufficient_privilege then null; end;
  begin perform 1 from vectores_foto; raise exception 'admin no debe leer vectores';
  exception when insufficient_privilege then null; end;
  begin delete from mascotas where pet_id = 'PE-00000125';
    get diagnostics n = row_count; assert n = 0, 'admin no borra mascotas';
  end;
  assert (select count(*) from storage.objects) = 2, 'admin lee objetos';
end $$;
reset role;

-- ---------------------------------------------------------------- service_role y vectores
set local role service_role;
set local request.jwt.claims to '{"role":"service_role"}';
do $$
declare v_h uuid; v_f uuid;
begin
  insert into hallazgos (especie, distrito) values ('perro', 'Miraflores') returning id into v_h;
  insert into mensajes_contacto (mascota_id, hallazgo_id, nombre, mensaje)
  values ('0c000000-0000-4000-8000-000000000125', v_h, 'Vecino', 'Lo vi en el parque');
  insert into fotos (hallazgo_id, tipo, ruta_storage) values (v_h, 'hallazgo', 'hallazgos/' || v_h || '/1.jpg');

  -- Max: rostro y cuerpo -> lista_para_busqueda.
  insert into vectores_foto (foto_id, mascota_id, tipo, especie, vector) values
    ('0d000000-0000-4000-8000-000000000001', '0c000000-0000-4000-8000-000000000125', 'rostro', 'perro', array_fill(0.1, array[768])::vector);
  assert not (select lista_para_busqueda from mascotas where pet_id = 'PE-00000125'), 'solo rostro: no lista';
  insert into vectores_foto (foto_id, mascota_id, tipo, especie, vector) values
    ('0d000000-0000-4000-8000-000000000004', '0c000000-0000-4000-8000-000000000125', 'cuerpo', 'perro', array_fill(0.2, array[768])::vector);
  assert (select lista_para_busqueda from mascotas where pet_id = 'PE-00000125'), 'rostro y cuerpo: lista';
  update mascotas set estado = 'extraviada' where pet_id = 'PE-00000125';
  assert (select count(*) from buscar_similares(array_fill(0.1, array[768])::vector, array_fill(0.2, array[768])::vector, 'perro')) = 1,
    'buscar_similares encuentra a Max';
  delete from vectores_foto where foto_id = '0d000000-0000-4000-8000-000000000004';
  assert not (select lista_para_busqueda from mascotas where pet_id = 'PE-00000125'), 'sin cuerpo: deja de estar lista';
  -- La foto de hallazgo no se encola.
  assert not exists (select 1 from pgmq.mensajes where message->>'tipo' = 'hallazgo'), 'hallazgo no encolado';
end $$;
reset role;

-- Ana ve el mensaje de contacto de su mascota.
set local role authenticated;
set local request.jwt.claims to '{"role":"authenticated","sub":"0a000000-0000-4000-8000-000000000001"}';
do $$ begin
  assert (select count(*) from mensajes_contacto) = 1, 'Ana lee el mensaje sobre Max';
  assert (select count(*) from hallazgos) = 0, 'Ana no lee hallazgos';
end $$;
reset role;

-- Borrar una mascota borra en cascada certificado, fotos e historial.
set local role authenticated;
set local request.jwt.claims to '{"role":"authenticated","sub":"0a000000-0000-4000-8000-000000000001"}';
delete from mascotas where pet_id = 'PE-00000127';
reset role;
do $$ begin
  assert not exists (select 1 from mascotas where pet_id = 'PE-00000127'), 'mascota borrada';
end $$;

\echo 'Todas las pruebas de acceso pasaron.'
rollback;
