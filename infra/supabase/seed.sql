-- PET ID: datos de demostración (coherentes con docs/diseno/prototipo.html).
-- Solo para entornos locales o de prueba. No aplicar en producción: crea cuentas con contraseña conocida.
--
-- Cuentas (contraseña de ambas: demo1234):
--   ana.perez@correo.com   propietaria demo, Miraflores
--   admin@petid.local      administrador demo
-- Mascotas de Ana:
--   Max   PE-00000125  perro, Golden retriever, certificado PID-7Q4K-92XM
--   Luna  PE-00000126  gata, mestiza
-- Las fotos se registran como 'lista' (no se encolan) y no existen en Storage; no hay vectores,
-- así que ninguna mascota queda lista_para_busqueda.

-- Usuarios en auth.users. Los campos *_token van como '' porque GoTrue falla con NULL.
insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
                        raw_app_meta_data, raw_user_meta_data, confirmation_token, recovery_token,
                        email_change_token_new, email_change, created_at, updated_at)
values
  ('00000000-0000-0000-0000-000000000000', '0a000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated',
   'ana.perez@correo.com', crypt('demo1234', gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}',
   '{"nombres":"Ana","apellidos":"Pérez","tipo_documento":"DNI","numero_documento":"12345678",
     "celular":"987654321","departamento":"Lima","provincia":"Lima","distrito":"Miraflores",
     "acepta_terminos":true,"acepta_privacidad":true}',
   '', '', '', '', '2026-11-04 10:00:00-05', now()),
  ('00000000-0000-0000-0000-000000000000', '0a000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated',
   'admin@petid.local', crypt('demo1234', gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}',
   '{"nombres":"Admin","apellidos":"PET ID","tipo_documento":"DNI","numero_documento":"87654321",
     "celular":"900000000","departamento":"Lima","provincia":"Lima","distrito":"San Isidro",
     "acepta_terminos":true,"acepta_privacidad":true}',
   '', '', '', '', now(), now())
on conflict (id) do nothing;

-- Celular en Auth para entrar desde la web con código SMS (en local, código fijo 123456; ver config.toml).
update auth.users set phone = '51987654321', phone_confirmed_at = coalesce(phone_confirmed_at, now())
  where id = '0a000000-0000-4000-8000-000000000001';
update auth.users set phone = '51900000000', phone_confirmed_at = coalesce(phone_confirmed_at, now())
  where id = '0a000000-0000-4000-8000-000000000002';

insert into auth.identities (id, provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
values
  ('0b000000-0000-4000-8000-000000000001', '0a000000-0000-4000-8000-000000000001',
   '0a000000-0000-4000-8000-000000000001',
   '{"sub":"0a000000-0000-4000-8000-000000000001","email":"ana.perez@correo.com","email_verified":true}',
   'email', now(), now(), now()),
  ('0b000000-0000-4000-8000-000000000002', '0a000000-0000-4000-8000-000000000002',
   '0a000000-0000-4000-8000-000000000002',
   '{"sub":"0a000000-0000-4000-8000-000000000002","email":"admin@petid.local","email_verified":true}',
   'email', now(), now(), now())
on conflict do nothing;

-- Perfiles. El trigger crear_perfil_desde_auth (0004) ya los crea; esto cubre el caso sin trigger.
insert into perfiles (id, nombres, apellidos, tipo_documento, numero_documento, celular, celular_verificado,
                      departamento, provincia, distrito, acepta_terminos_at, acepta_privacidad_at)
values
  ('0a000000-0000-4000-8000-000000000001', 'Ana', 'Pérez', 'DNI', '12345678', '987654321', true,
   'Lima', 'Lima', 'Miraflores', '2026-11-04 10:00:00-05', '2026-11-04 10:00:00-05'),
  ('0a000000-0000-4000-8000-000000000002', 'Admin', 'PET ID', 'DNI', '87654321', '900000000', true,
   'Lima', 'Lima', 'San Isidro', now(), now())
on conflict (id) do nothing;

update perfiles set celular_verificado = true
where id in ('0a000000-0000-4000-8000-000000000001', '0a000000-0000-4000-8000-000000000002');
update perfiles set rol = 'admin' where id = '0a000000-0000-4000-8000-000000000002';
update perfiles set correo = 'ana.perez@example.com' where id = '0a000000-0000-4000-8000-000000000001';

-- Mascotas (pet_id fijo para coincidir con el prototipo; el trigger crea historial y certificado).
insert into mascotas (id, pet_id, propietario_id, nombre, especie, raza, sexo, fecha_nacimiento,
                      fecha_nacimiento_estimada, color, senas, microchip, esterilizado, creado_at, actualizado_at)
values
  ('0c000000-0000-4000-8000-000000000125', 'PE-00000125', '0a000000-0000-4000-8000-000000000001',
   'Max', 'perro', 'Golden retriever', 'macho', '2022-03-15', false, 'Dorado',
   'Toma medicación para el corazón dos veces al día.', null, true,
   '2026-11-04 10:15:00-05', '2026-11-04 10:15:00-05'),
  ('0c000000-0000-4000-8000-000000000126', 'PE-00000126', '0a000000-0000-4000-8000-000000000001',
   'Luna', 'gato', 'Mestizo', 'hembra', '2023-08-01', true, 'Atigrado gris',
   'Mancha blanca en el pecho.', null, true,
   '2026-11-05 18:30:00-05', '2026-11-05 18:30:00-05')
on conflict (id) do nothing;

-- La secuencia sigue después de las mascotas demo.
do $$ begin perform setval('pet_id_seq', greatest((select last_value from pet_id_seq), 126)); end $$;

-- Certificado de Max con el código del prototipo.
update certificados set codigo = 'PID-7Q4K-92XM', emitido_at = '2026-11-04 10:15:00-05'
where mascota_id = '0c000000-0000-4000-8000-000000000125';

-- Fotos guiadas de Max y foto de frente de Luna (estado 'lista': no se encolan).
insert into fotos (id, mascota_id, tipo, ruta_storage, estado, calidad) values
  ('0d000000-0000-4000-8000-000000000001', '0c000000-0000-4000-8000-000000000125', 'frente',
   '0c000000-0000-4000-8000-000000000125/0d000000-0000-4000-8000-000000000001.jpg', 'lista', 0.92),
  ('0d000000-0000-4000-8000-000000000002', '0c000000-0000-4000-8000-000000000125', 'perfil_izq',
   '0c000000-0000-4000-8000-000000000125/0d000000-0000-4000-8000-000000000002.jpg', 'lista', 0.88),
  ('0d000000-0000-4000-8000-000000000003', '0c000000-0000-4000-8000-000000000125', 'perfil_der',
   '0c000000-0000-4000-8000-000000000125/0d000000-0000-4000-8000-000000000003.jpg', 'lista', 0.87),
  ('0d000000-0000-4000-8000-000000000004', '0c000000-0000-4000-8000-000000000125', 'cuerpo',
   '0c000000-0000-4000-8000-000000000125/0d000000-0000-4000-8000-000000000004.jpg', 'lista', 0.90),
  ('0d000000-0000-4000-8000-000000000011', '0c000000-0000-4000-8000-000000000126', 'frente',
   '0c000000-0000-4000-8000-000000000126/0d000000-0000-4000-8000-000000000011.jpg', 'lista', 0.85)
on conflict (id) do nothing;

update mascotas set foto_principal_id = '0d000000-0000-4000-8000-000000000001'
where id = '0c000000-0000-4000-8000-000000000125';
update mascotas set foto_principal_id = '0d000000-0000-4000-8000-000000000011'
where id = '0c000000-0000-4000-8000-000000000126';

-- Registro de salud (declarado por la propietaria).
insert into registros_salud (id, mascota_id, tipo, nombre, fecha, proxima_fecha, notas) values
  ('0e000000-0000-4000-8000-000000000001', '0c000000-0000-4000-8000-000000000125', 'vacuna',
   'Antirrábica', '2025-12-10', '2026-12-10', null),
  ('0e000000-0000-4000-8000-000000000002', '0c000000-0000-4000-8000-000000000125', 'vacuna',
   'Séxtuple u óctuple', '2026-03-15', '2027-03-15', null),
  ('0e000000-0000-4000-8000-000000000003', '0c000000-0000-4000-8000-000000000125', 'medicamento',
   'Medicación cardiaca', '2026-01-20', null, 'Dos veces al día.'),
  ('0e000000-0000-4000-8000-000000000011', '0c000000-0000-4000-8000-000000000126', 'vacuna',
   'Triple felina', '2026-02-02', '2027-02-02', null)
on conflict (id) do nothing;
