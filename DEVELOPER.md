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
| Vercel project `afriff-app` | Hobby plan = owner only for now; deploys go through the owner until it moves to Pro |

There are **no secrets or `.env` files**. The Firebase web config in
`src/admin/firebase.js` is the public kind; access is controlled by
`firestore.rules`.

## 2. Run it locally
Requires Node.js 20+.
```
npm install
npm run dev        # http://localhost:5173 (phones on the same Wi-Fi: http://<laptop-ip>:5173)
npm run build      # production build into dist/
```
Windows note: if PowerShell blocks `npx`, use `npx.cmd`. Don't change the
execution policy on the owner's laptop.

**Testing switches** go in the address *before* the `#`:
- `?now=2026-11-01T17:15` acts as if it's that Lagos time (countdown, timeline red line, queues).
- `?welcome=1` shows the first-open welcome cards again.
- `?share=1` lets the dev build send anonymous usage counts (it never sends otherwise).

## 3. Stack and shape
- **React 19 + Vite 8, plain JavaScript** (no TypeScript), icons from
  `lucide-react`, font Manrope. No router library: hash routes (`#/film/<id>`)
  in `src/lib/router.js`.
- **Colours** live only in `src/theme.css` (CSS variables). Mobile-first, max width 520px.
- **Admin console is lazy-loaded** (`src/admin/`), so attendees never download
  Firebase. Attendee bundle ≈ 108 KB gzipped. Keep it that way: no Firebase
  SDK imports outside `src/admin/`.

```
src/
  screens/     attendee pages (Home, Programme, FilmPage, EventPage, MyFestival, Queues, Venues, News, JuryPage)
  components/  shared UI (header/nav, bottom sheets, sponsor marquee, jury, events)
  data/        built-in festival data: programme.js, events.js, jury.js
  lib/         liveData (published data), store (phone storage), queues, alerts, usage, plan, format, now, router
  admin/       console: schema.js drives every form/list, data.js (save/approve/import/backup),
               Publish, Reports, DoorCounter, Team, Login
api/festival.js  Vercel serverless relay (see below)
firestore.rules  database security rules
```

## 4. How data flows (the important bit)
1. **Firestore is the master copy.** The team edits films, screenings,
   events, venues, news, sponsors, jury and How to attend in the console.
   Editors' changes wait in `changes` for an admin to approve.
2. **Publish to app** (admins) packs everything into one document,
   `published/current`.
3. **`/api/festival`** (Vercel function) reads that one doc and serves it
   with CDN caching (`s-maxage=60`), so ~1 database read per minute in total.
   Reason: the free Firestore Spark plan allows 50k reads a day.
4. **Phones** (`src/lib/liveData.js`) cache it in localStorage
   (`afriff-data-v1`) and check for a newer version on start, every 5 min and
   on reopen. If there's nothing published, or the relay fails, they fall
   back to Firestore REST and then to the built-in data in `src/data/`.

Rules of the road:
- **Never overwrite database items with the built-in copy.** The console's
  "Add missing festival data" only adds missing items and missing fields.
- To add a field: add one line to `src/admin/schema.js`. The form, list and
  import pick it up. Then read the field in the attendee screen.
- **`firestore.rules` is not deployed automatically.** Paste it into
  Firebase console → Firestore → Rules → Publish whenever it changes.

Other data on phones: plans, Seen it and star ratings are in localStorage
`afriff-my-v1` (no accounts, by design). Anonymous usage counts go to
`usage/{randomDeviceId}`, at most every 30 min, with an opt-out switch in My
Festival. The admin Reports page reads them.

## 5. Deploying
Currently manual, from the owner's laptop: `npx.cmd vercel deploy --prod --yes`.
`.vercelignore` keeps `reference/` (design screenshots, not in the repo)
out of uploads. Once the Vercel plan allows collaborators, connecting the
GitHub repo for automatic deploys and preview links is the obvious next step.

## 6. What's left / what to check
**Build step 8, live queues:** `src/lib/queues.js` is still a *sample
feed*. The door counter (`src/admin/DoorCounter.jsx`) already writes real
counts to `queues/{screeningId}` (using `increment()`, offline-safe).
Swap `queues.js` to read those counts without blowing the read quota
(e.g. one summary doc or the relay), and no screen code should need to change.

**Before launch:**
- Real screening and event times. All current times are **samples**.
- Host posters, sponsor logos, jury photos and masterclass graphics
  ourselves. They're currently hot-linked from AFRIFF's site.
- AFRIFF to confirm the 3 "How to attend" sections marked CONFIRM; swap in the official logo (`public/logo.svg`).
- Vercel Hobby is non-commercial. Decide on Pro.
- PWA bits: there's no web manifest or service worker yet ("add to home screen", offline).
- Known gap: approving an old editor request overwrites newer live edits to the same item.

**Worth a technical review:** firestore.rules (especially the public
`usage` writes), behaviour on slow 3G and cheap Android, quotas on the free
Firebase plan at festival scale, and error handling in `api/festival.js`.
There are no automated tests yet.

**Out of scope (agreed):** ticketing, attendee accounts and sign-in, push notifications,
other festivals, rankings and voting, colour themes.
