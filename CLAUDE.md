# AFRIFF Festival Companion — Project Brief

## How to work with me
I'm a product manager, not a developer. Explain everything in plain
language and tell me exactly what to click or run. Build one step of
the build order at a time and show me it working before moving on.
Warn me before anything that costs money. If you change a decision in
this brief, update this file so the next session knows.
I'm also using this project to learn how to build and deploy with
Claude Code, so teach as you go: say what each tool/step is and why.

## Project
AFRIFF festival companion (Africa International Film Festival, Lagos,
1–7 Nov 2026). Built from scratch in this folder. Mobile-first web app
that opens from a QR code on any phone. No App Store, no sign-up for
attendees. Must work on cheap Android phones and slow data. People
should be able to add it to their home screen.

## Reference screenshots (in the `reference` folder)
- `reference/afriff-prototype/` (home.jpg, programme.jpg): use for
  COLOURS, FONT, the HEADER, the BOTTOM NAV and the whole HOME screen.
- `reference/filmfest/` (schedule, film page, my schedule): use for the
  LAYOUT of the Programme, Film page and My Festival screens. Copy the
  structure, not its colours, logo or wording. Where FilmFest uses
  cream, we use gold.
- Don't ship the reference folder in the live app.

## Colours (save in one place so they're easy to change)
- Page background: #060A27
- Card / tile background: #0B1135
- Raised surface (chips, icon boxes, toggles): #131A48
- Card border: #20264A
- Divider lines: #1B203D
- Bottom nav background: #080B29
- Main text: #F3F3FF
- Muted text (venues, subtitles): #A4AACC
- Placeholder text: #7277A1
- Gold accent (buttons, active tab, selected items, badges): #DBA440
- Light gold (active nav label, icons, big date numbers): #E9C362
- Active nav pill: #26232E
- Alert / "Full" text: #F37B6B
- Home hero card: gradient from #0A1042 (top) to #04315B (bottom-left)
  with a soft warm glow (#24223A) top-right
- Each of the 4 venues gets its own small colour dot (pick 4 that read
  well on navy) used everywhere that venue appears.

Font: match the prototype (pick a free Google Font, e.g. Manrope, and
tell me which).

## Every screen
- Header (from prototype): AFRIFF logo + name left, bell with gold
  count badge right (opens news and alerts).
- Bottom nav (from prototype, 4 tabs): Home, Programme, Queues,
  My Festival. No Tickets tab: there's no ticketing in this version.

## Home (SIMPLIFIED 20 Oct 2026, user decision; replaces the prototype copy)
Rule: the bottom bar already reaches Programme, Queues and My Festival,
so Home doesn't repeat them, and shortcuts carry no subtext.
- News banner at the top when there's an urgent update.
- Hero: small gold eyebrow "1–7 Nov 2026 · Lagos", headline "Seven days
  of African stories on the big screen", "Opening night in" + compact
  d / h / m countdown (no seconds), ONE gold button "Explore the
  programme". (From 1 Nov this spot becomes the daily highlight, next.)
- 4 one-word icon shortcuts to things NOT in the bottom bar: Venues,
  How to attend (opens the sheet), Events, Jury.
- "Opening day" light rows: poster, title, time · venue (no
  "Filmhouse"), + to add to My Festival; opening film always included,
  shown in time order; "See all".
- "Masterclasses & events": poster-style cards (graphic or colour
  tile, short title, day); "See all". No subtext line.
- Jury row removed from Home (Jury shortcut instead; row stays on the
  Globe Awards page).
- Sponsors stay in BOTH places (user decision): top ribbon + bottom strip.
- Bottom bar: small gold dot on Queues while any queue is open.
- Also fixed: sideways rows (events strip, "More from", jury row) kept
  their 16px left margin (scroll-padding). Saved (commit 20b15b5) and
  DEPLOYED 20 Oct 2026.

DAILY HIGHLIGHT (built 20 Oct 2026; collage = team-picked AND automatic,
user decision). Home's top banner depends on the Lagos date:
- Before 1 Nov: countdown hero (above) + "Opening day" list.
- 1–7 Nov: `src/components/DailyHighlight.jsx`, "Today · Day N of 7" +
  date, day theme (DAY_THEMES) as the headline, poster collage (1 big +
  up to 4 small, last tile "+N" when more films), count chips
  (screenings / masterclasses / events, zeros hidden), "Next up" (next
  film or event to start, links to it; "That's a wrap for today.
  Tomorrow: <theme>" late; closing line on the last night), gold "See
  today" (opens the Schedule on today via `openProgrammeDay()` in
  Programme.jsx, even if another day was picked). The "Opening day"
  list becomes "Today": the next 4 films AND events still to start,
  with + buttons; "Nothing else starts today. See tomorrow" when done.
- After 7 Nov: thank-you banner + "Your watched list"; no day list.
- Collage order (`src/lib/today.js`): films ticked "Feature on Home
  (daily highlight)" in the console (new film checkbox) → the Opening
  Movie → films with a real poster → films still to come, by time.
  One tile per film; cancelled screenings left out. Counts include
  Industry items (open question settled by default; easy to change).
- Home redraws every minute. Test: ?now=2026-11-03T13:00 (day 3),
  ?now=2026-11-03T23:50 (wrap), ?now=2026-11-08T10:00 (after).
- Saved (commit c1fa9e6) and DEPLOYED 20 Oct 2026; checked live (normal
  = countdown; ?now= day 3 = daily highlight).

## Programme / Schedule (copy FilmFest "Schedule of Films" layout)
- Big title "PROGRAMME" with an icon, subtitle "Full festival
  schedule", and "Lagos" with a pin linking to the Venues page.
- Horizontal day picker: day name small on top, large date number with
  month beside it; selected day in light gold with a gold underline,
  other days faded.
- Venue chips that scroll sideways: "All venues" first, then each venue
  with its colour dot and number of screenings that day.
- Row with "N screenings", a filter chip ("Public" / "Industry"), and a
  toggle between list view and timeline view.
- List rows: large time on the left ("6:30" with "PM" under it), film
  title in bold capitals, venue dot + venue name, category in small
  capitals, poster thumbnail on the right, round "+" button to add to
  My Festival (turns into a tick when added). Live queue label under
  the venue when a queue is open.
- Search icon that opens a search for films and directors.

## Film page (copy FilmFest film page layout)
- Large poster/still at the top with rounded corners and a "Watch
  trailer" button on it (opens a YouTube link, only if one exists).
- Film title in bold capitals, then a "Seen it" button (adds to the
  watched log; shows ticked when done).
- Synopsis cut to 3 lines with "Read more".
- "Showtimes": a card per screening (big date number, month and day,
  time, venue dot + venue, tag "Public" or "Industry"), each with a
  "+ Schedule" button under it. "On afriff.com" link top-right for
  tickets.
- "Queue": live count and label (Good chance / Tight / Unlikely /
  Full); "No queues left for this film" once all showings are done.
- "Directed by": initials tile (or photo) and director name, then
  Country and Language in small labelled lines.

## My Festival (copy FilmFest "My Schedule" layout)
- Big title "MY SCHEDULE" with an icon, "N screenings over N days".
- Films grouped by day; each day heading has a "Share my day" button on
  the right (opens WhatsApp with that day's plan as text).
- Rows: poster thumbnail, time range (start to end), film title, venue
  dot + venue, round tick button on the right.
- Second section "Watched": films marked "Seen it", with an "Export to
  Letterboxd" button (downloads a CSV Letterboxd accepts).
- Small note at the bottom: "Kept on this phone. No account needed."

## Queues
Today's screenings with an open queue, sorted by start time: film,
venue, start time, people in line, seats left, label. Updates live
without refreshing.

## Venues
The 4 venues with address, colour dot and a "Directions" button that
opens Google Maps.

## Stack
Firebase (database + admin logins), hosted on Vercel. Walk me through
creating both accounts when we get there.

## Admin console (login required, same colours)
Three roles:
- Admin: everything, approves changes before attendees see them.
- Editor: add/edit films, screenings, venues, news, sponsors; needs
  approval.
- Door volunteer: can only update queue count and seats left for their
  venue, with big +1 / -1 buttons usable one-handed on a phone.

Film fields: title, poster image, trailer link (optional), synopsis,
director(s), country, language, genre, programme section (replaces
"category"), running time, year.
Screening fields: film, venue, screen, date, start time, tag
(Public/Industry), seat capacity.
Event fields (masterclasses, workshops, market, panels, galas, awards,
parties, networking): type, title, date (+ optional end date for
all-week events), start and end time, venue (or free-text place),
room/place, speaker, speaker role, speaker bio, about, access text
(e.g. "Free · registration required"), tag (Public/Industry),
link (label + URL, e.g. registration on afriff.com).
"How to attend" text: a list of sections, each with a heading, body
text and an optional link (label + URL). Editors can add, edit, reorder
and remove sections; needs approval like other edits.
(Shapes match `FILMS`, `SCREENINGS` and `HOW_TO_ATTEND` in
`src/data/programme.js`, and `EVENTS` in `src/data/events.js`.)

## Build order (one at a time, show me each working on my phone)
1. Look and layout: Home, Programme, Film page and My Festival with
   sample films (no saving yet)
2. Admin console and logins
3. Programme by day and venue, search and filters, real data
4. My Festival + Share my day
5. News and alerts
6. Sponsors and Venues
7. Watched log and Letterboxd export
8. Live queues and labels

Start with sample African films and 4 sample venues.

## Progress
(Update this section at the end of each session: what's done, what's
next, anything I need to do.)
### Decisions made (session 1, 18 Oct 2026)
- Tech: React + Vite (plain JavaScript), icons from lucide-react.
  Pages switch with `#/...` addresses (e.g. `#/film/harmattan`).
- Font: Manrope (Google Fonts).
- Colours: all in `src/theme.css`. Venue dot colours in
  `src/data/programme.js`: Filmhouse Landmark teal #3CCFB8, Filmhouse
  Twinwaters violet #8F84FF, Filmhouse The Palms blue #4DA6FF.
  Queue "Good chance" green #5FD39A (new colour).
- Queue labels: Full when 0 seats; else people-in-line ÷ seats-left
  under 0.7 = Good chance, under 1.2 = Tight, otherwise Unlikely.
- DATA FROM AFRIFF.COM (18 Oct 2026), in `src/data/programme.js`: all
  68 official-selection films (title, director, country, language,
  genre, runtime, year, programme section, poster), the 3 real venues,
  day themes, news and partner names.
  - CHANGED FROM BRIEF: 3 venues, not 4. afriff.com lists only Filmhouse
    Landmark, Filmhouse Twinwaters and Filmhouse The Palms.
  - Synopses are short one-liners written for the app, not copied from
    afriff.com (that text belongs to AFRIFF/filmmakers). AFRIFF should
    enter the official synopses through the admin console.
  - Posters are linked from AFRIFF's site (afriff-revival.lovable.app);
    films without one show a colour placeholder. Before launch, get the
    poster files from AFRIFF and host them ourselves.
  - Trailers: only public YouTube/Vimeo trailer links are used.
    afriff.com also lists Google Drive / Mega / private Vimeo links that
    look like screeners; left out on purpose.
  - SCREENING TIMES ARE MADE UP: afriff.com hasn't published times. A
    sample timetable is generated in programme.js (Lady opens 7 PM Sun
    1 Nov). An urgent news item tells users times are samples. Replace
    with the real schedule as soon as AFRIFF publishes it.
  - Data issues on afriff.com to flag to AFRIFF: "2:Love" shows the
    synopsis of "2.6 Seconds"; director listed as "Amanda Amanda Sans
    Pantling"; Throne of Wood country "Not Specified"; many films have
    no language or genre.
- Logo in `public/logo.svg` is a placeholder; swap in the official file.
- Times shown 12-hour (6:30 PM), as in FilmFest.
- Film "category" is now "programme section" (field `section`), and
  films also have a `genre`. Sections are AFRIFF's own, in order:
  Opening Movie, Special Presentations, Features, Documentary, Jury
  Selection, Audience, Shorts (Jury Selection and Audience are empty).
- Test clock: add `?now=2026-11-01T17:15` before the `#` in the address
  to make the app act as if it's that Lagos time (for testing the
  timeline's red line, live queues, countdown). Code: `src/lib/now.js`.
- "My plan" button floats bottom-right above the nav on the Schedule
  tab (no room in the filter row on small phones).

## Change request 1 (18 Oct 2026), from FilmFest screen recording
Frames in `reference/filmfest/video-frames`, notes in
`reference/filmfest/VIDEO_NOTES.md`. Copy layout/behaviour only. Build
in this order, showing each group before the next:
2–10 Programme, 11–17 Film page, 18–24 My Festival, 25–29 Queues,
30–31 How to attend + admin fields, then 1 Welcome cards last.

1. Welcome cards, first open only (frames 01–06): 5 swipeable cards
   (illustration, bold 2-line headline, one sentence, dots, "Skip",
   full-width Next / "Get started"). Cards: whole festival in your
   pocket; plan your days; check the queue; log what you've seen;
   share your day. Remembered on the phone.
2–5. Programme day picker, multi-select venue chips with day counts,
   one row with count + Public/Industry chip + list/timeline toggle,
   list rows as before.
6. Timeline: venues/screens down the left, hours across, blocks, red
   current-time line, scrolls sideways (frames 16–17).
7. "My plan" bottom sheet: saved films for that day, X to close.
8. "All films" tab grouped by programme section with counts; rows:
   small poster, title, director · country (frame 08).
9. Empty: "Nothing showing at these venues on this day."
10. Footnote: "Times can change. Check the bell for updates."
11–17. Film page: top bar Back + genre/runtime; poster with trailer
   button; title + Seen it (ticks); synopsis 3 lines + Read more;
   Showtimes cards with "+ Schedule" → "✓ Scheduled", "On afriff.com";
   Queue count + label or "No queues left for this film"; Directed by
   with Country, Language, Programme section labels (frame 15).
18–24. My Festival: MY SCHEDULE title + "N screenings over N days";
   grouped by day with Share my day; rows with start–end time and tick;
   empty state "Nothing here yet. Tap + on any screening to add it." +
   "Browse the schedule"; 3 number tiles (films seen, screenings
   planned, queues checked); Watched/diary: "N films logged", optional
   1–5 stars, Export to Letterboxd, link to Letterboxd import page, 3
   numbered import steps; note "Kept on this phone. No account needed."
25–29. Queues: title + icon + one-line explainer; "Queues open now"
   with green LIVE tag (screenings starting in next 2 hours, in line,
   seats left, label, live updates; empty "No screenings start in the
   next 2 hours."); "Recent updates" latest first; optional map with
   green/amber/red venue pins + legend (only if time allows); counts
   come from door volunteers in admin only (no attendee reporting).
30. "How to attend" bottom sheet (frames 10–11): tickets, sold out,
   Q&A sessions, then venues (name, address, screenings, Directions to
   Google Maps). Text editable in admin. Opened from Home and Venues.
31. Admin fields: film genre, programme section, trailer link, country,
   language; screening tag; "How to attend" text sections.
32. Bottom sheets slide up, rounded top, close X.
33. Every tap changes state instantly; smooth on cheap Android.
DO NOT BUILD: sign-in/accounts, other festivals, My season, rankings
or voting, colour themes, Wrapped video, notification settings.

Status: CHANGE REQUEST 1 COMPLETE (18 Oct 2026), all items built and
checked at phone size except 29 and 31, which are part of build step 2
(admin console); 31's fields are written into the Admin console section
above. 32 (bottom sheets) and 33 (instant taps, CSS-only swipes, no
heavy libraries) apply everywhere.
- Welcome cards: `src/components/Welcome.jsx`. Swipe uses the phone's
  own scrolling (CSS scroll-snap), illustrations are drawn in code (no
  images). "Seen" is stored in the phone's browser storage (key
  `afriff-welcome-seen`). To see the cards again for testing, add
  `?welcome=1` before the `#` in the address.
- How to attend: sheet opens from a card under the Home tiles and a
  button on Venues. Text in `HOW_TO_ATTEND` (programme.js). Tickets,
  refunds and masterclasses use facts from afriff.com/tickets. AFRIFF
  MUST CONFIRM three placeholder sections: "If a screening is sold
  out", "Q&A sessions", "Industry screenings" (marked CONFIRM in code).
- Queues decisions: all screens get queue counts from ONE file,
  `src/lib/queues.js`. For now it's a SAMPLE FEED (queue opens 2 hours
  before start, line grows, new count every 5 min, follows the test
  clock). Build step 8 swaps it for door-volunteer counts from Firebase;
  no screen code should need to change. Screens refresh every 30 s.
- Item 28 (map) built as "map-lite": one pin card per venue coloured by
  its soonest open queue + legend. No street map: Google Maps needs a
  paid API key; revisit after the festival if wanted.
- My Festival decisions: "queues checked" = number of screenings whose
  live queue count you've been shown (film page or Queues screen).
  "Seen it" stores the date you tapped it plus an optional 1–5 star
  rating (tap the same star again to clear). Letterboxd CSV columns:
  Title, Year, Directors, WatchedDate, Rating, Tags (tag afriff2026).
  Still not saved across refreshes; that's build step 4.

### Done
- Step 1 (look and layout) built: Home, Programme (day picker, venue
  chips, Public/Industry filter, list + timeline, search), Film page,
  My Festival (incl. Share my day to WhatsApp and Letterboxd CSV
  export), plus simple Queues, Venues and News pages with sample data.
  Picks are NOT saved yet (reset on refresh); saving is step 4.
- Step 1 approved on the user's phone, then change request 1 built on
  top of it (see above), with real film data from afriff.com.
- First Git checkpoint saved 18 Oct 2026 (commit f9b7420, branch main,
  only on this laptop: no GitHub yet).
- DEPLOYED 19 Oct 2026: https://afriff-app-mu.vercel.app (public, Vercel
  free Hobby plan, account tithera14-7328, project "afriff-app").
  Hobby is for non-commercial use: decide on Vercel Pro before the
  official launch (user was warned about cost).

### Masterclasses & events (added 19 Oct 2026, user request)
- Everything that isn't a screening lives in `src/data/events.js`:
  10 masterclasses/workshops (speakers from afriff.com/program/
  masterclasses: Obinna Okerekeocha, RMD, Femi Adebayo, Hilda Dokubo,
  Angel Kristi Williams, Kirby Griffin, Esther Kemi Gbadamosi, Yolanda
  Okereke, Steve Sodiya, Alakpa Uduoghene), 4 AFCM market days (2–5 Nov,
  Twinwaters, Market Badge), Opening Gala, Women in Film panels,
  AFRIFF x CANEX WKND, Globe Awards, Closing Party, all-week meetups.
- Descriptions/bios are short summaries written for the app. Dates of
  market, gala, awards, party and day themes are from afriff.com; ALL
  EVENT TIMES AND ROOMS ARE SAMPLES (masterclass dates too).
- Registration stays on afriff.com (their form collects personal
  details); the app links to it, it doesn't collect anything itself.
- Where events show: Programme "Events" tab (by day, filter chips:
  masterclasses & workshops / market & panels / galas & parties), event
  page `#/event/<id>`, "Masterclasses & events" strip on Home, a pointer
  under the day's screenings, and search (titles + speakers).
- SCHEDULE TAB SHOWS EVERYTHING (user request 19 Oct): the selected
  day lists screenings AND events together in time order, one row per
  showing (`dayItems()` in Programme.jsx). Chip "All / Films / Events"
  (remembered while browsing) with the count beside it; venue chips
  and Public/Industry apply to events too (market = Industry); events
  without a cinema only show under "All venues". Timeline includes
  events (lane = room/place; no cinema → "Other places"; dashed
  border; overnight events handled). The "N masterclasses & events
  this day → See events" card stays. All-week meetups stay on the
  Events tab only.
- Events can be added to My Festival like screenings (multi-day meetups
  can't). `src/lib/plan.js` merges screenings + events for My Festival,
  the My plan sheet, day badges and Share my day.

### Step 2: admin console (in progress, started 19 Oct 2026)
- Firebase project "afriff-app" (Spark, free). Email/password logins on;
  authorized domain afriff-app-mu.vercel.app added. Firestore database
  (London, europe-west2, production mode). Web app "afriff-web"; its
  public config is in `src/admin/firebase.js`.
- No poster uploads: Firebase Storage needs the paid Blaze plan, so
  posters stay an image-link field unless the user chooses to upgrade.
- Admin console lives at `#/admin` (e.g. afriff-app-mu.vercel.app/#/admin),
  not linked from the attendee app. It's lazy-loaded: attendees never
  download admin/Firebase code (checked: attendee bundle ~101 KB gz,
  admin ~174 KB separate).
- Roles in Firestore `users/{uid}.role`: pending (default for new
  sign-ups) / volunteer (+ venue) / editor / admin. Admins assign roles
  on the Team page and can't change their own role.
  FIRST ADMIN: sign up, then in Firebase console → Firestore → Data →
  users → your document, change role from "pending" to "admin".
- Security rules: `firestore.rules` in this folder. NOT deployed
  automatically: paste into Firebase console → Firestore → Rules →
  Publish every time the file changes. Rules already cover the later
  parts: public read of live data, admin-only writes, editors propose
  via `changes` (status pending), volunteers write `queues/{screeningId}`
  only for their venue.
- Claude can't create accounts or log in for testing (Firebase Auth is
  an external login service); the user tests logins.
- Part 1 DONE (logins, roles, Team page); user made themselves admin.
- Part 2 BUILT 19 Oct 2026 (user to test): Festival data, Approvals,
  My changes.
  - `src/admin/schema.js` describes every data type (fields, labels,
    required, list title/subtitle); lists and forms are generated from
    it. Add a field = add one line there. Also holds `seedData()`.
  - `src/admin/data.js`: admin saves write straight to the live
    collection; editor saves create a `changes` doc (action create/
    update/delete, data, before, summary, status pending). Approve =
    one batch that applies the change and marks it approved; Reject
    stores an optional note the editor sees in My changes.
  - Saves keep fields the form doesn't show (e.g. film poster colours).
  - DECISION (user, 19 Oct): the data extracted from afriff.com is
    kept, not re-entered. It's loaded into Firestore once and THE
    DATABASE IS THE MASTER COPY from then on; the team edits it in the
    console. The built-in files (programme.js, events.js) are only the
    starting point / offline fallback. Never ask the user to re-enter
    data; never overwrite database items with the built-in copy.
  - Import button "Add missing festival data" (admins, Festival data
    page): adds only items whose ID isn't in the database yet (199
    built-in items: 68 films, 90 sample screenings, 20 events, 3
    venues, 3 news, 9 sponsors, 6 How to attend). Existing items,
    including edits, are never overwritten, so it's safe to re-press.
  - "Download backup" (admins): saves all collections incl. queues as
    afriff-backup-YYYY-MM-DD.json on the device.
  - The import also fills in fields an existing item doesn't have at
    all (e.g. new `logo` on sponsors); fields the team filled in or
    cleared are never touched.
- SPONSOR LOGOS (20 Oct): the 9 partner logos from afriff.com/partners
  are linked (not downloaded) in `SPONSORS` (programme.js, objects
  {name, logo}); names unchanged because they're the database IDs.
  They're dark artwork for light backgrounds (checked on navy: Filmhouse,
  Martell, Mikano, NB, Dentsu vanish), so the Home strip shows them on
  light tiles (--text colour), name as fallback if a logo fails. Console
  sponsor fields: name, logo link, website (optional, makes tile a link),
  order. Host the logo files ourselves before launch (like posters);
  AFRIFF should confirm sponsors are happy with logo use in the app.
  - Queries avoid composite indexes (sorting done in the app).
  - Admin addresses: #/admin/data, #/admin/data/<collection>,
    #/admin/data/<collection>/<id or new>, #/admin/approvals,
    #/admin/mine, #/admin/team.
  - Attendee app still reads built-in data; build step 3 switches it
    to the database.
- Parts 1–2 + mixed schedule saved (commit f16933a) and DEPLOYED
  19 Oct 2026; admin login live at afriff-app-mu.vercel.app/#/admin.
- Part 3 BUILT 19 Oct 2026 (user to test): door counter at
  #/admin/door (`src/admin/DoorCounter.jsx`). Volunteers see today's
  screenings at their venue only; admins pick any venue + day. Tap a
  screening → "Start counting" (0 in line, seats = capacity) → big
  +1/−1 for "People in line" and "Seats left", "Mark as full", live
  label, "Saved · N min ago by <name>". Writes queues/{screeningId}
  {inLine, seatsLeft, venue, date, updatedAt, updatedBy, updatedByName}
  using increment() so two volunteers never overwrite each other;
  offline taps queue and send on reconnect ("Saving…" shown). Needs
  screenings loaded into Firestore (rules check the screening's venue).
  Attendee Queues screen still uses the sample feed until build step 8.
- Door counter + safe import + backup + sponsor logos saved (commit
  6c9e3c5) and DEPLOYED 20 Oct 2026. Step 2 is complete apart from the
  user's own login tests.
- Git tip on this laptop: commit with `git commit -F <file>` where the
  file is written WITHOUT a BOM (PowerShell 5.1's Set-Content utf8 adds
  one); PowerShell may report exit 1/255 from Git's CRLF warnings even
  when the commit worked, so check `git log` after.
- HOW UPDATES FLOW (explained to user 19 Oct): code changes → Claude →
  checkpoint → deploy; festival data → admin console (editor request →
  admin approve) → Firestore → attendee app (from step 3); queue counts
  → volunteers → Firestore → Queues screens (from step 8, no approval).
  Known gap: approving an old request overwrites newer live edits to
  the same item; could add a "changed since" warning later.

### Sponsor marquee (user request 20 Oct)
- No white tiles. `src/components/SponsorMarquee.jsx`: logos glide LEFT
  TO RIGHT on a seamless loop (list rendered twice, translateX −50% → 0),
  ~4–5 s per logo, pause on touch/hover, still swipeable row under
  prefers-reduced-motion. Placed as a slim ribbon ABOVE the header on
  every attendee screen (scrolls away) and a larger strip at the bottom
  of Home.
- Per-sponsor `logoStyle` (console select): 'white' default (CSS
  brightness(0) invert(1); for dark artwork), 'original' (MTN, CANEX,
  Federal Ministry crest), 'knockout' (GIZ jpg with white box:
  grayscale+invert+mix-blend-mode screen; needs an opaque track
  background, set in CSS). Not visually verified at the bottom strip
  (preview pane wasn't repainting); user to check GIZ on phone.

### Step 3: attendee app reads published data (built 20 Oct 2026)
- WHY a publish step: Firestore Spark allows 50,000 reads/day. Reading
  ~200 docs per app open would allow only ~250 opens/day. Instead:
  - Console "Publish to app" (admins only, `src/admin/Publish.jsx`,
    #/admin/publish) packs all 7 collections into ONE doc
    `published/current` {version: Date.now(), json: <string>, counts,
    publishedAt, publishedBy(Name)}; ~<100 KB, limit checked (900 KB).
  - Vercel relay `api/festival.js` (GET /api/festival) reads that doc
    via Firestore REST and returns the JSON with Cache-Control
    s-maxage=60 → ~1 DB read/min total. (21 Oct: stale-while-revalidate
    cut from 600 to 10 s. With few visitors, the long window handed the
    first phone after a publish the OLD copy, which it kept for 5 min;
    user saw "graphics not reflecting". Published data itself was fine.
    Saved commit 38cee77, DEPLOYED 21 Oct.)
  - Phones (`src/lib/liveData.js`): `loadSavedCopy()` in main.jsx before
    first render (localStorage key `afriff-data-v1`), then
    `checkForUpdates()` on start, every 5 min and on reopen; prod uses
    /api/festival, dev (no relay) or relay failure → Firestore REST
    direct. Newer version → replaceProgramme()/replaceEvents() swap the
    data lists (now `export let` in programme.js/events.js) and App
    re-keys the screens to redraw.
  - Built-in copy kept as BUILT_IN / BUILT_IN_EVENTS (used by the
    console import and as first-visit fallback).
  - Data cleanup on arrival: films without poster colours get them;
    screenings whose film/venue is missing are dropped; events with an
    unknown venue get venue null; lists sorted by order/time.
  - Attendee bundle unchanged size (~104 KB gz, no Firebase SDK).
- Editors/admin save messages now say attendees see changes after
  "Publish to app".
- USER MUST: republish firestore.rules (new `published` rule), press
  Publish to app once, and the relay only works after a deploy.
- Saved (commit dfafe5e) and DEPLOYED 20 Oct 2026. Live relay answers;
  before the rules update it returns 502 "Database answered 403" and
  the app falls back to the built-in copy (as designed).
- Tested: fallback to built-in when nothing published (DB 403 before
  rules publish); fake published copy → edited/new films, new banner,
  sponsors, gala, bad screening dropped, no errors; relay handler with
  pretend DB (404 / 200 cached / 502 no-store).

- User published the rules and pressed Publish to app (20 Oct 12:06
  UTC): step 3 confirmed working end to end (app picked up the real
  published copy). That copy's sponsors had no logo fields (published
  before running the import), so the strips showed names → user must
  run "Add missing festival data" then Publish again.

### Jury (user request 20 Oct)
- Data `src/data/jury.js`: 10 International Jury members from
  afriff.com/festival/jury (name, roles, country, photo linked from
  AFRIFF's site, `jury` heading, order); bios rewritten short in our own
  words. JURY_LINKS: press release + past juries (no past juries in app,
  just the link). `replaceJury()` for published data; `juryGroups()`
  groups by `jury` name so new juries get their own heading.
- Console: "Jury" collection (name, roles, country, which jury, bio,
  photo link, order); included in import (BUILT_IN_JURY), Publish to
  app and backups. firestore.rules: `match /jury/{id}` public read,
  admin write → USER MUST REPUBLISH RULES before importing.
- Screens: Jury page `#/jury` (THE JURY, heading per jury, cards with
  round photo/initials, tap → bottom-sheet bio, links at bottom).
  Three doors: Home "Meet the jury" photo row (after Masterclasses &
  events, before sponsors; tap face → bio, See all → page); Globe
  Awards event page (type 'awards') "The jury" row; All films tab top
  line "Competition films are judged by the International Jury → Meet
  the jury". No new tab.

- Jury page view (user request 20 Oct): GRID by default (2 columns:
  big round photo, name, roles cut to 2 lines, country), with a
  grid/list toggle beside the subtitle (same style as the Programme
  list/timeline toggle). Phone remembers the choice (`afriff-jury-view`).
  Saved (commit d032fb1) and DEPLOYED 20 Oct 2026.
  Then (user request): grid photos are RECTANGULAR, not circles: 4:5
  frame, whole photo shown uncropped (object-fit contain, plain band if
  the photo is squarer), text left-aligned under it (`JuryPhoto` in
  JuryBits.jsx). List view, Home row and bio sheet still use circles.
  Saved (commit 595cd2a) and DEPLOYED 20 Oct 2026.
- Jury saved (commit 2fb8724) and DEPLOYED 20 Oct 2026. Live relay
  returns 200 with the user's 12:06 UTC publish (no jury/logos yet).

### Step 4 + alerts (step 5) + reports (built 20 Oct 2026)
- STEP 4: `src/lib/store.jsx` saves plans (screenings + events), Seen it
  (date + 1–5 stars) and queues checked on the phone (localStorage key
  `afriff-my-v1`). First visit starts EMPTY (demo sample picks removed).
- ALERTS (step 5, no push notifications):
  - Console: screenings/events have `status` ('' / moved / time-changed
    / cancelled). News has `type` (venue-change, time-change, cancelled,
    sold-out, news), `urgent`, `until` (banner end time), optional
    linked `screening` / `event`. After saving a screening/event whose
    date/time/venue/screen/place/status changed, the form offers
    "Tell attendees?" with a prefilled urgent alert (editors → approval).
  - App (`src/lib/alerts.js`): Home banner = newest urgent alert before
    its `until`, links to the item; bell = unread count per phone
    (`afriff-news-seen`), cleared on opening News; News shows type tags
    and "View screening/event"; `StatusTag` on schedule rows, timeline
    (cancelled faded), film showtimes, event page, Home opening day,
    My plan sheet, My Festival rows; My Festival "N of your plans
    changed" card; cancelled screenings get no queue.
- REPORTS (user chose: sharing ON by default with a switch; all three
  reports):
  - Phones (`src/lib/usage.js`) PATCH `usage/{randomDeviceId}` via
    Firestore REST: planned IDs, seen {filmId: rating}, active days,
    updatedAt. Only if changed, at most every 30 min. No personal info.
    Switch in My Festival (`afriff-share`); turning off sends an empty
    record (clears). Laptop dev build never sends unless `?share=1`.
  - Rules: anyone may write their own usage doc with exactly those
    fields and size caps; only admins read. USER MUST REPUBLISH RULES.
  - Admin Reports page (`src/admin/Reports.jsx`, #/admin/reports,
    admins): Load reports button (reads 1 doc per phone + published
    bundle for names). Tiles (phones sharing, active today, plans,
    ratings), Most planned by day with "May sell out" flag (planned ≥
    80% of seats), Highest rated (≥3 ratings) and Most seen, App usage
    bars per festival day; CSV download per table.
  - Free-plan note: ~1–3 writes per phone per day; Spark allows 20,000
    writes/day, so roughly 7–10k sharing phones/day before limits.
    Reports page reads one doc per phone per load.
- Tested on laptop: persistence across reload; fake published alert →
  banner/link, bell unread/cleared, struck + tags, film page tag, My
  Festival warning; usage payload captured (not sent) and switch-off
  clear. NOT tested by Claude: Reports page (needs admin login).

- Saved (commit 927909d) and DEPLOYED 20 Oct 2026. Live: My Festival
  empty on first visit, sharing switch on, bell unread count works.
- USER TO DO: republish rules (jury + usage), Add missing festival data,
  Publish to app; then test an alert end to end and Load reports.

### Film page extras (user request 20 Oct, from prototype review)
- Reviewed old prototype film page vs ours ("Option A" = no ticketing
  in the app; tickets stay on afriff.com). Out of scope: Tickets
  buttons/tab, ticket-system "Sold out" / "N seats left", Me tab /
  accounts, "Save film" (would clash with + Schedule and Seen it).
- Built in `src/screens/FilmPage.jsx`:
  - Badges above the title: programme section; premiere (gold) and
    "In competition" (links to #/jury) only when filled in.
  - Facts line under the title: year · running time · country. Running
    time pill removed from the top bar (genre pill stays).
  - Action row: gold "N screenings ↓" (smooth-scrolls to Showtimes,
    stops below the sticky header), Seen it, round Share button.
  - Share: phone's share sheet (navigator.share) or WhatsApp fallback;
    text = title (year), director, each non-cancelled showing, link.
  - Showtime cards: "ends 12:47 PM" (start + runtime) and a "Q&A" tag.
  - Cast line in the facts list (only when filled in).
  - "More from <section>" sideways poster row (up to 12) + See all →
    #/programme/films.
- New OPTIONAL console fields (`schema.js`): film `cast`, `premiere`
  (World / International / African / West African / Nigerian
  Premiere), `competition` (checkbox); screening `qa` (checkbox). Built-in
  data has none of these (not published by AFRIFF), so badges/Q&A/cast
  stay hidden until the team fills them in and presses Publish to app.
  No rules change needed.
- Saved (commit ace4d26) and DEPLOYED 20 Oct 2026.
- Follow-up (user, 20 Oct): no arrow on the "N screenings" button.
  POSTER NOW SHOWN WHOLE (never cropped), replacing the 16:10 cropped
  hero: `HeroPoster` in FilmPage.jsx. Tall posters centred at
  min(64%, 270px) wide; wide (landscape) posters full width (detected
  when the image loads); no poster / broken link → tall 2:3 colour card
  with title + director bottom-left (like the prototype). Watch
  trailer button centred near the bottom of the poster.
  Saved (commit b9d48d3) and DEPLOYED 20 Oct 2026.
- MASTERCLASS GRAPHICS (user request 20 Oct): the 10 masterclass /
  workshop posters from afriff.com/program/masterclasses (all 4:5) are
  LINKED (not downloaded, like film posters) as `image` on those events
  in `src/data/events.js`. New optional console field on events:
  "Graphic / poster image link". Shown: event page = whole graphic
  centred (same `hero-poster` frame as films; events without one keep
  the colour/icon banner); Home "Masterclasses & events" cards = graphic
  across the top of the card; Schedule/Events rows = small 4:5 thumb
  (`EventThumb`, falls back to the icon tile if the link breaks).
  To reach attendees: Add missing festival data (fills `image` on the
  existing masterclasses, touches nothing else) → Publish to app.
  Host these files ourselves before launch, like posters.
  Saved (commit def61e8) and DEPLOYED 20 Oct 2026. Live published copy
  doesn't have the graphics yet → USER: Add missing festival data, then
  Publish to app.
- OFFICIAL MASTERCLASS GRAPHICS (21 Oct 2026, sent by the user): 10
  files (1080x1350, ~250–350 KB) now HOSTED IN THE APP in
  `public/masterclasses/` (free option; no Firebase Storage / Blaze).
  6 wired up in events.js: acting (RMD), actors (Hilda Dokubo), AI
  (Obinna Okerekeocha), costume (Yolanda Okereke), directing (Angel
  Kristi Williams graphic), makeup (Alakpa Uduoghene). Old lovable.app
  links listed in `REPLACED_LINKS` (events.js); "Add missing festival
  data" now ALSO swaps a field still holding one of those old links for
  the new file (never touches links the team typed). USER: after deploy,
  press Add missing festival data, then Publish to app.
  USER DECISIONS (21 Oct) from the graphics: keep TWO workshops;
  Cinematography speaker Kirby Griffin → Erin G. Wesley (Cinematographer);
  Film Editing Steve Sodiya → Chuka Ejorh (Founder, Blink Studios; "In
  partnership with Blink Studios" added to About); NEW Writers Workshop
  (`writers-workshop`, Tunde Babalola, Award-winning writer and producer,
  SAMPLE date Wed 4 Nov 15:00–17:00 Twinwaters). Erin/Chuka/Tunde have
  no bio (not invented; team can add in console). Old values listed in
  `REPLACED_VALUES` (events.js) so the import corrects them in the
  database only while it still holds exactly the old value.
  The joint Angel + Erin graphic (directing-cinematography-williams-
  wesley.jpg) is stored but unused. Producers (Femi Adebayo) and
  Animation (Esther Kemi Gbadamosi) got no new graphic; they keep the
  afriff.com links. 11 masterclasses/workshops now.
  Saved (commit 7fb780d) and DEPLOYED 21 Oct 2026 (graphics served from
  afriff-app-mu.vercel.app/masterclasses/…). USER: Add missing festival
  data → Publish to app, so attendees get them.
- If new console fields seem missing: reload the console tab (an open
  tab keeps the old code until reloaded). The new film fields are at
  the BOTTOM of the film form, under Synopsis.

### Step 8: live queues (built 22 Oct 2026)
- Storage: ONE record per venue per festival day,
  `queueDays/{date}/venues/{venueId}` = { date, venue, updatedAt,
  s: { screeningId: { inLine, seatsLeft, updatedAt, byName } } }.
  Replaces the old `queues/{screeningId}` docs (rule removed).
- Door counter (`src/admin/DoorCounter.jsx`): taps show at once and are
  BUNDLED (sent ~1 s after the last tap, at most every 2.5 s) as
  increment(N), so 2 volunteers never overwrite each other and writes stay
  far under the free plan's 20k/day. Start counting = 0 in line + capacity
  seats; Mark as full = 0 seats; unsent taps sent on Back / app hidden;
  offline taps sent on reconnect. List shows "N in line · N seats" per
  screening (when one venue is picked).
- Relay `api/queues.js` (GET /api/queues?date=YYYY-MM-DD, default today
  Lagos): lists that day's ~3 venue records via Firestore REST, returns
  { date, fetchedAt, queues: { id: { venue, inLine, seatsLeft, updatedAt } } },
  cache s-maxage=30, swr=5; errors → 502 no-store.
- Phones (`src/lib/queues.js`, same functions as before so no screen
  changed): `startLiveQueues()` (App.jsx, not on #/admin) fetches on start,
  every 60 s while visible, and on reopen; ONLY on festival days. A queue
  shows once a volunteer starts counting, until the film starts. Screens
  redraw when new counts arrive. Dev server reads Firestore REST directly.
- TESTING: `?queues=sample` brings back the pretend feed (with ?now=...).
- Queues screen wording: "Screenings where door volunteers are counting
  the line"; empty "No queues being counted right now…"; footnote "Counts
  update about every minute." Backup now saves queues as date/venue keys.
- Tested: relay with pretend Firestore answers (decode, negatives → 0,
  bad date → today, DB error → 502); app with pretend counts (Queues list,
  Good chance / Full labels, venue pins, recent updates, nav dot, film
  page, schedule rows, queue gone after film starts, sample mode, no
  requests before the festival). NOT tested by Claude: the door counter
  itself (needs a volunteer/admin login) → USER to test.
- Saved (commit c37e0fd, pushed to GitHub) and DEPLOYED 22 Oct 2026.
  Live /api/queues answered 502 "Database answered 403" right after
  deploy = rules not yet republished (expected).
- USER MUST: republish firestore.rules (new queueDays rule) before
  counting; until then the real database refuses queue reads (403) and
  the app shows no queues.
- Vercel note: each open phone asks /api/queues once a minute on festival
  days (cached, ~1 KB). Fine on Pro; on the free Hobby plan heavy use could
  approach its monthly request allowance (part of the hosting decision).

### Door view for volunteers (built 22 Oct 2026, user request)
- Own address `#/door` (afriff-app-mu.vercel.app/#/door): same logins,
  lazy-loaded like the console, no console around it. Volunteers save it
  to their home screen. Admins + volunteers only (others told to ask an
  admin). Console "Door counter" tile now opens #/door.
- Today list (`src/admin/DoorCounter.jsx`): volunteer's venue, today
  (admins pick venue + day). Gold "Count now" card = screening being
  counted, else the next to start within 2 h; other rows tagged Done
  (faded, "Final: …"), Counting, Count now, Next.
- Counter, USER'S DESIGN: two big buttons instead of four +/−:
  "+ Joined the queue" (in line +1) and "✓ Let in" (in line −1 AND seats
  left −1 together, so seats count down by themselves; walk-ins with no
  queue just use a seat). Small: "Let in 5", "Undo" (this phone's taps),
  "Fix numbers" (−/+ for line and seats, Mark as full). Start counting
  asks "Seats available at the door" (pre-filled from the console's
  Seats; change if seats are reserved/sold in advance) → saved as
  seatsStart; screen shows "of N". At 0 seats: Full label, red note
  "Let the N people still in line know", Let in disabled.
- Screen stays awake while counting (Wake Lock), short vibration per
  tap, "Saving… / Saved just now" dot. Same bundled saving as step 8.
  Quick double-taps read the latest numbers (ref), fixed after testing.
- Admin-only "Clear counts for this venue and day" (deletes that day's
  venue record) so test counts never show on the real day.
- Tested with a TEMPORARY test page + pretend in-memory database (deleted
  after): volunteer list, start with 150 seats, joins / let in / let in 5
  with walk-ins, undo, fix numbers, mark full, 10 taps = 1 save, admin
  pickers, counting card, clear counts; #/door opens the login. NOT
  tested by Claude with a real login → USER to test on a phone.

### GitHub (22 Oct 2026)
- Code is on GitHub: https://github.com/TheoKwechi/afriff-app (PRIVATE),
  branch main, remote `origin`. First push done from the Terminal panel
  (Git Credential Manager sign-in needs an interactive window; it's now
  saved on this laptop, so later `git push` works from any shell).
- Developer handover note: `DEVELOPER.md`. USER: invite the developer
  (repo Settings → Collaborators → Add people), add him to Firebase as
  Editor, give him the admin role on the console Team page.
- After each checkpoint, also `git push` so GitHub stays current.
  Deploys are still manual to Vercel (not connected to GitHub).

### How to deploy (publish an update)
- From this folder: `npx.cmd vercel deploy --prod --yes`
  (`npx.cmd`, not `npx`: Windows PowerShell blocks npx.ps1 scripts on
  this laptop. Don't change the execution policy; use .cmd instead.)
- `.vercelignore` keeps `reference/` and other local files out of the
  upload. Not connected to GitHub yet, so deploys are manual.

### How to run it
- `npm run dev` in this folder, then open http://localhost:5173 on the
  laptop, or http://<laptop Wi-Fi IP>:5173 on a phone on the same Wi-Fi.

### Next
- Step 2: admin console and logins (needs Firebase account, free tier).
- Festival opens 1 Nov 2026: may need to prioritise steps.
