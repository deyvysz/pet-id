# 011. Actualización de seguridad de Next.js

Fecha: 12 de noviembre de 2026. Decidió: Deyvys (coordinación de Claude).

Next.js pasa de 15.5.4 a 15.5.28 y React de 19.1.0 a 19.1.10. La versión 15.5.4 tiene la vulnerabilidad crítica CVE-2025-66478 (ejecución remota de código en React Server Components); npm la reportó al instalar en el entorno local.

Se fijan también, con `overrides` en `package.json`, postcss 8.5.31 y sharp 0.35.5, dependencias internas de Next.js con vulnerabilidades altas. Tras el cambio, `npm audit --omit=dev` no reporta vulnerabilidades; tsc, lint y build pasan.

Las versiones van fijas, sin `^`, para que cada actualización sea una decisión.
