# Estado del proyecto

Actualizado: 12 de noviembre de 2026.

## Fase actual

Diseño terminado. Construcción por iniciar.

## Hecho

- Evaluación del MVP y recorte de alcance.
- Requisitos del cliente comparados con nuestro análisis y reestructurados con IA desde la fase 1.
- Prototipo navegable de 24 pantallas, móvil y escritorio, con el estilo de la maqueta de inicio (teal y azul marino).
- Flujo funcional con arquitectura, registro, carriles y secuencia de búsqueda por foto.
- Estructura del proyecto en Drive (`Interno - PET ID`) y en este repositorio (privado, creado el 12 de noviembre de 2026).

## Siguiente

1. Crear el proyecto Supabase y aplicar el esquema inicial (`infra/supabase/`).
2. Día 1 de construcción: fijar contratos (`docs/diseno/contratos-api.md`) para que los cuatro frentes trabajen en paralelo.
3. Reunir un conjunto de evaluación de fotos (mínimo 50 mascotas con 3 fotos o más) para calibrar el umbral.

## Riesgos abiertos

- Precisión del reconocimiento sin datos propios: se mide con Recall@1/5/10 antes de prometer porcentajes.
- Mascotas sin rostro visible en la foto del hallazgo: se usa el vector de cuerpo y los filtros (especie, distrito, color).
