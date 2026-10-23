# AFRIFF Festival Companion: developer handover

Welcome! This is a working app, already live, not a spec to rebuild.
Your job is to make sure it's technically solid for the festival
(Lagos, **1–7 Nov 2026**) and to finish what's left.

- **Live app:** https://afriff-app-mu.vercel.app
- **Admin console:** https://afriff-app-mu.vercel.app/#/admin (not linked from the app)
- **Full decision log:** [CLAUDE.md](CLAUDE.md). It records why each thing
  is the way it is, so read it before changing behaviour. Keep it updated:
  the product owner and Claude Code both rely on it.

## 1. Access you should have
| What | How you get it |
|---|---|
| Code (GitHub, private repo) | Collaborator invite from the product owner |
| Firebase project `afriff-app` (Firestore + Auth) | Added as **Editor** under Project settings → Users and permissions |
| Admin console role | Sign up at `/#/admin`; an admin sets your role to *admin* on the Team page |
| Vercel project `afriff-app` | Hobby plan = owner only for now; deploys go through the owner (see §5) |

There are **no secrets or `.env` files**. The Firebase web config in
`app/admin/firebase.ts` is the public kind; access is controlled by
`firestore.rules`.

## 2. Run it locally
Requires Node.ts 20.19+ (22 recommended).
```
npm install
npm run dev        # http://localhost:3000 (phones on the same Wi-Fi: http://<laptop-ip>:3000)
npm run build      # production build into .output/ (what Vercel runs)
npm run preview    # run that production build locally, with the service worker (offline, install)
npm run typecheck  # TypeScript check of the app and the server relays (run before every commit)
```
Windows note: if PowerShell blocks `npx`, use `npx.cmd`. Don't change the
execution policy on the owner's laptop.

The offline/installable parts (service worker) only run in a production
build: use `npm run build` then `npm run preview` to try them. To try them in
`npm run dev`, set `pwa.devOptions.enabled: true` in `nuxt.config.ts`.

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
- **Nuxt 4 (Vue 3), SPA mode (`ssr: false`), TypeScript throughout**
  (strict, plus `noUncheckedIndexedAccess`). Every `.vue` file uses
  `<script setup lang="ts">` with typed `defineProps<…>()` /
  `defineEmits<…>()` / `defineModel<…>()`; every module is `.ts`. There are
  no `.js` files in `app/` or `server/`; plain JavaScript is only for
  throwaway scripts. Shared shapes live in `app/types/festival.ts`
  (Film, Screening, FestivalEvent, Venue, NewsItem, JuryMember, Queue…) and
  `app/admin/types.ts` (Profile, ChangeDoc, board records). Tailwind CSS 4, icons from `lucide-vue-next`, fonts Archivo
  (headings) + Onest (text), bundled with the app so they work offline.
  Real addresses (`/film/<id>`, `/programme/films`, `/admin/data/films`);
  old `#/...` links are forwarded by `app/middleware/old-hash.global.ts`.
- **PWA** via `@vite-pwa/nuxt` (`nuxt.config.ts` → `pwa`): web manifest and
  icons, a service worker that keeps the app shell, fonts and icons on the
  phone (every page opens with no signal; images are cached as they're
  seen), an "Install the AFRIFF app" prompt on Android/Chrome, an "Add to
  Home Screen" guide on iPhone, an offline banner, and a "new version ready
  → Reload" toast. All in `app/components/app/`.
- **Design tokens** (colours, type sizes, radii, shadows) live only in
  `app/assets/css/main.css`: the AFRIFF navy + gold system from the earlier
  attendee build. Venue dot colours stay with the venues in `app/data/programme.ts`.
  Mobile-first, max width 36rem.
- **Admin console is lazy-loaded** (`app/pages/admin/` → `app/admin/`), so
  attendees never download Firebase (it's also kept out of the offline
  download). Attendee JS ≈ 140 KB gzipped. Keep it that way: no Firebase SDK
  imports outside `app/admin/`.

```
app/
  pages/        one file per address: index (Home), programme/[[tab]], film/[id], event/[id],
                my (My Festival), queues, venues, news, jury, admin/[...path], door (volunteers)
  components/   ui/ (buttons, sheets, chips, badges), app/ (header, bottom bar, PWA prompts,
                welcome cards, sponsor marquee), festival/ (posters, rows, jury, daily highlight),
                programme/ (day picker, venue chips, timeline, My plan sheet, search)
  layouts/      default (attendee frame) and admin
  data/         built-in festival data: programme.ts, events.ts, jury.ts
  lib/          liveData (published data), store (phone storage), queues, alerts, usage, plan,
                today (what's on a festival day), format, now (clock + test switches), dayItems,
                programmeMemory
  admin/        console: schema.ts drives every form/list, data.ts (save/approve/import/backup),
                publish.ts, reports.ts, board.ts (door counts) + the Admin*.vue screens
  plugins/festival.client.ts   loads the saved copy, checks for new data, starts live queues
  assets/css/main.css          design tokens and shared styles
server/api/festival.get.ts     relay for published festival data (see below)
server/api/queues.get.ts       relay for live queue counts
public/masterclasses/          AFRIFF's official masterclass graphics
public/brand/, public/*.png    official AFRIFF emblem and the app icons
firestore.rules                database security rules
```

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
3. **`/api/festival`** (Nuxt server route, a Vercel function when deployed) reads that one doc and serves it
   with CDN caching (`s-maxage=60, stale-while-revalidate=10`), so ~1
   database read per minute in total. Reason: the free Firestore Spark plan
   allows 50k reads a day. (The stale window used to be 600 s; with little
   traffic that made a publish take 5+ minutes to show. Keep it short.)
4. **Phones** (`app/lib/liveData.ts`) cache it in localStorage
   (`afriff-data-v1`) and check for a newer version on start, every 5 min and
   on reopen. If there's nothing published, or the relay fails, they fall
   back to Firestore REST and then to the built-in data in `app/data/`.

Rules of the road:
- **Never overwrite database items with the built-in copy.** The console's
  "Add missing festival data" (`importAll` in `app/admin/data.ts`) only:
  adds items whose ID is missing; fills fields an item doesn't have at all;
  and swaps values listed in `REPLACED_LINKS` / `REPLACED_VALUES`
  (`app/data/events.ts`) **only while the database still holds exactly that
  old value**. That last rule is how corrections we ship (e.g. new
  masterclass graphics, a changed speaker) reach the database without ever
  touching something the team typed. Add to those lists when you correct
  built-in data that's already been imported.
- To add a field: add one line to `app/admin/schema.ts`. The form, list and
  import pick it up. Then read the field in the attendee screen.
- **`firestore.rules` is not deployed automatically.** Paste it into
  Firebase console → Firestore → Rules → Publish whenever it changes.

Other data on phones: plans, Seen it and star ratings are in localStorage
`afriff-my-v1` (no accounts, by design). Anonymous usage counts go to
`usage/{randomDeviceId}`, at most every 30 min, with an opt-out switch in My
Festival. The admin Reports page reads them.

**Home** (`app/pages/index.vue`) changes with the Lagos date: countdown
banner + "Opening day" before 1 Nov; `DailyHighlight` (day N of 7, theme,
poster collage, counts, next up) + a "Today" list during the festival;
a thank-you banner after. Collage order lives in `app/lib/today.ts`: films
ticked "Feature on Home" in the console first, then the opening film, then
films with real posters, then by start time.

## 5. Deploying and hosting
Currently manual, from the owner's laptop: `npx.cmd vercel deploy --prod --yes`.
Vercel builds it with `nuxt build` (`vercel.json` tells Vercel the project
is now Nuxt, not Vite) and runs the two `/api` relays as
functions. The first deploy after the move from React is the one to watch:
check `/`, `/film/lady`, `/admin`, `/api/festival` and `/api/queues` answer.
`.vercelignore` keeps `reference/` (design screenshots, not in the repo)
out of uploads. Uploads with the graphics take a few minutes.

**Open decision: Vercel vs Firebase Hosting.** Vercel Hobby is
non-commercial, so it can't be the launch host as is. Options under
discussion with the owner:
- Vercel Pro (~$20 per member per month) + Firebase Blaze for uploads; or
- Firebase Hosting on the **Blaze** plan only (one bill, no seat fees; the
  relay would move to a Cloud Function or Hosting rewrite). Spark hosting
  alone allows ~360 MB/day transfer, too little for festival traffic.
Whichever is chosen, set a Blaze **budget alert**, and point the final
address (e.g. app.afriff.com) at it before the QR codes are printed.

## 6. What's left / what to check
**Live queues (step 8, built 22 Oct):** volunteers' taps are bundled and
saved to one record per venue per day (`queueDays/{date}/venues/{venue}`);
phones read them through `server/api/queues.get.ts` (30 s cache) once a minute on
festival days. Volunteers count in the **door view** at `/door`
(`app/admin/AdminDoorCounter.vue` + `AdminDoorScreening.vue`): "Joined the
queue" / "Let in" (seats count down automatically), undo, fix, wake lock,
admin "Clear counts". Details in CLAUDE.md "Step 8" and "Door view". Still
to test with real logins at a door; `?queues=sample` shows pretend queues for demos.

**Before launch:**
- Real screening and event times. All current times are **samples**
  (including the new Writers Workshop, Wed 4 Nov 3 PM).
- Host film posters, sponsor logos and jury photos ourselves. They're still
  hot-linked from AFRIFF's site (the masterclass graphics are now in
  `public/masterclasses/`, except Producing and Animation).
- AFRIFF to confirm the 3 "How to attend" sections marked CONFIRM; swap in
  the official logo (`public/logo.svg`); add bios for Erin G. Wesley, Chuka
  Ejorh and Tunde Babalola (left empty rather than invented).
- Hosting decision above.
- PWA: done (manifest, offline service worker, install prompt, iPhone guide,
  update toast). Check "Add to Home Screen" on a real Android and iPhone after deploying.
- Known gap: approving an old editor request overwrites newer live edits to the same item.

**Worth a technical review:** firestore.rules (especially the public
`usage` writes), behaviour on slow 3G and cheap Android (masterclass
graphics are ~250–350 KB each; consider smaller copies), quotas on the free
Firebase plan at festival scale, and error handling in `api/festival.ts`.
There are no automated tests yet.

**Out of scope (agreed):** ticketing, attendee accounts and sign-in, push notifications,
other festivals, rankings and voting, colour themes.
