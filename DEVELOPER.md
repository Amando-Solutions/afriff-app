# AFRIFF Festival Companion: developer handover

Welcome! This is a working app, already live, not a spec to rebuild.
Your job is to make sure it's technically solid for the festival
(Lagos, **1–7 Nov 2026**) and to finish what's left.

- **Live app:** https://afriff-app-mu.vercel.app
- **Staff console** (admin console + door view): its own app and address since
  24 Oct (`apps/admin`). Old `/admin`, `/door`, `#/admin` and `#/door` links
  on the attendee app forward there.
- **Full decision log:** [CLAUDE.md](CLAUDE.md). It records why each thing
  is the way it is, so read it before changing behaviour. Keep it updated:
  the product owner and Claude Code both rely on it.

## 1. Access you should have
| What | How you get it |
|---|---|
| Code (GitHub, private repo) | Collaborator invite from the product owner |
| Firebase project `afriff-app` (Firestore + Auth) | Added as **Editor** under Project settings → Users and permissions |
| Admin console role | Create an account on the staff console at `/login`; an admin sets your role to *admin* on the Team page |
| Vercel projects `afriff-app` (attendee) and the staff console project | Hobby plan = owner only for now; deploys go through the owner (see §5) |

There are **no secrets**. The Firebase web config lives in
`runtimeConfig.public.firebase` in `packages/core/nuxt.config.ts`; it's the
public kind, and access is controlled by `firestore.rules`. To point a build
at another Firebase project, set the `NUXT_PUBLIC_FIREBASE_*` variables listed
in `.env.example` (in `apps/pwa/.env` / `apps/admin/.env`, or on the host).
The one setting you must give the attendee app in production is
`NUXT_PUBLIC_ADMIN_URL` (the staff console's address), so old admin and door
links forward there.

## 2. Run it locally
Requires Node 20.19+ (22 recommended). It's an npm-workspaces monorepo:
run everything **from the repo root**.
```
npm install            # installs every app and package (one lockfile, at the root)
npm run dev:pwa        # attendee app  → http://localhost:3000 (phones on the same Wi-Fi: http://<laptop-ip>:3000)
npm run dev:admin      # staff console → http://localhost:3001 (/login, /admin, /door)
npm run build          # build both (or build:pwa / build:admin); output in apps/<app>/.output/
npm run preview:pwa    # run a production build with the service worker (offline, install, updates)
npm run preview:admin
npm run typecheck      # TypeScript check of both apps and the shared packages (run before every commit)
npm run test:accounts  # attendee accounts: PIN rules, lockouts, codes, Brevo list (pretend database, ~6 s)
```
Add a dependency to the app or package that uses it, e.g.
`npm install some-lib -w afriff-pwa` or `-w @afriff/core`.
Run a build with that app's dev server stopped (both write to `.nuxt`).
Windows note: if PowerShell blocks `npx`, use `npx.cmd`. Don't change the
execution policy on the owner's laptop.

The offline/installable parts (service worker, updates, install prompt) only
run in a production build: build, then `npm run preview:pwa` /
`preview:admin` to try them. Dev servers talk to the real Firestore like the
live apps do.

**Testing switches** go in the address, e.g. `/programme?now=2026-11-03T13:00`.
They're remembered for that browser tab (so they survive moving between
pages and reloading); close the tab to clear them.
- `?now=2026-11-03T13:00` acts as if it's that Lagos time. Drives the
  countdown, the daily highlight on Home (1–7 Nov), the timeline's red line
  and queues. Try `?now=2026-10-25T10:00` (before), `?now=2026-11-03T13:00`
  (festival day), `?now=2026-11-08T10:00` (after).
- `?queues=sample` shows pretend queues (use with `?now=` on a festival day).
- `?welcome=1` shows the first-open welcome cards again.
- `?share=1` lets the dev build send anonymous usage counts (it never sends otherwise).

## 3. Stack and shape
A monorepo, set up like the DP Fitness repo: split **by audience**, with
everything both apps must agree on in shared packages.
```
apps/
  pwa/      afriff-pwa: the attendee app (QR code → phone)          → :3000
  admin/    afriff-admin: the staff console (/admin) + door view (/door) → :3001
packages/
  theme/    @afriff/theme: design system (Nuxt layer)
  pwa/      @afriff/pwa:   PWA behaviour (Nuxt layer)
  core/     @afriff/core:  shared data, types, utils, Firebase
functions/  Cloud Functions (Firebase): syncFromAfriff, the afriff.com film sync.
            Own package.json + lockfile, NOT an npm workspace.
firestore.rules   database security rules (both apps)
```
- **Why two apps:** attendees should never download staff code (sign-in,
  forms, reports), and staff get their own installable app with its own
  icon and start page (volunteers open straight onto `/door`). Same look,
  same data, same offline behaviour, because both build on the packages.
- **Nuxt 4 (Vue 3), SPA mode (`ssr: false`), TypeScript throughout**
  (strict, plus `noUncheckedIndexedAccess`). Every `.vue` file uses
  `<script setup lang="ts">` with typed `defineProps<…>()` /
  `defineEmits<…>()` / `defineModel<…>()`; every module is `.ts`. Tailwind
  CSS 4, icons from `lucide-vue-next`, fonts Archivo (headings) + Onest
  (text), bundled so they work offline. Real addresses (`/film/<id>`,
  `/programme/films`); old `#/...` links are forwarded by
  `apps/pwa/app/middleware/old-hash.global.ts`.
- **Each app `extends` the three layers** in its `nuxt.config.ts`
  (`['@afriff/theme', '@afriff/pwa', '@afriff/core']`) and only holds what's
  particular to it: its pages, its own components, its manifest.

**`packages/theme` (@afriff/theme)** — the design system, as a Nuxt layer:
- `styles/theme.css`: every token (colours, type sizes, radii, shadows) and
  shared utility (`card`, `eyebrow`, `scroll-row`…). The AFRIFF navy + gold
  system. Change it once, both apps change.
- `components/ui/` (UiButton, UiSheet, UiChip, UiBadge, UiSegmented,
  UiToggle, UiEmptyState, UiSectionHeader) and `components/brand/`
  (BrandEmblem, BrandWordmark, AppLogo), usable by file name in either app.
- `public/`: the official emblem and app icons, served by both apps.
- Not registered as a `css` entry, on purpose (Tailwind v4 only publishes
  utilities for tokens inside the stylesheet that imported Tailwind): each
  app's `app/assets/css/main.css` imports Tailwind, then
  `@afriff/theme/styles/theme.css`. Same trick as DP Fitness.

**`packages/pwa` (@afriff/pwa)** — what makes each app a proper PWA (see
"How the PWA works" below): `@vite-pwa/nuxt` with the shared service-worker
setup, `app/plugins/pwa.client.ts` (register, update checks, reload rules,
install offer), `app/composables/useInstallApp.ts` + `app/lib/installPrompt.ts`
(install toast logic), `app/components/AppOfflineBanner.vue`. Each app adds
only its manifest.

**`packages/core` (@afriff/core)** — plain TypeScript both apps import as
`@afriff/core/<path>`:
- `types/festival.ts`: the shapes of films, screenings, events, venues,
  news, jury, queue counts, the published bundle.
- `data/`: built-in festival data (`programme.ts`, `events.ts`, `jury.ts`),
  the first-visit fallback and the console's import source.
- `utils/format.ts` (dates, times, queue labels), `utils/now.ts` (Lagos
  clock + test switches).
- `firebase/config.ts` + `firebase/app.ts`: the Firebase app and Firestore
  with the offline cache on the device; `firebase/published.ts` +
  `published.ts`: the published-data feed (both apps use it).
- Its tiny `nuxt.config.ts` carries the Firebase project details.

```
apps/pwa/app/
  pages/        index (Home), programme/[[tab]], film/[id], event/[id], my (My Festival),
                queues, venues, news, jury; admin/[...path] + door only forward to the console
  components/   app/ (header, bottom bar, install toast, welcome cards, sponsor marquee,
                StaffRedirect), festival/ (posters, rows, jury, daily highlight),
                programme/ (day picker, venue chips, timeline, My plan sheet, search)
  layouts/      default (attendee frame)
  lib/          store (phone storage), queues, alerts, usage, plan, today, dayItems,
                eventLook, programmeMemory; firebase/live.ts (live queues + usage writes)
  plugins/festival.client.ts   loads the saved copy, then follows published data and live queues
  spa-loading-template.html    splash shown before the app's code has started
apps/pwa/public/masterclasses/ AFRIFF's official masterclass graphics
apps/admin/app/
  pages/        one page per address: index ("/" sends people on), login, pending, door,
                admin/ (index = tiles, team, approvals, publish, reports, mine, door → /door,
                data/, data/[col]/, data/[col]/[id])
  layouts/console.vue          top bar for every /admin page
  components/   auth/ (AdminLogin), console/ (Admin*.vue screens), door/ (door counter)
  lib/          access.ts (who may open which page, where people are sent),
                useAdminAuth.ts, schema.ts drives every form/list, data.ts (save/approve/import/backup),
                publish.ts, reports.ts, board.ts (door counts), firebase.ts (Auth), types.ts, util.ts
  middleware/auth.global.ts    runs lib/access.ts on every page change
  plugins/auth-guard.client.ts moves people on when they log in/out or their role changes
  plugins/published.client.ts  the published-data feed (venue names etc. stay current)
```

- **Firebase loads after first paint** in the attendee app. Its first
  screen's code has no Firebase (~29 KB gzipped entry). The Firestore SDK
  (~170 KB gzipped) arrives with a dynamic `import()` once the first screen
  is showing (`@afriff/core/published`, `apps/pwa/app/lib/firebase/live.ts`).
  Firebase Auth exists only in `apps/admin`. Keep it that way: no static
  `firebase/*` imports in attendee screens or in modules they import
  statically.

- **Visual hierarchy rules** (keep new screens consistent):
  - One gold thing per area: gold (`accent`) is for actions, the selected
    state (day picker, chips, tabs, toggles) and the active nav item. Data
    such as times, dates, counts and initials is in white (`ink`) or muted,
    never gold.
  - Text levels: page title (`PageTitle`, display) → section `text-h2`
    (`UiSectionHeader`) → item title `text-body font-semibold` → details
    `text-meta text-muted` → small labels with the `eyebrow` utility
    (uppercase, tracked, `text-subtle`). Don't make new uppercase labels by
    hand; use `eyebrow`.
  - Row times use `RowTime` (big time, small AM/PM). Status words use
    `UiBadge` tones (success / accent / danger / neutral); cancelled items
    fade to 60%.
  - Choice groups: `UiSegmented` (one of a few, e.g. All / Films / Events),
    `UiChip` (filters), `UiToggle` (view switch).

## 4. How data flows (the important bit)
1. **Firestore is the master copy.** The team edits films, screenings,
   events, venues, news, sponsors, jury and How to attend in the console.
   Editors' changes wait in `changes` for an admin to approve.
2. **Publish to app** (admins) packs everything into one document,
   `published/current`.
   Alongside it, it writes a tiny marker, `published/version` ({version}).
3. **Phones read Firestore directly** with the Firebase SDK (no server
   routes; the old `/api/festival` and `/api/queues` relays are gone).
   `@afriff/core/published` (`packages/core/src/published.ts`): on start the
   device shows its saved copy (localStorage `afriff-data-v1`, or the
   built-in data in `packages/core/src/data/` on a first visit), then watches `published/version` live. Only when the marker
   is newer than what the phone has does it download `published/current`,
   so each phone reads the big bundle once per publish (not once per visit)
   and a publish reaches open phones within seconds. If the marker doesn't
   exist yet (published before 23 Oct), the bundle is read once per visit
   until the next publish creates it.
4. **Offline and reconnecting** are the SDK's job: Firestore's cache lives in
   the phone's IndexedDB (`persistentLocalCache`, multi-tab), so listeners
   answer from the cache offline, writes made offline are queued (even across
   closing the app) and sent when the connection is back, and listeners
   catch up by themselves. See `packages/core/src/firebase/app.ts`.

Rules of the road:
- **Never overwrite database items with the built-in copy.** The console's
  "Add missing festival data" (`importAll` in `apps/admin/app/lib/data.ts`) only:
  adds items whose ID is missing; fills fields an item doesn't have at all;
  and swaps values listed in `REPLACED_LINKS` / `REPLACED_VALUES`
  (`packages/core/src/data/events.ts`) **only while the database still holds exactly that
  old value**. That last rule is how corrections we ship (e.g. new
  masterclass graphics, a changed speaker) reach the database without ever
  touching something the team typed. Add to those lists when you correct
  built-in data that's already been imported.
- To add a field: add it to the type in `packages/core/src/types/festival.ts`,
  then one line in `apps/admin/app/lib/schema.ts` (the form, list and
  import pick it up). Then read the field in the attendee screen.
- **`firestore.rules` is not deployed automatically.** From the main folder
  (Firebase CLI, signed in with `firebase login`; all go to afriff-app):
  - `npm run deploy:rules`: the normal rules (production).
  - `npm run deploy:functions`: Cloud Functions (`functions/`, see "afriff.com
    film sync" below; deploying needs the Blaze plan).
  Add `-- --dry-run` to any of them to validate without changing anything.

Other data on phones: plans, Seen it and star ratings are in localStorage
`afriff-my-v1` (no accounts, by design). Anonymous usage counts go to
`usage/{randomDeviceId}` with the SDK (queued on the phone when offline), at
most every 30 min, with an opt-out switch in My Festival. The admin Reports
page reads them.

### How the PWA works (same approach as the DP Fitness PWA)
All of this lives in `packages/pwa` and applies to both apps.
- **Service worker** (generated by `@vite-pwa/nuxt` from
  `packages/pwa/nuxt.config.ts` → `pwa.workbox`; each app adds its manifest):
  precaches that app's whole build (app shell prerendered as `/`, every
  page's code incl. the Firebase SDK, fonts, icons); every address falls back to the shell, so deep links open
  offline. Images are cached as they're seen (our own: cache-first; other
  sites': show saved copy, refresh in background). Firestore traffic is never
  touched by the worker.
- **Updates**: `skipWaiting` + `clientsClaim`, so a new version takes over
  without waiting for tabs to close. `packages/pwa/app/plugins/pwa.client.ts` checks for a
  new `/sw.js` whenever the app returns to the foreground (plus on reconnect,
  focus and hourly), because phones resume frozen pages instead of reloading
  them. When a new version takes over, attendee screens reload onto it at
  once; the console and door view wait until the person leaves the app, so no
  unsent door taps are lost. `/sw.js` and the manifest are served with
  no-cache headers (`routeRules`), or deploys wouldn't reach installed apps.
- The module's own client plugin is switched off (`client.registerPlugin:
  false`): it force-reloads every open page on update and its "not now"
  hid the install offer for good.
- **Install**: Chrome's offer is caught at start (`lib/installPrompt.ts`) and
  shown as our toast; iPhone gets the Share → Add to Home Screen steps
  (with a hint for in-app browsers). "Not now" snoozes for a week.
- **Offline banner** (`AppOfflineBanner.vue`): "You're offline…" while
  offline, "Back online" for a moment on return. Queues says when counts are
  the last ones received, and only shows "Live" when they are.

**Home** (`apps/pwa/app/pages/index.vue`) changes with the Lagos date: countdown
banner + "Opening day" before 1 Nov; `DailyHighlight` (day N of 7, theme,
poster collage, counts, next up) + a "Today" list during the festival;
a thank-you banner after. Collage order lives in `apps/pwa/app/lib/today.ts`: films
ticked "Feature on Home" in the console first, then the opening film, then
films with real posters, then by start time.

### Push notifications for announcements (26 Oct 2026)
Attendees opt in with **"Alerts on this phone"** (News page and My Festival,
`apps/pwa/app/components/app/AlertsSwitch.vue`). Admins don't press anything
extra: a news item ticked **"Send as a push notification"** (ticked by default
on new items and on the "Tell attendees?" alerts) is sent once, the first time
it's published.
- **Phone side** (`apps/pwa/app/lib/push.ts`): permission from the tap →
  FCM registration token (`lib/firebase/messaging.ts`, `firebase/messaging`,
  lazy-loaded, ~8 KB gz) using the app's own service worker → POST the token to
  the **staff app's** `/api/push/subscribe`, which adds it to the FCM topic
  `news`. Off = `/api/push/unsubscribe` + `deleteToken`. On each start
  (`plugins/push.client.ts`) it re-joins if FCM renewed the token (or weekly),
  and notices if notifications were blocked in the phone's settings. We store
  no list of phones; only localStorage `afriff-push` on the phone.
- **Showing it**: `apps/pwa/public/push-sw.js`, added to the generated service
  worker with `pwa.workbox.importScripts` (attendee app only). Messages are
  data-only `{ title, body, url, tag }`; tapping opens `/news` (or moves an
  open app there without reloading). `tag` = `news-<id>`, so a repeat replaces.
- **Sending** (`apps/admin/server/api/push/send.post.ts`, admins only, ID token
  checked + `users/{uid}.role == 'admin'`): the console's Publish page calls it
  right after publishing. It reads `published/current` (so a notification never
  mentions something attendees can't see yet), picks the due items with
  `duePushes()` in `apps/admin/shared/push.ts` (the console uses the same
  function to list them before publishing): ticked, not in `pushLog`, banner
  not expired, newest first, **at most 3 per publish** (extras are logged as
  skipped, never sent later). `pushLog/{newsId}` is created before sending
  (create fails if it exists, so two admins can't double-send) and removed if
  FCM fails, so the next publish retries. One `send()` to the topic reaches
  every phone: FCM does the fan-out, free, no Firestore reads per phone.
- **Server routes**: the staff app now has three (`server/api/push/*`, Vercel
  functions) and depends on `firebase-admin` 13 (Node 18+). Subscribe/unsubscribe
  allow cross-site calls (phones call them from the attendee app's address;
  they send `text/plain` to skip the CORS preflight on slow data). The
  attendee app still has no server routes.
- **iPhone**: web push only works in the app added to the Home Screen
  (iOS 16.4+); in Safari the switch is replaced by that instruction.
- **Testing locally**: no service worker in `npm run dev`, so the switch is
  hidden there. Use `npm run build` + preview with both settings below, or
  test on the deployed apps. FCM topic management through the Admin SDK is
  the current Google-supported route (Google retires older Admin SDK versions'
  topic calls after 29 Sep 2027; keep `firebase-admin` up to date after that).

### Attendee accounts: sign-up before using the app (26 Oct 2026)
**Pending AFRIFF's written approval** (it reverses the brief's "no sign-up").
The attendee app opens on **`/auth`** (sign up / log in / Forgot PIN) until
the person has an account on that phone; deep links survive
(`/auth?redirect=/film/lady`). `/privacy` is open to everyone.
- **Who checks the PIN**: the **staff app's server**, not Firebase's own
  email/password sign-in (that needs 6+ character passwords and its lockout
  can't be set). Routes, all `text/plain` JSON, cross-site like the push ones:
  `/api/account/status` (GET: accounts set up? emails? "Require sign-up"?),
  `signup`, `login`, `code` (Forgot PIN: email a 6-digit code), `reset`
  (code + new PIN), `marketing` and `delete` (these two take the phone's
  Firebase ID token in the body). A good PIN or code returns a Firebase
  **custom token** with the claim `attendee: true`; the phone signs in with it
  (`apps/pwa/app/lib/firebase/account.ts`, `firebase/auth` via `initializeAuth`,
  ~17 KB gz, lazy). Attendee users have no email/password in Firebase Auth, so
  they can't use the staff login, and `firestore.rules` stop them creating a
  staff profile (`isAttendee()`).
- **Logic** lives in `apps/admin/server/accounts/` (no Nuxt globals, testable):
  `logic.ts` (rules), `pin.ts` (scrypt + server secret "pepper"),
  `firestoreStore.ts` (Admin SDK), `brevo.ts` (code email + list),
  `test/` (`npm run test:accounts`, pretend database). Shared limits and
  wording: `packages/core/src/accounts/rules.ts`.
- **Security (agreed with the owner)**: 4-digit PINs, ~120 easy ones refused
  (repeats, runs, top leaked PINs, years 1950–2030); PIN = scrypt(HMAC(secret,
  pin), salt), so a database copy is useless without `NUXT_ATTENDEE_PIN_SECRET`;
  5 wrong in a row → 15-minute pause; 10 → only a new PIN by emailed code
  unlocks; codes 15 min / 5 tries / 3 emails an hour; 50 wrong tries per
  network per 15 min across all accounts (networks stored only as a hash;
  generous because mobile data and venue Wi-Fi share addresses).
- **Collections**: `attendees/{uid}` (the "App users" list: admins read all,
  the person reads their own), `attendeePlans/{uid}` (My Festival; only its
  owner, only while the account exists, shape and sizes checked),
  `settings/attendeeAccounts` (`requireSignUp`, admins), and server-only with
  no rule: `attendeeSecrets`, `attendeeEmails` (one per email, key = SHA-256),
  `authLimits` (has `expireAt`: add a Firestore TTL policy on it if you like).
- **My Festival sync** (`apps/pwa/app/lib/planSync.ts`): the phone's copy
  (`lib/store.ts`) stays what screens use; changes are written to
  `attendeePlans/{uid}` 1.5 s after the last tap (queued offline by the SDK);
  a live listener brings other phones' changes. Last agreed version is
  remembered, so a one-sided change wins (removals stick) and two-sided
  changes are merged (`mergePlans`). Logging in adds the phone's existing picks.
  Log out clears the plan from that phone (warns first if unsent changes).
- **Never a lockout**: `/auth` offers "Continue for now" (this visit only,
  sessionStorage) when the status call fails, a send can't reach the server,
  or accounts aren't set up; "Skip for now" when an admin turns **Require
  sign-up** off (console → Attendees; reaches phones within ~1 min).
- **Brevo**: only people who tick "Yes, AFRIFF can email me festival news and
  updates" go to the **"App subscribers"** list (optionally via Brevo double
  opt-in); the full **"App users"** list stays in Firestore (console →
  Attendees, CSV). Brevo down or not set up → their record says `pending` /
  `failed` and **Send to Brevo** on the Attendees page catches up. The PIN code
  email is a transactional email (goes to anyone who asks).
- **Console**: `/admin/attendees` (admins only): Require sign-up switch, what's
  set up on the server, the list with search, CSV of all users / subscribers
  (formula-safe), delete account (also removes its plan, sign-in and Brevo
  contact), Send to Brevo. Reports → **Sign-ups**: per Lagos day and opted-in,
  counted with Firestore aggregation queries (≈1 read per day shown).
- **Local testing**: `npm run dev:admin` with `NUXT_ATTENDEE_PIN_SECRET` set and
  no Brevo key prints Forgot PIN codes in its terminal. Careful: it uses the
  **live** database with your service-account key.

### afriff.com film sync (Cloud Function, 26 Oct 2026)
`functions/` holds one scheduled function, `syncFromAfriff` (every 15 min,
europe-west2, Node 22, 512 MiB, max 1 instance, no retries). It keeps
`films/*` in step with afriff.com without overwriting the team's edits.
Full behaviour and decisions: CLAUDE.md "afriff.com film sync".
- **Reading afriff.com** (`src/afriff/`): there's no feed. `site.ts` finds
  the film-list module (`film-selection-…js`, linked from `/program`; falls
  back to searching the other linked chunks). Vite fingerprints file names,
  so the same URL means the same data: an unchanged check costs one page
  download and one small status write. `sandbox.ts` evaluates the module in
  QuickJS-WASM (`quickjs-emscripten-core` + the release-sync variant):
  imports are replaced by pass-through stand-ins, with a 64 MB / 5 s cap, and
  only JSON comes out. Never `eval` or `vm` this code in Node: it would run
  with the function's admin credentials. `films.ts` picks the film array and
  section map out of the exports and cleans them into our `Film` fields.
- **The merge** (`src/sync/plan.ts`, pure): three-way, per field, against a
  baseline of afriff.com's previous values (`sync/afriff-baseline`). afriff
  unchanged → skip; we still hold afriff's old value → write; we hold
  something else → a `changes` doc with `fields: [...]` for Approvals (one
  open proposal per film, merged across checks); afriff emptied it → keep
  ours. First run (no baseline) only learns. Never deletes; doesn't re-add
  films the team deleted. `approveChange` (apps/admin `lib/data.ts`) writes
  only `fields` when present.
- **Saving** (`src/sync/run.ts`): one batch per check (film updates with
  `lastUpdateTime` preconditions, creates, proposals, baseline, status
  `sync/afriff`, run log `syncRuns/{id}`). A precondition failure aborts it
  all; `status.filmsFile` only moves on success, so the next check retries.
  `src/sync/store.ts` wraps Firestore (Admin SDK) and an in-memory twin for
  tests.
- **Commands** (from the repo root): `npm run functions:install` once;
  `npm run functions:test` (typecheck + 37 tests, no network);
  `npm run functions:check` (dry run against live afriff.com and the public
  published copy; writes nothing); `npm run deploy:functions` (firebase.json
  predeploy runs typecheck, tests and the esbuild bundle → `functions/lib/`).
  Logs: `npm --prefix functions run logs`. Run a check now: Cloud Scheduler
  → firebase-schedule-syncFromAfriff-europe-west2 → Force run.
- **When afriff.com publishes screening times**: the status card flags it
  (schedule page fingerprint / new keys on film records, `KNOWN_SOURCE_KEYS`
  in `src/config.ts`). Then add a parser for their format and plan
  screenings the same way (match on film + date + venue; leave the console's
  sample screenings alone until the team decides).
- To sync more fields, add them to `SYNCED_FIELDS` + `cleanFilm`: existing
  films learn the new field on the next check rather than being overwritten.

## 5. Deploying and hosting
Two Vercel projects from this one repo, one per app:

| Vercel project | Root Directory | Settings |
|---|---|---|
| `afriff-app` (existing, attendee) | `apps/pwa` | env `NUXT_PUBLIC_ADMIN_URL` = the console's address; `NUXT_PUBLIC_FIREBASE_VAPID_KEY` (push, public); `NUXT_PUBLIC_PRIVACY_EMAIL` (accounts, public) |
| staff console (new, e.g. `afriff-staff`) | `apps/admin` | env `NUXT_PUBLIC_ATTENDEE_URL` (optional); `NUXT_FIREBASE_SERVICE_ACCOUNT` (push + accounts, **secret**: mark Sensitive); `NUXT_ATTENDEE_PIN_SECRET` (accounts, **secret**, never change it); `NUXT_BREVO_API_KEY` (**secret**), `NUXT_BREVO_SENDER_EMAIL`, `NUXT_BREVO_SENDER_NAME`, `NUXT_BREVO_LIST_ID`, optional `NUXT_BREVO_DOI_TEMPLATE_ID` / `NUXT_BREVO_DOI_REDIRECT_URL` |

The six `NUXT_PUBLIC_FIREBASE_*` variables are the same for both apps: add
them once as Vercel **Shared Environment Variables** (Team Settings →
Environment Variables) linked to both projects, not per project (a project's
own variable with the same name overrides the shared one). They're optional
while both apps use the live `afriff-app` Firebase project (the code falls
back to it). Values are baked in at build time: redeploy both apps after a
change. Locally: `apps/pwa/.env` and `apps/admin/.env` (not in Git), with the
shared block marked in each; `.env.example` lists them all.

Vercel sees the npm workspaces (root `package.json` + root lockfile),
installs from the root, and builds each app with `nuxt build`
(`apps/*/vercel.json` say it's Nuxt; Git auto-deploys are off). Deploys are
manual, **always from the repo root** (Vercel's CLI must not be run from a
subfolder):
```
npx.cmd vercel link --repo     # once: links both projects to this repo
npx.cmd vercel deploy --prod   # deploys the currently linked project
npx.cmd vercel link            # switch to the other project, then deploy again
```
The attendee app has no server functions (the host only serves files); the
staff app has the three push routes (`/api/push/*`) and the attendee-account
routes (`/api/account/*`, `/api/attendees/*`). After a deploy,
check `/`, `/film/lady` and `/admin` (should forward to the console) on the
attendee app, `/` (should go to `/login`), `/admin` and `/door` on the console, and that `/sw.js` comes
back with `Cache-Control: no-cache` on both. Add the console's domain to
Firebase → Authentication → Settings → Authorized domains.
`.vercelignore` keeps `reference/` (design screenshots, not in the repo)
out of uploads.

**Open decision: Vercel vs Firebase Hosting.** Vercel Hobby is
non-commercial, so it can't be the launch host as is. Options under
discussion with the owner:
- Vercel Pro (~$20 per member per month) + Firebase Blaze for uploads; or
- Firebase Hosting on the **Blaze** plan only (one bill, no seat fees; no
  relays to move now). Spark hosting alone allows ~360 MB/day transfer, too
  little for festival traffic.
- **Firestore reads now come straight from phones.** Published data is cheap
  (one tiny marker read per visit, the bundle once per publish). Live queues
  are the big one: every saved count is one read for every phone listening.
  Listening is limited to festival days, while the app is on screen, from
  3 h before the day's first screening to the start of its last
  (`apps/pwa/app/lib/queues.ts`), but at festival scale this can pass Spark's 50k
  reads/day. Budget for **Blaze** during the festival (a few cents per 100k
  reads) with a budget alert.
Whichever is chosen, set a Blaze **budget alert**, and point the final
address (e.g. app.afriff.com) at it before the QR codes are printed.

## 6. What's left / what to check
**Live queues (step 8, built 22 Oct):** volunteers' taps are bundled and
saved to one record per venue per day (`queueDays/{date}/venues/{venue}`);
phones listen to that day's records directly (live, ~3 small docs) during
screening hours on festival days. Volunteers count in the **door view** at
`/door` on the staff console (`apps/admin/app/components/door/AdminDoorCounter.vue` +
`AdminDoorScreening.vue`): "Joined the
queue" / "Let in" (seats count down automatically), undo, fix, wake lock,
admin "Clear counts". Details in CLAUDE.md "Step 8" and "Door view". Still
to test with real logins at a door; `?queues=sample` shows pretend queues for demos.

**Before launch:**
- Real screening and event times. All current times are **samples**
  (including the new Writers Workshop, Wed 4 Nov 3 PM).
- Host film posters, sponsor logos and jury photos ourselves. They're still
  hot-linked from AFRIFF's site (the masterclass graphics are now in
  `apps/pwa/public/masterclasses/`, except Producing and Animation).
- AFRIFF to confirm the 3 "How to attend" sections marked CONFIRM; swap in
  the official logo (`packages/theme/public/`); add bios for Erin G. Wesley, Chuka
  Ejorh and Tunde Babalola (left empty rather than invented).
- Hosting decision above.
- PWA: done (see "How the PWA works"). Check on a real Android and iPhone
  after deploying: Add to Home Screen, open in airplane mode, turn data back
  on and watch "Back online", and that a later deploy arrives after closing
  and reopening the installed app.
- Press **Publish to app** once after deploying, so `published/version`
  exists (until then each visit reads the whole bundle).
- Known gap: approving an old editor request overwrites newer live edits to the same item.

**Worth a technical review:** firestore.rules (especially the public
`usage` writes), behaviour on slow 3G and cheap Android (masterclass
graphics are ~250–350 KB each; consider smaller copies), quotas on the free
Firebase plan at festival scale (now that phones read Firestore directly, see §5).
Automated tests: `npm run test:accounts` (attendee accounts) and
`npm run functions:test` (afriff.com sync).

**Out of scope (agreed):** ticketing, other festivals, rankings and voting,
colour themes. (Push notifications were added on 26 Oct; attendee accounts on
26 Oct, pending AFRIFF's approval.)
