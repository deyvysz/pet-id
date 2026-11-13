"""Genera src/web/lib/ubigeo.json y la migración 0010 a partir del ubigeo INEI (jmcastagnetto/ubigeo-peru-aumentado, MIT)."""
import csv, json, sys, unicodedata
src, web_json, sql_out = sys.argv[1:4]

CABECERA = '-- Decisión 012: ubicaciones válidas según el ubigeo del INEI (1,893 distritos).\n-- Fuente de datos: jmcastagnetto/ubigeo-peru-aumentado (licencia MIT), códigos INEI. Generado por scripts/generar-ubigeo.py.\n-- Los nombres llevan mayúscula inicial; las tildes se restauraron solo en una lista de palabras conocidas.\n\ncreate table public.ubigeo (\n  codigo char(6) primary key,\n  departamento text not null,\n  provincia text not null,\n  distrito text not null,\n  unique (departamento, provincia, distrito)\n);\ncreate index on public.ubigeo (distrito);\nalter table public.ubigeo enable row level security;\ncreate policy ubigeo_leer on public.ubigeo for select to anon, authenticated using (true);\ngrant select on public.ubigeo to anon, authenticated;\n\n'
PIE = "-- Perfil: departamento, provincia y distrito deben formar una combinación del ubigeo.\ncreate or replace function privado.validar_ubicacion_perfil() returns trigger\nlanguage plpgsql security definer set search_path = '' as $$\nbegin\n  if not exists (select 1 from public.ubigeo u\n                 where u.departamento = new.departamento and u.provincia = new.provincia and u.distrito = new.distrito) then\n    raise exception 'Ubicación no válida: elige departamento, provincia y distrito de la lista'\n      using errcode = 'check_violation';\n  end if;\n  return new;\nend $$;\ncreate trigger validar_ubicacion before insert or update of departamento, provincia, distrito on public.perfiles\n  for each row execute function privado.validar_ubicacion_perfil();\n\n-- Reportes de pérdida y hallazgos: se guarda el código de ubigeo y el nombre del distrito se completa desde él.\n-- Si llega solo el nombre, debe existir en el ubigeo; el código se completa cuando el nombre es único en el país.\nalter table public.reportes_perdida add column ubigeo char(6) references public.ubigeo(codigo);\nalter table public.hallazgos add column ubigeo char(6) references public.ubigeo(codigo);\n\ncreate or replace function privado.validar_distrito() returns trigger\nlanguage plpgsql security definer set search_path = '' as $$\ndeclare v_dist text; v_cod char(6); n int;\nbegin\n  if new.ubigeo is not null then\n    select distrito into v_dist from public.ubigeo where codigo = new.ubigeo;\n    new.distrito := v_dist;\n  elsif new.distrito is not null then\n    select count(*), min(codigo) into n, v_cod from public.ubigeo where distrito = new.distrito;\n    if n = 0 then\n      raise exception 'Distrito no válido: elige uno de la lista' using errcode = 'check_violation';\n    elsif n = 1 then\n      new.ubigeo := v_cod;\n    end if;\n  end if;\n  return new;\nend $$;\ncreate trigger validar_distrito before insert or update of ubigeo, distrito on public.reportes_perdida\n  for each row execute function privado.validar_distrito();\ncreate trigger validar_distrito before insert or update of ubigeo, distrito on public.hallazgos\n  for each row execute function privado.validar_distrito();\n\n-- El propietario puede enviar el código al crear o editar su reporte.\ngrant insert (ubigeo) on public.reportes_perdida to authenticated;\ndrop trigger limitar_actualizacion on public.reportes_perdida;\ncreate trigger limitar_actualizacion before update on public.reportes_perdida for each row\n  execute function privado.limitar_actualizacion(\n    'fecha_perdida,ubigeo,distrito,referencia,lat,lng,mensaje,activo,cerrado_at', 'activo,cerrado_at');\n"

def sin_tilde(s): return ''.join(c for c in unicodedata.normalize('NFD', s) if unicodedata.category(c) != 'Mn').upper()

DEP = ["Amazonas","Áncash","Apurímac","Arequipa","Ayacucho","Cajamarca","Callao","Cusco","Huancavelica","Huánuco","Ica",
       "Junín","La Libertad","Lambayeque","Lima","Loreto","Madre de Dios","Moquegua","Pasco","Piura","Puno","San Martín",
       "Tacna","Tumbes","Ucayali"]
# Nombres con tilde ya usados en la app (Lima y Callao) y palabras frecuentes con tilde.
CURADOS = ["Ancón","Breña","Jesús María","Lurín","Pachacámac","Rímac","San Martín de Porres","Mi Perú","Huarochirí","Oyón","Cañete",
           "Magdalena del Mar","San Juan de Lurigancho","Carmen de la Legua Reynoso","Villa María del Triunfo"]
PALABRAS = {"MARTIN":"Martín","MARIA":"María","JESUS":"Jesús","JOSE":"José","ANDRES":"Andrés","TOMAS":"Tomás","RAMON":"Ramón",
            "PERU":"Perú","HUANUCO":"Huánuco","JUNIN":"Junín","APURIMAC":"Apurímac","ANCASH":"Áncash","RIO":"Río","RIOS":"Ríos",
            "CONCEPCION":"Concepción","ASUNCION":"Asunción","ENCARNACION":"Encarnación","PURISIMA":"Purísima","BOLIVAR":"Bolívar",
            "ANGEL":"Ángel","ANGELES":"Ángeles","LUCIA":"Lucía","INES":"Inés","SEBASTIAN":"Sebastián","JOAQUIN":"Joaquín",
            "AGUSTIN":"Agustín","CRISTOBAL":"Cristóbal","NICOLAS":"Nicolás","MATIAS":"Matías","ROSARIO":"Rosario","CHIMBOTE":"Chimbote",
            "PACHACAMAC":"Pachacámac","LURIN":"Lurín","RIMAC":"Rímac","ANCON":"Ancón","CANETE":"Cañete","HUAROCHIRI":"Huarochirí",
            "OYON":"Oyón","BRENA":"Breña","CACERES":"Cáceres","GALVEZ":"Gálvez","HERNANDEZ":"Hernández","RODRIGUEZ":"Rodríguez","GONZALEZ":"González","FERNANDEZ":"Fernández","SANCHEZ":"Sánchez","MARQUEZ":"Márquez","VASQUEZ":"Vásquez","RAMIREZ":"Ramírez","LOPEZ":"López","PEREZ":"Pérez","DIAZ":"Díaz","GUTIERREZ":"Gutiérrez","CHAVEZ":"Chávez","CUTERVO":"Cutervo","TRUJILLO":"Trujillo","AREQUIPA":"Arequipa"}
MENORES = {"DE","DEL","LA","LAS","LOS","Y","EL","E"}
mapa_curados = {sin_tilde(x): x for x in CURADOS + DEP}

def titulo(s):
    s = s.strip()
    if sin_tilde(s) in mapa_curados: return mapa_curados[sin_tilde(s)]
    out = []
    for i, w in enumerate(s.split(' ')):
        partes = []
        for p in w.split('-'):
            u = p.upper()
            if i > 0 and u in MENORES: partes.append(u.lower())
            elif u in PALABRAS: partes.append(PALABRAS[u])
            else: partes.append(p[:1].upper() + p[1:].lower())
        out.append('-'.join(partes))
    return ' '.join(out)

dep_map = {sin_tilde(d): d for d in DEP}
filas = []
for r in csv.DictReader(open(src, encoding='utf-8')):
    filas.append((r['inei'], dep_map[sin_tilde(r['departamento'])], titulo(r['provincia']), titulo(r['distrito'])))
filas.sort(key=lambda x: (sin_tilde(x[1]), sin_tilde(x[2]), sin_tilde(x[3])))

arbol = {}
for c, d, p, di in filas: arbol.setdefault(d, {}).setdefault(p, []).append([c, di])
json.dump(arbol, open(web_json, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))

q = lambda s: "'" + s.replace("'", "''") + "'"
with open(sql_out, 'w', encoding='utf-8') as f:
    f.write(CABECERA)
    f.write("insert into public.ubigeo (codigo, departamento, provincia, distrito) values\n")
    f.write(",\n".join(f"({q(c)},{q(d)},{q(p)},{q(di)})" for c, d, p, di in filas))
    f.write(";\n\n")
    f.write(PIE)
print(len(filas), "distritos;", sum(len(v) for v in arbol.values()), "provincias")
