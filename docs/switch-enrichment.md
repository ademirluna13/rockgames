# Enriquecimiento inicial de Nintendo Switch

El manifiesto `scripts/switch-metadata.mjs` contiene 50 propuestas originales en español. Cada entrada incluye descripción corta, descripción completa, géneros y etiquetas. El texto completo tiene dos frases; la primera resume el juego y la segunda añade contexto. No hay imágenes ni enlaces externos en los datos que se escriben al catálogo.

## Uso

1. `npm run enrich:switch -- --dry-run` autentica con la misma cuenta CMS del importador, lee los juegos actuales y muestra la propuesta y sus diferencias. No escribe.
2. Revisar los títulos y el contenido comercial de los paquetes. Los 11 géneros y 10 tags aprobados se gestionan con `npm run bootstrap:taxonomies -- --dry-run` y `npm run bootstrap:taxonomies`. El bootstrap detecta nombres equivalentes por acentos y mayúsculas, bloquea conflictos y exige escribir `CREAR TAXONOMÍAS` en terminal interactiva. El enriquecedor nunca crea términos.
3. `npm run enrich:switch` **termina con error antes de pedir confirmación** si falta cualquier género o etiqueta propuesta. Cuando todos existen, requiere terminal interactiva y escribir exactamente `ENRIQUECER`. Solo procesa borradores sin descripciones ni relaciones existentes. Nunca sobreescribe contenido previo ni publica juegos.

El modo de aplicación exige que existan todos los géneros y etiquetas propuestos. Los términos faltantes se muestran en el reporte y bloquean cualquier escritura. La actualización de descripciones distingue `NULL` de cadena vacía al comprobar el valor que observó antes de escribir; si otra persona lo cambió, se omite. La aplicación no toca precios, disponibilidad, variantes, medios ni colecciones. No existe `--overwrite`; una versión futura deberá definir explícitamente cómo revisar y reemplazar contenido editado.

## Revisión comercial pendiente

Se preparan propuestas, pero el script **omite** la aplicación de los siguientes cinco títulos hasta verificar la composición exacta de la oferta:

- Paquete Carreras (Need for Speed + Burnout)
- Paquete Crash Bandicoot (Trilogy + CTR + Crash 4)
- Paquete Dragon Ball (FighterZ + Kakarot + Xenoverse 2)
- Paquete Resident Evil (RE4 + RE5 + RE6)
- The Legend of Zelda: Breath of the Wild + Pase de Expansión

El texto de esos cinco es una propuesta interna y no debe copiarse a una ficha pública sin esa verificación. El borrador `Tomodachi Life` se verificó como el registro importado y se renombró a *Tomodachi Life: Living the Dream*; su propuesta ya no incluye una advertencia editorial.

## Fuentes consultadas

Se consultaron fichas y noticias del distribuidor para confirmar mecánicas y disponibilidad de títulos representativos. El manifiesto está redactado de nuevo, sin copiar descripciones largas. Esta revisión no certifica el contenido comercial de los paquetes personalizados de ROCK GAMES.

- [Animal Crossing: New Horizons — Nintendo](https://www.nintendo.com/us/store/products/animal-crossing-new-horizons-switch/)
- [Mario Kart 8 Deluxe — Nintendo](https://www.nintendo.com/us/store/products/mario-kart-8-deluxe-105275/)
- [Super Mario Bros. Wonder — Nintendo](https://www.nintendo.com/us/store/products/super-mario-bros-wonder-switch/)
- [Metroid Dread — Nintendo](https://www.nintendo.com/us/store/products/70010000042924/)
- [The Legend of Zelda: Tears of the Kingdom — Nintendo](https://www.nintendo.com/us/store/products/the-legend-of-zelda-tears-of-the-kingdom-switch/)
- [The Legend of Zelda: Echoes of Wisdom — Nintendo](https://www.nintendo.com/us/store/products/the-legend-of-zelda-echoes-of-wisdom-switch/)
- [Pokémon Legends: Z-A — Nintendo](https://www.nintendo.com/us/store/products/pokemon-legends-z-a-switch/)
- [Super Mario Galaxy — Nintendo](https://www.nintendo.com/us/store/products/super-mario-galaxy-switch/)
- [EA Sports FC 27 — Nintendo](https://www.nintendo.com/us/store/products/ea-sports-fc-27-switch/)
- [Little Nightmares I & II Bundle — Nintendo](https://www.nintendo.com/store/products/little-nightmares-i-and-ii-bundle-switch/)
- [Batman: Arkham Trilogy — Nintendo](https://www.nintendo.com/us/whatsnew/become-gotham-citys-ultimate-protector-in-the-batman-arkham-trilogy/)
- [Tomodachi Life: Living the Dream — Nintendo](https://www.nintendo.com/us/whatsnew/tomodachi-life-living-the-dream-is-here/)

## Estado tras la carga del 4 de octubre de 2026

El proyecto remoto tiene 11 géneros y 10 tags activos, con nombres exactos y sin duplicados detectados. Se enriquecieron 45 fichas, creando 66 relaciones de género y 78 de tags. Los cinco paquetes anteriores permanecen sin enriquecimiento. Un segundo dry run reportó 0 fichas aplicables, 45 omitidas por contenido existente y cinco retenidas para revisión comercial. Los 50 juegos siguen en borrador, con sus 50 variantes secundarias y precios originales. Siguen sin portadas reales; no publicar hasta completar medios y QA visual.

La migración `20261004230000_admin_taxonomy_insert.sql` habilita únicamente `INSERT` para CMS autenticado en `genres` y `tags`; fue necesaria porque las tablas de referencia eran de solo lectura para el rol autenticado. No concede edición ni eliminación de taxonomías.
