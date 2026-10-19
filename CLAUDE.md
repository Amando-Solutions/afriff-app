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

## Home (copy the prototype)
Hero card "Seven days of African stories on the big screen", 1–7
November 2026, 4 venues across Lagos, countdown to opening night; gold
"My Festival" button and outlined "Programme" button; 2x2 tiles
(Programme, Queues, My Festival, Venues); "Opening day" listings with
"Full schedule" link; news banner at the top when there's an urgent
update; sponsors strip at the bottom.

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
"How to attend" text: a list of sections, each with a heading, body
text and an optional link (label + URL). Editors can add, edit, reorder
and remove sections; needs approval like other edits.
(Shapes match `FILMS`, `SCREENINGS` and `HOW_TO_ATTEND` in
`src/data/programme.js`.)

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
