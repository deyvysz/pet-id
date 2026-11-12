-- Decisión 008: corrige buscar_similares (0001).
-- 1) Una mascota con dos reportes activos ya no sale repetida (se toma el reporte activo más reciente).
-- 2) Con filtro de distrito, solo pasan mascotas cuyo reporte activo es de ese distrito
--    (si p_solo_extraviadas=false, las mascotas sin reporte siguen pasando).
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
    group by vf.mascota_id),
  rp as (
    select distinct on (mascota_id) mascota_id, distrito
    from reportes_perdida where activo order by mascota_id, fecha_perdida desc)
  select m.id,
         (case when v_rostro is null or r.s is null then c.s else 0.6*r.s + 0.4*coalesce(c.s,0) end)::real,
         coalesce(r.f, c.f)
  from mascotas m
  left join r on r.mascota_id=m.id
  left join c on c.mascota_id=m.id
  left join rp on rp.mascota_id=m.id
  where m.especie=p_especie and m.lista_para_busqueda and m.estado<>'fallecida'
    and (not p_solo_extraviadas or m.estado='extraviada')
    and (p_distrito is null or rp.distrito = p_distrito or (rp.mascota_id is null and not p_solo_extraviadas))
    and (r.s is not null or c.s is not null)
  order by 2 desc
  limit p_limite
$$;
