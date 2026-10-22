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
- `?now=2026-11-03T13:00` acts as if it's that Lagos time. Drives the
  countdown, the daily highlight on Home (1–7 Nov), the timeline's red line
  and queues. Try `?now=2026-10-25T10:00` (before), `?now=2026-11-03T13:00`
  (festival day), `?now=2026-11-08T10:00` (after).
- `?welcome=1` shows the first-open welcome cards again.
- `?share=1` lets the dev build send anonymous usage counts (it never sends otherwise).

## 3. Stack and shape
- **React 19 + Vite 8, plain JavaScript** (no TypeScript), icons from
  `lucide-react`, font Manrope. No router library: hash routes (`#/film/<id>`)
  in `src/lib/router.js`.
- **Colours** live only in `src/theme.css` (CSS variables). Mobile-first, max width 520px.
- **Admin console is lazy-loaded** (`src/admin/`), so attendees never download
  Firebase. Attendee bundle ≈ 111 KB gzipped. Keep it that way: no Firebase
  SDK imports outside `src/admin/`.

```
src/
  screens/     attendee pages (Home, Programme, FilmPage, EventPage, MyFestival, Queues, Venues, News, JuryPage)
  components/  shared UI (header/nav, bottom sheets, sponsor marquee, jury, events, DailyHighlight)
  data/        built-in festival data: programme.js, events.js, jury.js
  lib/         liveData (published data), store (phone storage), queues, alerts, usage, plan,
               today (what's on a festival day), format, now (clock + test clock), router
  admin/       console: schema.js drives every form/list, data.js (save/approve/import/backup),
               Publish, Reports, DoorCounter, Team, Login
public/masterclasses/  AFRIFF's official masterclass graphics, served by the app itself
api/festival.js        Vercel relay for published festival data (see below)
api/queues.js          Vercel relay for live queue counts
firestore.rules        database security rules
```

## 4. How data flows (the important bit)
1. **Firestore is the master copy.** The team edits films, screenings,
   events, venues, news, sponsors, jury and How to attend in the console.
   Editors' changes wait in `changes` for an admin to approve.
2. **Publish to app** (admins) packs everything into one document,
   `published/current`.
3. **`/api/festival`** (Vercel function) reads that one doc and serves it
   with CDN caching (`s-maxage=60, stale-while-revalidate=10`), so ~1
   database read per minute in total. Reason: the free Firestore Spark plan
   allows 50k reads a day. (The stale window used to be 600 s; with little
   traffic that made a publish take 5+ minutes to show. Keep it short.)
4. **Phones** (`src/lib/liveData.js`) cache it in localStorage
   (`afriff-data-v1`) and check for a newer version on start, every 5 min and
   on reopen. If there's nothing published, or the relay fails, they fall
   back to Firestore REST and then to the built-in data in `src/data/`.

Rules of the road:
- **Never overwrite database items with the built-in copy.** The console's
  "Add missing festival data" (`importAll` in `src/admin/data.js`) only:
  adds items whose ID is missing; fills fields an item doesn't have at all;
  and swaps values listed in `REPLACED_LINKS` / `REPLACED_VALUES`
  (`src/data/events.js`) **only while the database still holds exactly that
  old value**. That last rule is how corrections we ship (e.g. new
  masterclass graphics, a changed speaker) reach the database without ever
  touching something the team typed. Add to those lists when you correct
  built-in data that's already been imported.
- To add a field: add one line to `src/admin/schema.js`. The form, list and
  import pick it up. Then read the field in the attendee screen.
- **`firestore.rules` is not deployed automatically.** Paste it into
  Firebase console → Firestore → Rules → Publish whenever it changes.

Other data on phones: plans, Seen it and star ratings are in localStorage
`afriff-my-v1` (no accounts, by design). Anonymous usage counts go to
`usage/{randomDeviceId}`, at most every 30 min, with an opt-out switch in My
Festival. The admin Reports page reads them.

**Home** (`src/screens/Home.jsx`) changes with the Lagos date: countdown
banner + "Opening day" before 1 Nov; `DailyHighlight` (day N of 7, theme,
poster collage, counts, next up) + a "Today" list during the festival;
a thank-you banner after. Collage order lives in `src/lib/today.js`: films
ticked "Feature on Home" in the console first, then the opening film, then
films with real posters, then by start time.

## 5. Deploying and hosting
Currently manual, from the owner's laptop: `npx.cmd vercel deploy --prod --yes`.
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
phones read them through `api/queues.js` (30 s cache) once a minute on
festival days. Details in CLAUDE.md "Step 8". Still to test with real
logins at a door; `?queues=sample` shows pretend queues for demos.

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
- PWA bits: there's no web manifest or service worker yet ("add to home
  screen", offline). The brief requires add-to-home-screen.
- Known gap: approving an old editor request overwrites newer live edits to the same item.

**Worth a technical review:** firestore.rules (especially the public
`usage` writes), behaviour on slow 3G and cheap Android (masterclass
graphics are ~250–350 KB each; consider smaller copies), quotas on the free
Firebase plan at festival scale, and error handling in `api/festival.js`.
There are no automated tests yet.

**Out of scope (agreed):** ticketing, attendee accounts and sign-in, push notifications,
other festivals, rankings and voting, colour themes.
