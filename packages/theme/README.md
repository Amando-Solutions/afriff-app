# @afriff/theme

The AFRIFF design system as a Nuxt layer, extended by `apps/pwa` and `apps/admin`.

- `styles/theme.css`: all tokens (navy + gold palette, type scale, radii, shadows) and shared utilities. Imported by each app's `app/assets/css/main.css` after Tailwind (not a `css` entry; see the note at the top of the file).
- `components/ui/`: UiButton, UiSheet, UiChip, UiBadge, UiSegmented, UiToggle, UiEmptyState, UiSectionHeader.
- `components/brand/`: BrandEmblem, BrandWordmark, AppLogo.
- `public/`: official emblem (`brand/`), favicons and app icons, served by both apps.
- `nuxt.config.ts`: Tailwind v4 Vite plugin, bundled fonts (Archivo, Onest), components, shared head tags.
