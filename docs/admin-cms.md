# ROCK GAMES Admin

The first CMS uses the existing Supabase tables and the `public-media` bucket. It adds the `admin_users` authorization table and admin RLS policies in `supabase/migrations/20261004160000_admin_cms.sql`.

## Apply the migration

Review the SQL, link the Supabase CLI to the existing project, then push the checked-in migrations:

```sh
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push
```

The public site keeps its existing anonymous read policies. The new migration grants authenticated users write privileges only on CMS-managed tables and adds RLS policies that require an active row in `public.admin_users`. Only the `owner` role can update `site_settings` or Home sections. Editors can manage games, variants, collections, testimonials, and media. No service-role key is used by the app.

## Create the first owner

1. In Supabase Dashboard, open **Authentication → Users → Add user** and create the owner's account. Confirm the address if your Auth settings require it.
2. Copy the user's UUID from the Auth Users list.
3. In **SQL Editor**, run the following after replacing the placeholder with that UUID:

```sql
insert into public.admin_users (user_id, role, is_active)
values ('PASTE_AUTH_USER_UUID_HERE', 'owner', true);
```

Do not use an email or password in `admin_users`. The app checks the authenticated UUID and the active role on every admin request. To remove access, set `is_active = false` from the Dashboard SQL Editor.

## Runtime

Configure `PUBLIC_SUPABASE_URL`, `PUBLIC_SUPABASE_PUBLISHABLE_KEY`, and `DATA_SOURCE=supabase` in the hosting environment. The publishable key is used with the user's cookie-backed Auth session and RLS. Never configure a service-role key for the CMS runtime.

Admin sessions use `@supabase/ssr` cookies with the PKCE flow. Mutations are Astro server endpoints that verify same-origin requests, validate form values, use the caller's authenticated Supabase client, and rely on RLS as the final authorization check.

## Media and editor experience

- `/admin` is protected; `/admin/login` is the only public CMS route.
- Game setup begins with a draft, then the game page handles versions, cover, gallery and video; a game cannot be published until it has an active available version.
- Version keys and public slugs are generated from human-facing labels; only the slug remains editable under advanced options.
- Images (JPG, PNG, WebP, AVIF) are decoded and checked with Sharp, limited to 40 megapixels, orientation-corrected, resized within 2560×2560, stripped of metadata, and converted to WebP at quality 82. Output is limited to the bucket's 20 MB ceiling. `ADMIN_IMAGE_MAX_BYTES` controls the accepted original image size.
- Video upload accepts MP4 only, validates the container signature, and does not transcode. The current Storage bucket does not allow WebM; SVG is also intentionally not accepted through admin uploads.
- New game assets use generated paths under `games/{game-id}/`; logo assets use `brand/`; generic assets use `misc/`; section uploads use `sections/{section-key}/`. The UI shows labels and previews instead of paths.
- Gallery upload accepts multiple files and saves ordering to `game_media.sort_order`; mouse drag-and-drop, buttons, and Alt+arrow keyboard controls persist the order.
- The media library recursively lists Storage objects, shows available size/dimensions and references from game media, Home sections and the logo, and blocks deletion while referenced. “Eliminar archivos sin usar” requires confirmation. `ADMIN_VIDEO_MAX_BYTES` controls the accepted video size.
- Home editors show fields per section and include a visual picker. Country/currency, contact, networks, logo and Analytics are grouped in Settings.
- UI uploads and mutations use the authenticated cookie-backed Supabase client; no service-role secret is exposed to the browser. Storage policies still require the active administrator policies from the previous migration.

## Validation boundary

- `npm run build`, `npx tsc --noEmit`, `npm audit`, Sharp's local image conversion, and anonymous SSR route responses can be checked locally.
- A real admin end-to-end run (login → create/publish → Storage upload → Home/settings → public storefront) requires the admin migration to be applied to the connected Supabase project and an active owner account. The migration file is checked in, but do not claim the hosted RLS/Storage policies were exercised until that run succeeds.
- Upload progress is an honest indeterminate “Subiendo y optimizando…” state followed by a server response. Separate browser-visible conversion stages are not reported because the current form endpoint does not stream processing progress.
- Video duration is not inspected and video files are not transcoded. Keep hero videos short and optimized before upload.

## Scope and operational notes

- The panel manages existing platforms, genres, tags, seeded collections, testimonials, fixed Home section keys, game media, and site settings.
- There is no customer authentication, checkout, order processing, page builder, or admin user-management screen in this phase.
- Supabase Auth users and the first owner row must be created manually as above. No credentials are committed or generated.
