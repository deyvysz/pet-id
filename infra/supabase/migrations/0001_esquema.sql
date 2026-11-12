-- PET ID: esquema inicial. Congelado el 12 de noviembre de 2026.
-- Cambios solo con una decisión anotada en docs/decisiones/ y una migración nueva (0002_..., no editar esta).

create extension if not exists vector;
create extension if not exists pgcrypto;

-- Tipos
create type especie as enum ('perro','gato');
create type sexo as enum ('macho','hembra');
create type estado_mascota as enum ('activa','extraviada','encontrada','fallecida');
create type tipo_foto as enum ('frente','perfil_izq','perfil_der','cuerpo','marcas','hallazgo');
create type estado_proceso as enum ('pendiente','procesando','lista','rechazada');
create type tipo_vector as enum ('rostro','cuerpo');
create type rol_usuario as enum ('propietario','admin');
create type tipo_registro_salud as enum ('vacuna','desparasitacion','control','alergia','medicamento','documento');

-- Perfil del propietario (1 a 1 con auth.users)
create table perfiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nombres text not null,
  apellidos text not null,
  tipo_documento text not null check (tipo_documento in ('DNI','CE','PAS')),
  numero_documento text not null,
  celular text not null,
  celular_verificado boolean not null default false,
  departamento text not null,
  provincia text not null,
  distrito text not null,
  rol rol_usuario not null default 'propietario',
  acepta_terminos_at timestamptz not null,
  acepta_privacidad_at timestamptz not null,
  creado_at timestamptz not null default now(),
  unique (tipo_documento, numero_documento)
);

-- Número PET ID: PE-00000125
create sequence pet_id_seq start 1;
create or replace function nuevo_pet_id() returns text language sql as
$$ select 'PE-' || lpad(nextval('pet_id_seq')::text, 8, '0') $$;

-- Código de verificación del certificado: PID-XXXX-XXXX (sin 0/O/1/I)
create or replace function nuevo_codigo_verificacion() returns text language plpgsql as $$
declare a text := '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'; r text := 'PID-'; i int;
begin
  for i in 1..8 loop
    r := r || substr(a, 1 + floor(random()*32)::int, 1);
    if i = 4 then r := r || '-'; end if;
  end loop;
  return r;
end $$;

create table mascotas (
  id uuid primary key default gen_random_uuid(),
  pet_id text not null unique default nuevo_pet_id(),
  propietario_id uuid not null references perfiles(id),
  nombre text not null,
  especie especie not null,
  raza text not null,            -- 'Mestizo' si no tiene raza definida
  sexo sexo not null,
  fecha_nacimiento date not null,
  fecha_nacimiento_estimada boolean not null default false,
  color text not null,
  senas text,                    -- características físicas
  microchip text,
  esterilizado boolean,
  estado estado_mascota not null default 'activa',
  lista_para_busqueda boolean not null default false,  -- true con >=1 vector rostro y >=1 cuerpo
  foto_principal_id uuid,
  creado_at timestamptz not null default now(),
  actualizado_at timestamptz not null default now()
);
create index on mascotas (propietario_id);
create index on mascotas (especie, estado);

create table fotos (
  id uuid primary key default gen_random_uuid(),
  mascota_id uuid references mascotas(id) on delete cascade,   -- null si es foto de hallazgo
  hallazgo_id uuid,
  tipo tipo_foto not null,
  ruta_storage text not null,          -- bucket 'fotos': {mascota_id}/{foto_id}.jpg o hallazgos/{hallazgo_id}/{foto_id}.jpg
  estado estado_proceso not null default 'pendiente',
  motivo_rechazo text,                 -- sin_mascota | borrosa | oscura | varias_mascotas
  calidad real,
  creado_at timestamptz not null default now()
);
alter table mascotas add constraint mascotas_foto_principal_fk foreign key (foto_principal_id) references fotos(id) on delete set null;
create index on fotos (mascota_id);

create table vectores_foto (
  id uuid primary key default gen_random_uuid(),
  foto_id uuid not null references fotos(id) on delete cascade,
  mascota_id uuid references mascotas(id) on delete cascade,
  tipo tipo_vector not null,
  especie especie not null,
  vector vector(768) not null,
  creado_at timestamptz not null default now(),
  unique (foto_id, tipo)
);
create index vectores_hnsw on vectores_foto using hnsw (vector vector_cosine_ops);
create index on vectores_foto (mascota_id, tipo);

create table certificados (
  id uuid primary key default gen_random_uuid(),
  mascota_id uuid not null references mascotas(id) on delete cascade,
  codigo text not null unique default nuevo_codigo_verificacion(),
  emitido_at timestamptz not null default now(),
  ruta_pdf text                          -- bucket 'documentos'
);

create table registros_salud (
  id uuid primary key default gen_random_uuid(),
  mascota_id uuid not null references mascotas(id) on delete cascade,
  tipo tipo_registro_salud not null,
  nombre text not null,                  -- 'Antirrábica', 'Óctuple', etc.
  fecha date not null,
  proxima_fecha date,
  notas text,
  ruta_adjunto text,                     -- foto del carné, bucket 'documentos'
  declarado_por_propietario boolean not null default true,
  creado_at timestamptz not null default now()
);
create index on registros_salud (mascota_id, fecha desc);

create table reportes_perdida (
  id uuid primary key default gen_random_uuid(),
  mascota_id uuid not null references mascotas(id) on delete cascade,
  fecha_perdida timestamptz not null,
  distrito text not null,
  referencia text,                       -- última ubicación conocida en texto
  lat double precision,
  lng double precision,
  mensaje text,
  activo boolean not null default true,
  cerrado_at timestamptz,
  creado_at timestamptz not null default now()
);

create table hallazgos (
  id uuid primary key default gen_random_uuid(),
  especie especie,
  distrito text,
  color text,
  lat double precision,
  lng double precision,
  nombre_contacto text,
  celular_contacto text,
  correo_contacto text,
  creado_at timestamptz not null default now()
);
alter table fotos add constraint fotos_hallazgo_fk foreign key (hallazgo_id) references hallazgos(id) on delete cascade;

create table mensajes_contacto (
  id uuid primary key default gen_random_uuid(),
  mascota_id uuid not null references mascotas(id) on delete cascade,
  hallazgo_id uuid references hallazgos(id),
  nombre text not null,
  celular text,
  correo text,
  mensaje text not null,
  enviado_at timestamptz,
  creado_at timestamptz not null default now()
);

create table historial (
  id bigserial primary key,
  mascota_id uuid references mascotas(id) on delete cascade,
  actor_id uuid references auth.users(id),
  accion text not null,                  -- 'registro', 'cambio_estado', 'nuevo_registro_salud', 'cambio_responsable'...
  detalle jsonb,
  creado_at timestamptz not null default now()
);

-- Búsqueda por similitud. puntaje = 0.6*rostro + 0.4*cuerpo; si no hay rostro, solo cuerpo.
create or replace function buscar_similares(
  v_rostro vector(768), v_cuerpo vector(768), p_especie especie,
  p_distrito text default null, p_solo_extraviadas boolean default true, p_limite int default 5)
returns table (mascota_id uuid, puntaje real, foto_id uuid)
language sql stable as $$
  with r as (
    select vf.mascota_id, max(1 - (vf.vector <=> v_rostro)) s, (array_agg(vf.foto_id order by vf.vector <=> v_rostro))[1] f
    from vectores_foto vf where v_rostro is not null and vf.tipo='rostro' and vf.especie=p_especie and vf.mascota_id is not null
    group by vf.mascota_id),
  c as (
    select vf.mascota_id, max(1 - (vf.vector <=> v_cuerpo)) s, (array_agg(vf.foto_id order by vf.vector <=> v_cuerpo))[1] f
    from vectores_foto vf where vf.tipo='cuerpo' and vf.especie=p_especie and vf.mascota_id is not null
    group by vf.mascota_id)
  select m.id,
         (case when v_rostro is null or r.s is null then c.s else 0.6*r.s + 0.4*coalesce(c.s,0) end)::real,
         coalesce(r.f, c.f)
  from mascotas m
  left join r on r.mascota_id=m.id
  left join c on c.mascota_id=m.id
  left join reportes_perdida rp on rp.mascota_id=m.id and rp.activo
  where m.especie=p_especie and m.lista_para_busqueda and m.estado<>'fallecida'
    and (not p_solo_extraviadas or m.estado='extraviada')
    and (p_distrito is null or rp.distrito is null or rp.distrito=p_distrito)
    and (r.s is not null or c.s is not null)
  order by 2 desc
  limit p_limite
$$;

-- Vista pública (lo que muestra el QR). Nunca datos del propietario.
create view mascotas_publico as
  select m.pet_id, m.nombre, m.especie, m.raza, m.sexo, m.color, m.estado,
         f.ruta_storage as foto_principal, rp.distrito as distrito_perdida, rp.fecha_perdida, rp.mensaje as mensaje_perdida
  from mascotas m
  left join fotos f on f.id=m.foto_principal_id
  left join reportes_perdida rp on rp.mascota_id=m.id and rp.activo;

-- Cola de procesamiento de fotos (pgmq). Mensaje: {"foto_id": "...", "url_firmada": "...", "tipo": "frente"}
-- select pgmq.create('fotos_por_procesar');  -- se ejecuta en 0002 por el agente de base de datos

-- RLS: se activa en todas las tablas; las políticas las escribe el agente de base de datos en 0002_politicas.sql
alter table perfiles enable row level security;
alter table mascotas enable row level security;
alter table fotos enable row level security;
alter table vectores_foto enable row level security;
alter table certificados enable row level security;
alter table registros_salud enable row level security;
alter table reportes_perdida enable row level security;
alter table hallazgos enable row level security;
alter table mensajes_contacto enable row level security;
alter table historial enable row level security;
