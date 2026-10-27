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
npm run test:accounts  # attendee accounts + every form's input checks + link safety (pretend database, ~1 s)
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
                profile (account + switches), queues, venues, news, jury; admin/[...path] + door only forward to the console
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
most every 30 min, with an opt-out switch on Profile. The admin Reports
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
Attendees opt in with **"Alerts on this phone"** (News page and Profile,
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
- **Changed screenings/events at Publish** (27 Oct): `AdminPublish.vue` diffs
  the collections against `published/current` with `changeAlerts()`
  (`apps/admin/shared/changeAlerts.ts`, also used for the item form's "Tell
  attendees?" wording): date/time/venue/screen/place/status changed → one
  proposed alert per item, skipped if a news item linked to it is new since the
  last publish. Ticked ones are written to `news/alert-<base36>` (`push: true`,
  `urgent: true`) right before `publishToApp()`, then `/api/push/send` sends
  them like any ticked item. ≤3 changes: pre-ticked; more: none pre-ticked.
- **Personal pushes (invitations)** (27 Oct): `/api/push/subscribe` also takes
  `idToken` (the attendee's Firebase ID token, sent in the text/plain body, so
  still no preflight); verified → `pushTokens/{sha256(token)} = {uid, token,
  at}` (`server/utils/pushDevices.ts`, Admin SDK only, no client rule); no or
  bad idToken, or unsubscribe → that doc deleted. Phone side: `setAlertsOwner()`
  in `apps/pwa/app/lib/push.ts`, called from `lib/account.ts` on sign-in,
  resume, log-out and delete; `refreshAlerts()` re-links if the saved
  `afriff-push.uid` differs. `server/invites/logic.ts` calls
  `pusher.toPeople(uids, invitePush())` after each batch Brevo accepted
  (skipped when scheduled), `sendEach` per phone, gone tokens deleted;
  `recipients/{key}.pushedAt` + `invites/{id}.pushed`. Console deletion of an
  account deletes its `pushTokens` too.
- **iPhone**: web push only works in the app added to the Home Screen
  (iOS 16.4+); in Safari the switch is replaced by that instruction.
- **Testing locally**: no service worker in `npm run dev`, so the switch is
  hidden there. Use `npm run build` + preview with both settings below, or
  test on the deployed apps. FCM topic management through the Admin SDK is
  the current Google-supported route (Google retires older Admin SDK versions'
  topic calls after 29 Sep 2027; keep `firebase-admin` up to date after that).

### Attendee accounts (26 Oct 2026; reworked 27 Oct: Firebase email + password)
**Pending AFRIFF's written approval** (it reverses the brief's "no sign-up").
- **Firebase does the sign-in itself**, straight from the phone, like DP
  Fitness: `createUserWithEmailAndPassword`, `signInWithEmailAndPassword`,
  `sendPasswordResetEmail` (Firebase's own reset email with a link; its "back
  to the app" link needs the attendee domain in Authentication → Settings →
  Authorized domains, else it's sent without one), Firebase's own protection
  against guessing (`auth/too-many-requests`). `apps/pwa/app/lib/firebase/account.ts`
  (`firebase/auth` via `initializeAuth`, lazy); plain-language errors and the
  phone-side state in `lib/account.ts`. Passwords: 8+ characters (client
  check; Firebase's own minimum is 6). The staff app's server takes **no**
  part in signing in. (A 4-digit PIN checked by our own server was built on
  26 Oct and replaced the next day.)
- **One login pool with the team**: attendees and staff are both Firebase
  email/password users. Rights come only from `users/{uid}.role`; attendee
  records only from `attendees/{uid}`. A team member can also have an attendee
  record. Sign-up = `createLogin` (Firebase user + displayName "First Last")
  then the record (`finishDetails`; on permission-denied it refreshes the ID
  token and tries once more). If the record doesn't save, the details are
  kept in localStorage `afriff-signup-details` and the page shows "Almost
  done" + Try again (`finishSetup`), never the name form. A login with no
  record is finished from those kept details, else from displayName (split
  at the last space, emails off); only with neither (e.g. a staff login)
  does it show "One more step: your name".
  Deleting from the app keeps the Firebase user if `users/{uid}` exists.
  An attendee can log into the staff app too, but only reaches "No access yet".
- **Browsing never needs an account.** Saving does: `useFestival().toggleScheduled`
  / `toggleWatched` (`lib/store.ts`) call the guard set with `guardSaves()` in
  `plugins/account.client.ts`. With no account and `canSaveNow()` false, the
  intent is kept in sessionStorage and the phone goes to
  **`/auth?redirect=<page>&why=plan|seen`** ("Not now" closes it). Signing up
  or logging in applies the intent (`applySave`) and goes back. `canSaveNow()`
  is true when signed in, or when `settings/attendeeAccounts.requireSignUp` is
  false (console switch, read once at start). Offline with no account: nothing
  is saved; `notify()` (`lib/notice.ts`, `AppNotice.vue`) says "You're offline ·
  Connect to the internet to sign in and add “<title>” to My Festival." Signed-in
  people save offline as usual (queued for the account). `/privacy` is open to
  everyone.
- **Offline status (27 Oct, user request)**: `components/app/ConnectionStatus.vue`,
  rendered once in `app.vue` so it's on every page: a 28 px bar fixed to the top
  ("No internet connection · You can still browse", then "Back online" for
  2.4 s). It sets `--offline-bar` on `<html>`; `.app`, `.with-status` (sign-up,
  privacy) and the sticky `.header` move down by it, so nothing is covered.
  The attendee app no longer uses the shared `AppOfflineBanner` (the staff app
  still does). On `/auth` offline, the submit buttons wait for a connection.
- **Records** (all written by the phone, all checked in `firestore.rules`):
  `attendees/{uid}` (the "App users" list: names, email, `marketing`,
  `optInAtSignUp` 0/1, `consentText`, times, `createdDay` (Lagos); the person
  may only change their emails choice); `attendeePlans/{uid}` (My Festival;
  owner only, while the record exists); `settings/attendeeAccounts` (readable
  by all). Admins read `attendees`; editors and volunteers can't. (Until 27 Oct
  records also had `brevo` / `brevoError` and there was a `brevoRemovals`
  collection, for the old Brevo list; all gone.)
- **My Festival sync** (`lib/planSync.ts`): the phone's copy (`lib/store.ts`)
  stays what screens use; changes are written to `attendeePlans/{uid}` 1.5 s
  after the last tap (queued offline by the SDK); a live listener brings other
  phones' changes. One-sided changes win (removals stick), two-sided ones are
  merged (`mergePlans`); logging in adds the phone's existing picks. Log out
  clears the plan from that phone (warns first if changes haven't reached the
  account). "Delete my account" asks for the password again (Firebase requires
  a recent sign-in) and deletes the records, then the login.
- **Staff app's server: admins only**, a job that needs a key a browser can't
  hold (`apps/admin/server/accounts/`, routes `server/api/attendees/*`):
  `delete` (records + Firebase login, kept for team members; needs
  `NUXT_FIREBASE_SERVICE_ACCOUNT`). `setup` tells the console what's set up.
  Admin routes use `adminRoute()` (`server/utils/accounts.ts`), which checks
  the admin and passes their uid. Tests: `npm run test:accounts`.
- **Festival emails (27 Oct, user decision; replaces "Send to Brevo")**: admins
  write an email in the console (`/admin/emails`, `AdminEmails.vue`: subject,
  plain-text message, optional button text + https link, live preview, "Send me
  a test", "Send to N people") and the staff app's server sends it to every
  `attendees/{uid}` with `marketing == true`. Brevo only delivers (its batch
  `POST /v3/smtp/email` with `messageVersions`); no contact list is kept at
  Brevo, so nothing to keep in step. Code: `apps/admin/shared/festivalEmail.ts`
  (checks + the HTML, shared by the preview and the server, everything typed is
  escaped incl. `{ }` so Brevo's template language never sees it),
  `server/emails/` (`logic.ts` with a pretend database and Brevo in
  `test/emails.test.ts`; `brevo.ts`; `firestoreStore.ts`; `links.ts`), routes
  `server/api/emails/{setup,test,send,continue,unsubscribe}`. Sending: batches
  of 50 in uid order (`where marketing == true orderBy __name__`, no composite
  index), `emails/{id}.cursor` after each batch so nobody gets it twice; each
  call sends ~8 s then the console calls `/continue` while `more`; a 90 s
  `lockUntil` (transaction) means one sender at a time; Brevo refusing (free
  plan ≈300/day, bad key, down) sets `paused` + `error`, "Continue sending"
  resumes; an address Brevo rejects (400) is retried alone, skipped and listed
  in `failures` (3 in a row = pause instead). `emails/*` is admin-read, written
  only by the server (Admin SDK). Every email: "Hi <first name>," + footer with
  the person's unsubscribe link `<staff app>/api/emails/unsubscribe?u=<uid>&t=
  <HMAC>`; the secret is derived from the service-account private key
  (`serverSecret()`), so no extra setting (a new key = old links stop working
  and explain the app's switch instead). GET shows a confirm page (link scanners
  open links), POST sets `marketing: false`, `consentText: ''`,
  `marketingChangedAt` (10 s limit, then "try again"). `/api/*` is in the
  shared service worker's `navigateFallbackDenylist`, so the page is never
  replaced by the app shell. No `List-Unsubscribe` header yet (Brevo's batch
  docs list no per-person headers, only to/subject/html/params); Gmail/Yahoo only require one-click
  for senders of 5,000+/day, so revisit if AFRIFF gets that big. Settings
  (staff project): `NUXT_BREVO_API_KEY` (secret), `NUXT_EMAIL_FROM_ADDRESS`
  (must be a sender / authenticated domain in Brevo), optional
  `NUXT_EMAIL_FROM_NAME` (default AFRIFF), `NUXT_EMAIL_REPLY_TO`.
- **Console**: `/admin/attendees` (admins only): the "Require an account to
  save to My Festival" switch, what's set up, the list with search, CSV of all
  users / subscribers (formula-safe), delete account. `/admin/emails`: Festival
  emails (above). Reports →
  **Sign-ups**: per Lagos day and opted-in, counted with Firestore aggregation
  queries (≈1 read per day shown).
- **iPhone install-first** (27 Oct, as in DP Fitness's `access-code.vue`):
  `components/app/InstallFirst.vue`, shown by `layouts/default.vue` when
  `useInstallApp().method === 'ios'` (iPhone/iPad, not standalone) until
  "Continue on the web" (localStorage `afriff-ios-web`, also snoozes the install
  toast). Welcome cards wait for it. `?install=ios` forces it for testing.
- **Known**: the layout re-keys `<main>` when newer published data arrives
  (`dataVersion`), which closes an open bottom sheet (e.g. the delete
  confirmation) if a publish lands while it's open. Pre-existing; rare.

### Continue with Google (27 Oct 2026, user request: "like DP Fitness")
- **Same approach as DP Fitness** (`DPfitPWA/apps/pwa/app/lib/datasource/firestore.ts`
  `signInWithGoogle` / `resumeSignIn`): `signInWithPopup` with
  `prompt: 'select_account'`; `signInWithRedirect` when `navigator.standalone`
  (iPhone Home Screen app: a pop-up opens in Safari and never reports back) or
  when the pop-up is blocked; the return trip is finished by `getRedirectResult`.
  Differences from DP: AFRIFF lets Google **make** accounts (DP deletes new ones
  and sends them to an access code), and AFRIFF has self-service delete.
- **Code**: `apps/pwa/app/lib/firebase/google.ts` (lazy; `googleSignIn`,
  `googleReturn`, `confirmWithGoogle`), plain words + the flow in
  `lib/account.ts` (`continueWithGoogle`, `resumeGoogle`, `googleSignInHere`,
  `backFromGoogle`), button in `pages/auth.vue` (top of both tabs, "or use your
  email" under it), `components/account/GoogleMark.vue` (the G). sessionStorage
  `afriff-google-pending` = the page is away at Google (+ the emails box), so
  the return shows "Opening Google…" and a lost trip says "didn't finish".
- **First Google sign-in** = "Finish signing up" (user decision 27 Oct, so the
  emails consent is asked explicitly): `afterGoogle` throws `AccountProblem`
  reason `details` with `known` = Google's `given_name` / `family_name` (else
  displayName split at the last space), the account's email, and `marketing` =
  whether the email form's box was ticked before tapping. `auth.vue` shows the
  `details` form with a Google heading, the email, the names (editable), the
  box (unticked unless ticked before), the full privacy note and "Create my
  account"; red only if a name fails `nameProblem`. The record is written only
  on that button (`finishDetails` → `finishWith`), so `marketing`,
  `optInAtSignUp` and `consentText` are what they chose, as for email sign-ups.
  "Not now" = `cancelDetails` (signed out; the Firebase login stays, with no
  record, and the next Google tap shows the step again). Same record shape,
  so **no rules change**. `?redirect=` survives the step (`leave()`).
- **Same email, two ways in**: Firebase joins Google to an existing password
  login for **Gmail** addresses (same uid, the record and plan carry on; if that
  password login's email was never verified, Firebase **drops the password**:
  "Forgot password?" sets one again). For other addresses it refuses
  (`auth/account-exists-with-different-credential` → "already has an AFRIFF
  account with a password", + "Log in instead"). Staff logins are in the same
  pool: a staff member on a Gmail address who taps Google in the attendee app
  can lose their staff password the same way.
- **Delete my account**: `AccountProfile.signIn` ('password' | 'google', from
  `providerData`, refreshed by `resumeAccount`). Google-only accounts get
  "Confirm with Google and delete" → `reauthenticateWithPopup`; where there's no
  pop-up (Home Screen iPhone, blocked) it goes ahead only if the ID token's
  `auth_time` is under 4 min old (Firebase's limit is 5), else "log out, log in
  again with Google, then delete it straight away". `deleteAccount` now takes a
  `confirm(user)` function (`confirmWithPassword` or `confirmWithGoogle`).
- **Getting the pop-up ready**: `attendeeAuth(popups?)` passes
  `browserPopupRedirectResolver` to `initializeAuth` only from google.ts. If that
  creates Auth (signed-out person opening `/auth`), Firebase loads its helper
  iframe from the auth domain at once on phones/Safari, so the tap opens the
  window inside the user gesture (otherwise iOS blocks it). Signed-in starts don't
  load it. Size: +≈4 KB gz in the account chunk (Firebase ships auth as one
  module), +≈7 KB gz all told.
- **Where it's hidden**: Instagram / Facebook / TikTok / Snapchat / LinkedIn /
  Android WebView browsers (Google refuses them: a note says to open Chrome or
  Safari); the Home Screen iPhone app while `authDomain` isn't the app's own host
  (Safari's storage partitioning loses the redirect result otherwise).
- **Hosting bits** (`apps/pwa/nuxt.config.ts` routeRules): `Cross-Origin-Opener-Policy:
  same-origin-allow-popups` on every page (as DP, so Firebase can close the
  pop-up; Chrome still logs Google's own report-only "would block the
  window.closed call" warnings, harmless), and `/__/auth/**` proxied to
  `https://<projectId>.firebaseapp.com/__/auth/**` (Nitro proxy, runs in the
  Vercel function; checked in dev: handler + handler.js answer 200). `/__/` is in
  the shared service worker's `navigateFallbackDenylist`, so the handler is never
  replaced by the app shell.
- **SETUP**:
  1. Google sign-in is **already enabled** in Firebase (checked 27 Oct: the
     pop-up reaches Google's account chooser from localhost). Optional: Firebase
     console → Authentication → Sign-in method → Google → the public-facing name
     and support email Google shows.
  2. Authorized domains must list the attendee app's address (already needed for
     password resets). Without it: "Google sign-in doesn't work from this address yet".
  3. **For the iPhone Home Screen app** (else the button is hidden there):
     Google Cloud console → APIs & Services → Credentials → the OAuth client
     "Web client (auto created by Google Service)" → Authorized redirect URIs →
     add `https://<attendee address>/__/auth/handler`; then on the **attendee**
     Vercel project set `NUXT_PUBLIC_FIREBASE_AUTH_DOMAIN=<attendee address>` (no
     https; a project variable, so the staff app keeps firebaseapp.com) and
     redeploy. Test on a real iPhone (Add to Home Screen → Continue with Google).
     Preview deploys keep firebaseapp.com unless you set it there too.
- **Tested** (27 Oct): typecheck; Vercel-preset production build (header route
  and proxy present; popup code only in the account chunk); real Firebase in a
  phone-sized browser: helper iframe loads on opening `/auth`, the tap opens
  accounts.google.com; 48 checks with both Firebase modules faked (incl. the
  "Finish signing up" step: unticked, no record before the button, ticked /
  unticked there, "Not now") (new person
  from a film page's + Schedule and back with it saved, record fields, emails
  box, accented names, log out → Google again finds the account, one-word name
  → pre-filled "One more step", window closed → silent, password account →
  "Log in instead", wrong-password hint, whole-page route there and back and
  its "didn't finish", Instagram note, Home Screen iPhone hidden, delete with
  Google: cancelled / too old / done, password delete unchanged). **Not
  tested**: a real Google account end to end (Claude may not sign in), real
  phones, the iPhone Home Screen redirect for real (needs step 3).

### Profile page + header avatar (27 Oct 2026)
- `/profile` (`apps/pwa/app/pages/profile.vue`): `AccountCard` (now takes a
  `back` prop for the sign-up redirect, default `/profile`), `AlertsSwitch`
  and the anonymous-counts switch, all moved from the bottom of My Festival.
  My Festival keeps `<AccountCard v-if="!account.profile" back="/my" />`.
- Header (`AppHeader.vue`): bell, then `.header-avatar` → `/profile`;
  `UserAvatar` when signed in, lucide `CircleUserRound` when not.
- Avatars: `components/account/UserAvatar.vue` (initials until drawn) →
  `lib/avatar.ts` (seed = Firebase uid, colours, per-visit cache) →
  `lib/avatarDrawing.ts` (`@dicebear/core` + `@dicebear/notionists-neutral`,
  both 9.x: the style packages need core ^9). Generated locally, no DiceBear
  HTTP API. Lazy `import()`, ~20 KB gz chunk, precached like every other
  chunk. (7fe69bf used `@dicebear/open-peeps`, ~107 KB gz, with a named
  chunk kept out of the precache; replaced on 27 Oct by the neutral style
  and that nuxt.config setup removed.)

### Input checks on every form (27 Oct 2026)
- **The rules** (plain functions: problem in plain words, or null):
  `packages/core/src/accounts/rules.ts` for people (names in any language with
  spaces/hyphens/apostrophes, no digits; email with specific messages +
  `emailSuggestion()` "Did you mean ada@gmail.com?" for typos of well-known
  providers; new passwords (user decision 27 Oct: basic rules only): 8–128
  characters with an uppercase letter, a lowercase letter and a special
  character (not a letter, digit or space), rules shown up front as
  `PASSWORD_HINT`, message names what's missing; `confirmProblem()`), and
  `apps/admin/app/lib/checks.ts`
  for console fields, driven by `schema.ts` (new `max`, `min`, `whole`, `link:
  'web' | 'image' | 'video'` on each field) plus cross-field rules (event last
  day after first, end ≠ start, button text and link together, news banner end
  after its time). Log-in forms only check a password was typed.
- **When they show** (`packages/core/src/utils/formChecks.ts`, used by the
  sign-up page, staff login and console forms): not while typing a field for
  the first time; on leaving a non-empty field (after `LEAVE_DELAY` = 150 ms,
  so a tap on a button below still lands before the message moves it); live
  once shown, so it clears the moment it's fixed; all fields on submit, cursor
  on the first `aria-invalid`. Firebase's own field problems (`flag`) stay
  until that field changes. Messages are linked with `aria-describedby`. Forms
  are `novalidate` (no browser bubbles).
- **Links are safe twice**: the console refuses anything but http(s) (images:
  https or an app path like `/masterclasses/…`; trailers: YouTube/Vimeo), and
  phones drop bad links when published data arrives (`utils/links.ts`, used in
  `replaceProgramme` / `replaceEvents` / `replaceJury`), so a `javascript:`
  link can never become a tappable button.
- **Fixed on the way**: console number boxes kept only the last digit typed
  (AdminField turned Vue's number back into ''); the door view started counting
  at 0 seats (= Full) when the seats box was empty; hidden control characters
  pasted from Word/PDFs are dropped on save.
- Tests: `apps/admin/test/checks.test.ts` (in `npm run test:accounts`).
- The database rules still check sizes and shapes only, not these rules.

### Invitations, contacts, VIP links and guest lists (27 Oct 2026, PM brief)

Editors prepare invitations, **only admins send** (enforced in the server
routes). The email is **ours** (`renderInvite`); Brevo only delivers it. No
Brevo templates (user decision 27 Oct). Decisions and the PM's setup steps: CLAUDE.md "VIP
invitations, contacts and guest lists". No QR check-in this festival.

**Data** (Firestore; rules in `firestore.rules`, "Contacts, groups, VIP links, invitations"):
- `attendees/{uid}`: unchanged, but **editors can now read it** (Contacts).
- `contacts/{key}`: AFRIFF's own record of a person, `key` = email lower-case
  (doc ids can't hold "/", so such emails can't be added by hand). Groups,
  `vip`, `removedFrom` (taken out by staff: a VIP link can't re-add them),
  notes; for hand-added guests (`source: 'afriff'`) also name, email and
  `agreed` (+ who/when). Staff read/write. A phone may only `set(merge)` its
  OWN email's doc with exactly `groups` (old ∪ the link's group), `vip: true`,
  `uid`, `lastLink`, `joinedAt`, and only through an active `vipLinks/{code}`.
- `groups/{id}` `{ name }`: staff. `vipLinks/{code}` `{ group, label, active }`:
  `get` for anyone (the 24-char code is the secret), list/write admins.
- `invites/{id}`: staff create/update **only while `draft`/`review`** and only
  the draft fields (`inviteFields()` in the rules). Everything after is the
  server's (Admin SDK). `invites/{id}/recipients/{key}` = the guest list
  (status queued/sent/failed, groups' names, VIP, fixedFrom, unsubscribedAt),
  admins read.
- A **contact** = `attendees` ∪ `contacts` joined by email:
  `apps/admin/shared/contacts.ts` (`mergePeople`, `resolveAudience`), shared by
  the console (live count) and the server (the real send). Consent: app users
  → `attendees.marketing`; others → `contacts.agreed` (unless `unsubscribedAt`).

**Code:**
- `apps/admin/shared/invites.ts`: invite shape (`kind`, `subject` ('' =
  `defaultSubject`), `artworkUrl`, `message` ('' = `DEFAULT_MESSAGE`), `event`),
  checks, and `renderInvite(content, guest, links)`: THE invitation email,
  per guest. Email-safe HTML: tables, inline styles, 600 px with an MSO
  wrapper for Outlook, light colour scheme, bulletproof buttons (colour on
  the cell), a small `<style>` only for phones (`.px`, `.btns`, `.btn`,
  `.title`, `.dates`), Archivo with Arial fallback, header emblem from
  `<attendee app>/pwa-192x192.png` (PNG: Outlook can't show webp). Everything
  typed is escaped. Also .ics + Google Calendar link (Lagos = UTC+1).
- `apps/admin/server/invites/`: `logic.ts` (send / new / resend / continue /
  cancel / fix / stats / test / unsubscribe; batches of 50, 8 s per call,
  90 s lock, pause on Brevo refusals; same pattern as `server/emails/`),
  `brevo.ts` (batch send, each `messageVersion` with its own subject and HTML;
  `scheduledAt` + `batchId` (UUID) and `DELETE /smtp/email/{batchId}`;
  `aggregatedReport?tag=`; `statistics/events` for bounces; every email
  tagged `afriff-invite-<id>`), `links.ts` (unsubscribe links signed per
  guest AND invite), `firestoreStore.ts`, `test/` (30 tests).
- Routes `apps/admin/server/api/invites/`: `setup`,
  `count`, `test`, `stats` (admins + editors, `staffRoute` →
  `requireRole(event, ['admin','editor'])`); `send`, `continue`, `cancel`, `fix`
  (`adminRoute`); public `unsubscribe` (GET page → POST button) and
  `calendar` (?format=ics). Small HTML pages: `server/utils/emailPage.ts`
  (festival emails' unsubscribe uses it too now).
- Console: `app/lib/contacts.ts`, `app/lib/invites.ts`; pages
  `/admin/contacts`, `/admin/invites`, `/admin/invites/[id]`, `/admin/guests`
  (`?invite=` / `?group=`); components `AdminContacts`, `AdminContactSheet`,
  `AdminAddVip`, `AdminGroupSheet`, `AdminVipLinks`, `AdminInvites`,
  `AdminInvite` (owns sending + the confirm sheet), `AdminInviteForm` (draft,
  autosaved), `AdminInviteSent` (log, bounces, new-only, update),
  `AdminInvitePreview`, `AdminInviteConfirm`, `AdminGuestList` (print CSS).
  Access: `contacts` / `invites` admins + editors, `guests` admins (`lib/access.ts`).
- Attendee app: `/vip/[code]` (`pages/vip/[code].vue`, `lib/firebase/vip.ts`):
  reads the link, sends signed-out people to `/auth?redirect=/vip/<code>`
  (sessionStorage `afriff-vip-join` finishes the join on return), offers the
  emails box if they haven't ticked it. `MARKETING_CONSENT` changed in
  `packages/core/src/accounts/rules.ts`.

**Settings** (staff project, server-only): `NUXT_INVITE_FROM_ADDRESS` (e.g.
invites@afriff.app; empty = `NUXT_EMAIL_FROM_ADDRESS`), optional
`NUXT_INVITE_FROM_NAME`, `NUXT_INVITE_REPLY_TO`; plus `NUXT_BREVO_API_KEY` and
`NUXT_FIREBASE_SERVICE_ACCOUNT`. Then `npm run deploy:rules`.

**Scheduling** is Brevo's own (max 72 h ahead, so the console allows 10 min to
71 h). "New people only" on a still-scheduled invite joins the same `batchId`
and time; "Call it off" deletes the batch at Brevo and the guest list, back to
`review`.

**Tests:** `npm run test:accounts` (all staff tests). UI was checked in a
throwaway Nuxt build outside the repo with `firebase/*` aliased to in-memory
fakes and `/api/invites/*` answered by Playwright; the email rendered to
screenshots at phone and desktop width. **Not tested:** real Brevo (send,
stats, scheduling) and real inboxes (Gmail, Outlook, Apple Mail), real logins,
real phones, the rules once published.

### Superadmin (27 Oct 2026, user request)
Admins can make someone an admin but can't demote or delete an admin; only a
superadmin can. Superadmins are exactly michaelakpuofoba@gmail.com and
tithera14@gmail.com, and admins must never see the word in the console.

- **Not a stored role.** `users/{uid}.role` stays `'admin'` for them, so
  `Role`, `ACCESS`, `requireRole(['admin'])` and every `role === 'admin'`
  check are unchanged. Superadmin = the sign-in's email is in the list AND
  `email_verified` is true (unverified, anyone could create a login with that
  address). The list lives in `apps/admin/shared/team.ts`
  (`SUPERADMIN_EMAILS`) and in `firestore.rules` (`superadminEmails()`);
  `apps/admin/test/team.test.ts` fails if they differ.
- **Rules** (`firestore.rules`): `isSuperadmin()`; `isAdmin()` is now
  `isSuperadmin() || role() == 'admin'`, so a superadmin is an admin
  everywhere even without a profile. `match /users/{uid}`: superadmins update
  any profile; admins only profiles that aren't `adminProfile()` (role admin,
  or a superadmin email); role must be one of the four real ones; delete
  likewise. Create now also requires `email == request.auth.token.email`.
- **Server**: `requireRole` (`server/utils/firebaseAdmin.ts`) counts a
  verified superadmin as `'admin'` (signature and return unchanged).
- **Console**: `useAdminAuth()` has `superadmin` and `ownerCheck` (superadmin
  email, not verified yet). A superadmin's profile is shown as `admin` at once
  and, if the stored one says otherwise, written back to `admin` once per
  sign-in (`keepOwnerAdmin`; once, so old rules refusing it can't loop).
  `roleLock()` (shared/team.ts) decides which Team rows are locked; the page
  asks before making or removing an admin. `AdminOwnerCheck.vue` (Team page
  and /pending) sends Firebase's verification email (`sendEmailVerification`,
  default template) and, on "I've confirmed it", `reload()` +
  `getIdToken(true)` so the rules see `email_verified`. The header badge and
  the Superadmin tag on Team rows only render when `superadmin` is true.
- **Tests:** `npm run test:accounts` (team.test.ts). Rules: 25 cases through
  the Firebase Rules `projects.test` API (no emulator needed; published
  nothing), all pass, the old rules fail 12. UI: throwaway build with
  `firebase/*` aliased to in-memory fakes, 41 Playwright checks at 390 px.
  **Not tested:** real logins, the real verification email.
- **Deploy:** `npm run deploy:rules`, then each owner opens Team once.

### Team tabs + one login for both apps (27 Oct 2026)
- **Team page** (`AdminTeam.vue`): `UiSegmented` switch, "With a role"
  (role admin / editor / volunteer) by default, "All members" (every
  `users/*`). Rows whose role was changed this visit stay in the first tab
  until the tab changes (`changed` set). No query change: still one listener
  on `users` ordered by `createdAt`.
- **One login, two records:** the attendee app and the staff app share
  Firebase Auth. Staff rights = `users/{uid}`, attendee account =
  `attendees/{uid}` (+ `attendeePlans/{uid}`); neither implies the other.
  Staff log-in now calls `ensureProfile()` (`lib/useAdminAuth.ts`): reads
  `users/{uid}` and, only if missing, writes the same "pending" profile as
  sign-up (allowed by the existing create rule). Never writes over an
  existing profile, so it can't reset anyone's role. Failure is ignored;
  `/pending` keeps its "Finish setup" button as the fallback.
- **Tests:** throwaway build with `firebase/*` aliased to in-memory fakes
  (fake `signInWithEmailAndPassword` added), 23 Playwright checks at 390 px.

### Console search (27 Oct 2026)
- One matcher, `app/lib/search.ts`: `searchWords(query)` folds case and
  accents (NFD, strip `\p{M}`) and splits on spaces; `matchesSearch(words,
  ...texts)` is true when every word is in the joined texts (arrays and
  empty values are fine). One box, `AdminSearch.vue` (v-model + `label`,
  used as placeholder and aria-label). Use both for any new list.
- Festival data lists search `label` + `sub` + the collection's optional
  `searchAlso(d, refs)` in `lib/schema.ts` (e.g. film country / cast).
- Used in: AdminDataList, AdminTeam (per tab, `inAll` = hits only in All
  members), AdminApprovals (summary, collection title, submitter, changed
  field labels), AdminInvites, AdminGuestList (rows hidden with
  `.not-found` under `@media screen` only, so print stays complete),
  AdminAttendees, AdminContacts, AdminInviteForm's picker.
- **Tests:** `test/search.test.ts` (in `npm run test:accounts`); 25
  Playwright checks with the in-memory Firebase fakes.

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
| staff console (new, e.g. `afriff-staff`) | `apps/admin` | env `NUXT_PUBLIC_ATTENDEE_URL` (optional); `NUXT_FIREBASE_SERVICE_ACCOUNT` (push, deleting attendee accounts, festival emails; **secret**: mark Sensitive); `NUXT_BREVO_API_KEY` (**secret**) + `NUXT_EMAIL_FROM_ADDRESS`, optional `NUXT_EMAIL_FROM_NAME` / `NUXT_EMAIL_REPLY_TO` (festival emails) |

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
staff app has the three push routes (`/api/push/*`) and the admin-only
attendee routes (`/api/attendees/*`). After a deploy,
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
Automated tests: `npm run test:accounts` (attendee accounts and every form's input checks) and
`npm run functions:test` (afriff.com sync).

**Out of scope (agreed):** ticketing, other festivals, rankings and voting,
colour themes. (Push notifications were added on 26 Oct; attendee accounts on
26 Oct, pending AFRIFF's approval.)
