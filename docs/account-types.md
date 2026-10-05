# Modalidad de cuenta en variantes

## Esquema y migración

La migración `supabase/migrations/20261004200000_variant_account_type.sql` añade el enum PostgreSQL `public.account_type` (`primary`, `secondary`) y una columna sin valor por defecto en `game_variants`. La identidad anterior era `unique (game_id, platform_id, version_key)`. La identidad nueva es `unique (game_id, platform_id, version_key, account_type)`. Permite una principal y una secundaria para la misma edición, pero evita duplicar cualquiera de ellas. No exige que ambas existan.

El backfill coteja las 50 entradas originales del importador por título, precio, Nintendo Switch, clave/etiqueta Estándar y estado borrador. Antes de hacer el `UPDATE` exige que la tabla tenga **cero variantes** (instalación nueva) o **exactamente esas 50**. Si detecta variantes ajenas, la migración falla y deja que se auditen sin asignarles una modalidad inventada. Después del backfill exige ausencia de `NULL` y establece `NOT NULL`. No cambia políticas RLS. No crea cuentas principales ni precios.

Lectura remota del 4 de octubre de 2026: 50 variantes totales, 50 coincidencias exactas con el manifiesto, cero variantes ajenas. El registro de Tomodachi se verificó como borrador importado, con una variante Switch Estándar de $299, y se renombró a *Tomodachi Life: Living the Dream* antes de preparar el backfill.

**Estado de aplicación:** aplicada al proyecto enlazado después de autorización directa del usuario. El dry run del CLI indicó que solo se aplicaría esta migración y `supabase db push --yes` terminó correctamente. La lectura remota posterior devolvió 50 variantes Nintendo Switch secundarias, cero principales, cero `NULL`, 50 claves comerciales distintas y cero juegos publicados. `npm run import:switch -- --dry-run` devolvió 50 juegos y 50 variantes existentes, cero nuevos y cero conflictos.

## Reglas de uso

- El CMS pide Principal o Secundaria al crear/editar una variante. Para agregar la otra modalidad ofrece una acción opcional que abre un formulario nuevo con la misma plataforma y edición; el precio queda vacío.
- Cada modalidad conserva precio, disponibilidad y estado propios. Si secundaria cuesta tanto o más que principal, el Admin advierte y permite guardar.
- La completitud y publicación necesitan al menos una variante activa y válida; nunca exigen las dos modalidades.
- El catálogo muestra el tipo de cuenta en la selección, y las opciones apuntan a UUID distintos. Mis juegos almacena el UUID exacto de cada variante de Supabase. El mensaje de WhatsApp incluye plataforma, edición, modalidad y precio elegidos.
- El importador de **este catálogo Switch** usa `secondary` y busca la combinación exacta de juego, plataforma, edición y modalidad. No presupone nada para otros importadores o variantes históricas.

## Alcance de la validación

El CLI confirmó la aplicación de la migración y la lectura remota confirmó el backfill. No se insertó una variante principal ficticia para probar en producción la coexistencia, ni se intentó duplicar una secundaria real. La unicidad nueva y `NOT NULL` constan en la migración aplicada. Un volcado independiente del esquema remoto con `supabase db dump` no pudo ejecutarse porque Docker Desktop no está disponible en este equipo. La validación visual de un juego con ambas modalidades queda pendiente de que el negocio proporcione un precio principal real; no se generarán precios por fórmula.
