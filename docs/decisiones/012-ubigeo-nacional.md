# 012. Ubicaciones de todo el Perú con el ubigeo del INEI

Fecha: 12 de noviembre de 2026. Decidió: Deyvys.

El distrito ya no se escribe a mano. En crear cuenta, mi perfil, reportar extravío, encontré una mascota y contactar, la persona elige departamento, provincia y distrito en listas en cascada con los 1,893 distritos del INEI.

Por qué: en la prueba del 12 de noviembre el reporte aceptó "chimbote" en minúsculas. El texto libre permite errores de escritura y nombres inexistentes, y rompe el filtro por zona de la búsqueda por foto. La lista anterior solo cubría Lima y Callao.

Cómo:
- Datos: `infra/supabase/datos/ubigeo_distrito_inei.csv`, de jmcastagnetto/ubigeo-peru-aumentado (licencia MIT). `scripts/generar-ubigeo.py` produce `src/web/lib/ubigeo.json` y la migración 0010. Los nombres van con mayúscula inicial; las tildes se restauran solo en una lista de palabras conocidas, así que algunos distritos quedan sin tilde.
- Base de datos (0010): tabla `ubigeo`. El perfil debe tener una combinación válida de departamento, provincia y distrito. Reportes de pérdida y hallazgos guardan el código INEI en `ubigeo` y el nombre del distrito se completa desde él; si llega solo el nombre, debe existir.
- La API de hallazgos recibe `ubigeo` y descarta códigos que no existen.

Pendiente: la búsqueda por zona sigue comparando el nombre del distrito; hay nombres repetidos en distintas provincias (por ejemplo, Miraflores en Lima y en Arequipa). Pasarla al código INEI es el siguiente paso.
