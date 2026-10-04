# ROCK GAMES

Sitio de catálogo digital construido con Astro, React, Tailwind CSS v4 y GSAP ScrollTrigger. La portada usa un video MP4 configurable, una imagen de respaldo y una transición suave ligada al scroll. La tipografía usa Google Sans para lectura y Google Sans Flex para titulares; ambas se sirven desde el proyecto.

## Desarrollo local

```powershell
npm install
npm run dev
```

Abre `http://127.0.0.1:4321`. En esta fase, `npm run build` sigue generando el sitio estático para no romper el despliegue actual mientras no se elija proveedor de hosting para SSR.

## Organización

- `src/pages/index.astro`: home editorial con hero, accesos por plataforma, portada, ranking y secciones comerciales.
- `src/pages/catalogo.astro`: catálogo completo en `/catalogo`, con búsqueda, filtros y todos los productos.
- `src/pages/como-funciona.astro`: guía visual de compra, explicación de producto digital y preguntas frecuentes en `/como-funciona`.
- `src/components/SiteLayout.astro`: navegación, footer, fuentes y Analytics compartidos por las tres rutas.
- `src/components/HeroScroll.astro`: video del hero, respaldo y secuencia de GSAP ScrollTrigger.
- `src/components/Catalog.tsx`: accesos visuales en la home y, en `/catalogo`, búsqueda, filtros animados por consola/género/estado y selección «Mis juegos» persistida en el navegador.
- `src/components/GameFinder.tsx`: recomendador de tres juegos por categoría, con guardado directo en «Mis juegos».
- `src/components/BrandIcon.tsx` y `BrandIcon.astro`: SVG de consolas y redes.
- `src/components/FeaturedShowcase.tsx`: carrusel editorial de «En portada», con autoplay, controles, vistas laterales y gesto horizontal. Se pausa fuera de pantalla, en pestaña oculta, al interactuar y cuando se prefiere menos movimiento.
- `src/components/EditorialSections.astro`: ranking con preview, ofertas, próximos lanzamientos, referencias reales, guía de compra, confianza, redes y cierre visual.
- `src/components/ProductPoster.tsx`: ficha editorial de producto con badge, descuento, descripción y CTA.
- `src/lib/platforms.ts`: nombres y acentos de cada plataforma.
- `src/data/site.json`: contenido de muestra y configuración del negocio.
- `src/lib/data/contracts.ts`: contratos del dominio, independientes de la presentación.
- `src/lib/data/view-models.ts`: datos listos para las interfaces; los componentes no leen el JSON crudo.
- `src/lib/data/repository.ts`: contrato de acceso a datos y compositores de páginas.
- `src/lib/data/json-repository.ts`: adaptador temporal que transforma `src/data/site.json` al dominio y a los modelos de vista.
- `src/lib/data/public-server.ts`: crea un cliente público de Supabase solo para código de servidor, con publishable key y sin sesión persistente.
- `src/lib/data/supabase-repository.ts`: adapta consultas PostgreSQL a contratos y modelos de vista; no hay consultas en componentes.
- `src/lib/data/index.ts`: selección explícita de `DATA_SOURCE` (`json` o `supabase`); no hay fallback silencioso.
- `src/styles/platform-motion.css`: sistema de acentos por plataforma y estados de interacción.
- `src/styles/editorial.css`: composición y adaptación móvil del showcase y las secciones editoriales.
- `src/styles/site-pages.css`: accesos visuales por plataforma, página de catálogo y ranking refinado.
- `src/styles/conversion.css`: recomendador, guía de compra, redes, referencias y mejoras de conversión responsivas.
- `src/styles/global.css`: Tailwind v4 y estilos propios de la identidad.
- `public/assets/`: logo, gorila, video y artes WebP optimizados para la web.
- `art-sources/`: PNG originales de los artes conceptuales.

## Preparación del catálogo real

Edita `src/data/site.json` para cambiar juegos, precios, disponibilidad, aviso y oferta. Cada juego tiene una ruta `cover` para su póster, una `description` breve, un `tag` y `featured` para mostrarlo en la selección de portada. `platform` distingue PlayStation, Xbox, Nintendo Switch y Nintendo Switch 2; sus acentos están en `src/lib/platforms.ts`. El campo `available` permite ocultar temporalmente un juego. El botón de WhatsApp usa `whatsappNumber` en formato internacional, sin `+`, espacios ni guiones. El catálogo actual es demostrativo; la página lo indica de forma visible.

La home y el catálogo agrupan Switch y Switch 2 bajo un único filtro Nintendo. Los enlaces de plataforma abren `/catalogo` con el filtro correspondiente. El buscador del catálogo acepta título, género, plataforma y etiqueta. Los estados «Ofertas», «Nuevos» y «Más vendidos» derivan de `oldPrice` y `tag`.

`recommendationMoods` define las categorías del recomendador con tres `gameIds` cada una. «Mis juegos» guarda los identificadores en `localStorage` bajo `rockgames:selected`, sin cuenta. El panel crea un enlace de WhatsApp con título y plataforma de cada juego; no envía el mensaje automáticamente y pide confirmar precio y disponibilidad. Si `whatsappNumber` está vacío, WhatsApp abre una intención de compartir sin destinatario del negocio. Configura el número antes de publicar.

`testimonials` es una lista vacía hasta contar con opiniones reales. Cada entrada admite `id`, `alias`, `platform`, `quote` y, opcionalmente, `date`, `origin`, `rating` y `avatar`. La home muestra un estado de espera claramente identificado mientras no haya referencias. `socialLinks.facebook` y `socialLinks.youtube` deben contener las URL oficiales del negocio; con valores vacíos aparecen como perfiles por configurar, sin enlaces inventados.

La iconografía de PlayStation, Xbox, Facebook, WhatsApp y YouTube usa SVG de Font Awesome Brands. Nintendo usa el símbolo SVG transparente derivado de su marca oficial en `public/assets/nintendo-switch-mark.svg`, sin el cuadro rojo. Switch y Switch 2 se agrupan en una sola opción Nintendo.

`bestsellerIds` define el orden del ranking editorial de muestra. `upcoming` guarda los paneles de próximos lanzamientos (título, plataforma, estado, fecha y artwork). Los dos paneles actuales son conceptos de diseño con fechas por confirmar, no anuncios reales. Sustitúyelos por lanzamientos verificados antes de publicar. Los nuevos fondos están en `art-sources/upcoming-*.png` y sus WebP optimizados en `public/assets/`.

### Cambiar el video de portada

Copia un MP4 a `public/assets/` y cambia `hero.video` en `src/data/site.json` por su ruta pública, por ejemplo `/assets/mi-video.mp4`. Cambia también `hero.poster` por una imagen del mismo video para la carga inicial y para visitantes que prefieren menos movimiento. Los campos `hero.eyebrow`, `hero.titleLead`, `hero.titleStrong` y `hero.description` controlan el texto. Si `hero.video` queda vacío, se muestra el póster. El video se reproduce sin sonido y en bucle; usa un archivo horizontal optimizado para web.

El MP4 inicial es un bucle de cámara sutil creado a partir de arte conceptual de ROCK GAMES, no un tráiler oficial. Sustitúyelo por material autorizado cuando el negocio elija un juego o campaña protagonista.

Los nueve artes de juegos son imágenes conceptuales generadas para esta maqueta, no portadas oficiales. Antes de publicar el catálogo real, sustituye esos archivos por imágenes autorizadas de cada producto y confirma precios y disponibilidad. El juego de Switch 2 también es un ejemplo con precio de muestra. Para generar versiones WebP de los PNG en `art-sources/`, ejecuta `npm run optimize:art`.

`analyticsId` admite un ID de Google Analytics 4 (`G-XXXXXXXXXX`). Si está vacío, el script de Google no se carga. El aviso de privacidad y la configuración de medición deben revisarse antes de publicar con Analytics activo.

### Origen de datos y SSR

`DATA_SOURCE=json` sigue siendo el valor predeterminado. `.env.example` documenta las variables y Astro valida sus nombres. Con `DATA_SOURCE=supabase`, el repositorio requiere `PUBLIC_SUPABASE_URL` y `PUBLIC_SUPABASE_PUBLISHABLE_KEY`; cualquier error de configuración o consulta se propaga y no vuelve silenciosamente al JSON.

SSR está pendiente de confirmar un host. `astro.config.mjs` no declara `output: "server"` ni instala un adapter, así que `npm run build` sigue siendo válido para el despliegue estático actual. Antes de activar SSR hay que elegir dónde correrá la web e instalar su adapter de Astro (por ejemplo, Node standalone para un servidor Node administrado, o el adapter oficial del proveedor elegido). No se añadió un adapter genérico sin conocer el entorno de producción.

La wishlist continúa guardando IDs en `localStorage` bajo `rockgames:selected`. En modo JSON, `selectionId` conserva el ID existente del juego. En modo Supabase, usa el UUID de `game_variant`; las tarjetas permiten elegir plataforma/edición y el panel/WhatsApp usan esa selección y su precio actual. No se reescriben automáticamente los IDs antiguos guardados en navegadores; se necesitará una migración explícita si se quieren resolver contra variantes.

### Supabase enlazado y validación

Se agregó una migración reproducible en `supabase/migrations/` y un seed local señalado como demo en `supabase/seed.sql`. Para probarlo localmente hace falta Docker Desktop y Supabase CLI:

```powershell
npm install
npx supabase start
npx supabase status
```

Toma del estado local el API URL y la publishable key; no copies claves secretas. Crea un `.env` local ignorado por Git con:

```dotenv
DATA_SOURCE=supabase
PUBLIC_SUPABASE_URL=<API URL local>
PUBLIC_SUPABASE_PUBLISHABLE_KEY=<publishable key local>
```

Después ejecuta `npm run dev`. Para reconstruir únicamente la base local desde cero y cargar otra vez la muestra demo: `npx supabase db reset`. Ese comando borra la base **local**. No uses `--linked` con producción.

Los títulos, precios y variantes del seed son de desarrollo, no inventario. Los covers están marcados como `local-assets` y usan los artes conceptuales de `public/assets`; no son objetos subidos. La migración crea el bucket público `public-media` (lectura por URL) sin política de escritura. Antes de cargar medios reales, reemplaza esas referencias por objetos del bucket. `private-drafts` queda documentado para una futura fase y todavía no se crea ni tiene políticas de subida.

El proyecto remoto está enlazado y `.env` local usa `DATA_SOURCE=supabase` con URL y clave publicable. `.env.example` conserva solo placeholders. Se aplicaron las migraciones `20261004120000_initial_catalog.sql`, `20261004130000_restrict_anon_storage_writes.sql` y `20261004140000_site_bootstrap.sql` tras inspección SQL y dry-run. La última registra familias, consolas, colecciones vacías, configuración pública y secciones, sin productos ni precios.

La lectura anónima pasó en las 17 tablas. INSERT, UPDATE y DELETE anónimos sobre `games` devolvieron `42501`; upload y update anónimos en Storage devolvieron `403`. La descarga de un objeto temporal del bucket público devolvió `200`. La API de Storage responde al DELETE anónimo con una lista vacía sin error, pero el objeto permaneció intacto; se comprobó en `storage.objects` y se retiró con el CLI administrativo. La migración de REVOKE sobre `storage.objects` no eliminó los grants predeterminados porque los otorgó `supabase_storage_admin`; la protección efectiva es RLS sin políticas de escritura. No se debe interpretar una respuesta vacía de DELETE como un borrado exitoso.

Se validó en desarrollo una ficha temporal con un juego y dos variantes, sus filtros, wishlist y mensaje de WhatsApp. Al cambiar el precio remoto de PS5 de 10 a 11, el catálogo mostró 11 tras recargar. El precio se restauró y la ficha temporal se eliminó. El seed DEMO **no** se cargó: no está confirmado que el remoto sea exclusivamente de desarrollo. No hay inventario comercial en la BD, por lo que el catálogo final se muestra vacío hasta cargar productos reales o autorizar un entorno de demostración.

`npm run verify:supabase` ejecuta las pruebas públicas de lectura y bloqueo de escritura usando `.env`. Si se pasa una ruta de objeto existente como argumento, también comprueba lectura pública y update/delete anónimos. No imprime la clave. Docker Desktop sigue sin daemon activo, por lo que `supabase status` local y `db dump` no funcionaron; la inspección remota se realizó con `supabase db query --linked`.

## Camino hacia la autoadministración

El contenido se lee desde una capa de repositorio con contratos de dominio y modelos de vista; el adaptador JSON conserva `site.json`, y el adaptador Supabase ya está implementado detrás de `DATA_SOURCE`. No hay CMS ni Auth administrativa. La salida sigue siendo estática hasta elegir host para SSR; por eso un build con `DATA_SOURCE=supabase` consulta los datos durante ese build y deja esa copia en los archivos generados.

Para ofrecer compra directa después habrá que decidir proveedor de pagos, método de entrega digital y reglas de confirmación de stock. El flujo actual arma la solicitud para WhatsApp y no cobra pagos.

## Dependencias

Astro está actualizado a 7.3.5. Al 3 de octubre de 2026, `npm audit` aún señala un aviso alto en su dependencia transitiva `http-cache-semantics` 4.2.0, que no tiene una versión corregida publicada. Esta versión se genera como archivos estáticos y no ejecuta Astro en el servidor público. Revisa ese aviso de nuevo antes de añadir renderizado en servidor.
