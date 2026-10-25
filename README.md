# AFRIFF Festival Companion

An npm-workspaces monorepo holding the two apps AFRIFF ships for the Africa
International Film Festival (Lagos, 1–7 Nov 2026) and the packages both are
built from. Same architecture as the DP Fitness repo.

```
apps/
  pwa/      the attendee app: programme, queues, My Festival   → :3000
  admin/    the staff console (/admin) and door view (/door)  → :3001
packages/
  theme/    @afriff/theme: the design system, as a Nuxt layer
  pwa/      @afriff/pwa:   service worker, updates, install, offline banner (Nuxt layer)
  core/     @afriff/core:  festival data, types, date helpers, Firebase + offline cache
```

The split is by audience. `apps/pwa` is what an attendee opens from a QR
code on a cheap phone on slow data: it must be small and never carry staff
code. `apps/admin` is for the team: sign-in, editing, approvals, reports,
and the volunteers' door counter, installable on its own. What the two must
never disagree about (how AFRIFF looks, how a PWA behaves, what a screening
is, which Firebase project they use) lives once in `packages/`.

## Getting started

```bash
npm install          # installs every app and package (run at the repo root)

npm run dev:pwa      # the attendee app  → http://localhost:3000
npm run dev:admin    # the staff console → http://localhost:3001
```

No `.env` is needed: both apps default to the live Firebase project. See
`.env.example` for the optional settings (another Firebase project, and the
console address the attendee app forwards old `/admin` and `/door` links to).

| Script | What it does |
| --- | --- |
| `npm run dev:pwa` / `dev:admin` | Dev server for one app |
| `npm run build` | Build both apps |
| `npm run build:pwa` / `build:admin` | Build one |
| `npm run preview:pwa` / `preview:admin` | Serve a production build, with the service worker |
| `npm run typecheck` | `vue-tsc` for both apps (covers the packages too) |

> Run a build with that app's dev server **stopped**. Both write to `.nuxt`.

## The shared packages

`packages/theme` and `packages/pwa` are [Nuxt layers](https://nuxt.com/docs/getting-started/layers);
`packages/core` is plain TypeScript (imported as `@afriff/core/<path>`) plus a
tiny layer carrying the Firebase project details. Each app names all three in
`extends`:

```ts
extends: ['@afriff/theme', '@afriff/pwa', '@afriff/core']
```

One wrinkle, same as DP Fitness: the theme layer does **not** register
`styles/theme.css` as a `css` entry. Tailwind v4 publishes utilities only for
`@theme` blocks inside the stylesheet that imported `tailwindcss`, so each app
owns a short CSS entry that imports Tailwind and then the tokens:

```css
@import "tailwindcss" source(none);
@source "../..";
@source "../../../../../packages/theme/components";
@source "../../../../../packages/pwa/app";
@import "@afriff/theme/styles/theme.css";
```

## More

- `DEVELOPER.md`: how it all fits together, data flow, the PWA, deploying.
- `CLAUDE.md`: the product brief and decision log.
- `firestore.rules`: database security rules (paste into the Firebase console to publish).
