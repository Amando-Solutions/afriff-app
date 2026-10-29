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
CHANGED 26 Oct 2026 (user request, PENDING AFRIFF'S WRITTEN APPROVAL):
attendees have accounts. CHANGED AGAIN 27 Oct (user decision): Home comes
first and the whole app can be browsed without an account; sign-up is
asked for only when someone saves to My Festival. Accounts are plain email +
password handled by Firebase itself (no PIN), or "Continue with Google"
(ADDED 27 Oct, user request, like DP Fitness). On an iPhone in the
browser, the first screen is how to add the app to the Home Screen, with
"Continue on the web". See "Attendee accounts" under Progress.

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
  ADDED 27 Oct (user request): a round avatar right of the bell, opening
  the Profile page (see "Profile page + avatar").
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
- 1–7 Nov: `apps/pwa/app/components/festival/DailyHighlight.vue`, "Today · Day N
  of 7" + date, headline "Daily highlights" EVERY day (user, 23 Oct; day
  themes are no longer the headline), swipeable FILMSTRIP (user chose it
  over the bento collage on 23 Oct, after seeing bento / filmstrip / hero +
  strip / equal grid / masonry / fanned stack): every film showing that
  day, whole poster at 156 px height (never cropped; colour card if no
  poster or the link breaks), title + its next time today or "Shown
  earlier", last tile "See all N films" → Schedule on that day. Count chips
  (screenings / masterclasses / events, zeros hidden), "Next up" (next
  film or event to start, links to it; "That's a wrap for today.
  Tomorrow: <theme>" late; closing line on the last night), gold "See
  today" (opens the Schedule on today via `openProgrammeDay()` in
  `apps/pwa/app/lib/programmeMemory.ts`, even if another day was picked). The "Opening day"
  list becomes "Today": the next 4 films AND events still to start,
  with + buttons; "Nothing else starts today. See tomorrow" when done.
  RESTORED 28 Oct (user request, from a screenshot of the 23 Oct build):
  the classic-look revert (f24288c) had brought back the collage and the
  day-theme headline. Filmstrip + "Daily highlights" are back in
  DailyHighlight.vue, styled in `apps/pwa/app/assets/css/classic.css`
  (`.filmstrip`, `.strip-*`), same sizes as before. NOT committed yet.
- After 7 Nov: thank-you banner + "Your watched list"; no day list.
- Filmstrip order (`apps/pwa/app/lib/today.ts`): films ticked "Feature on Home
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
  ADDED 28 Oct (user request: nobody found the stars): once "Seen it" is
  on, a "Your rating" row of 1–5 stars shows under it. Same rating as My
  Festival's Watched list (one shared piece, `components/festival/
  StarRating.vue`); tap the same star again to clear. NOT committed yet.
- Synopsis cut to 3 lines with "Read more".
- "Showtimes": a card per screening (big date number, month and day,
  time, venue dot + venue, tag "Public" or "Industry"), each with a
  "+ Schedule" button under it. "On afriff.com" link top-right for
  tickets.
  CONFIRMED 28 Oct (user): attendees buy tickets on afriff.com, never in
  the app. Under the showtime cards: "Adding to My Festival doesn't book a
  seat. Get your tickets on afriff.com." (links to afriff.com/tickets).
  NOT committed yet.
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
  (CHANGED 26 Oct with attendee accounts: "Kept on this phone and in your
  account.", plus an account card: emails switch, Log out, Delete my account.)
  (CHANGED 27 Oct: the account card and the alerts / anonymous counts
  switches moved to the Profile page; My Festival keeps only the "Keep your
  plan on any phone · Sign up" card for people not signed in.)

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
ADDED 27 Oct (PM brief): Admin and Editor see Contacts (names, emails,
groups) and prepare invitations; ONLY Admin sends them, makes VIP links and
sees guest lists. See "VIP invitations, contacts and guest lists".
ADDED 27 Oct (user request): Superadmin, only michaelakpuofoba@gmail.com and
tithera14@gmail.com. Admins can make someone an admin but can't remove an
admin; only a superadmin can. Admins never see the word "superadmin" (to
them the two owners are plain admins). See "Superadmin".

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

### STATUS AT A GLANCE (updated 26 Oct 2026; festival opens 1 Nov)
Read this first; the dated sections below are the detailed history.
- Who: product owner (this laptop, with Claude Code) + Michael
  (developer, GitHub michaelkyng). WORKING AGREEMENT: every change goes
  to GitHub as a pull request; Michael reviews, merges and deploys.
  Claude no longer deploys from this laptop (doing so would overwrite
  Michael's version). React version is kept only as local branch
  `backup/react-filmstrip`.
- Code: Nuxt 4 + TypeScript PWA (Michael's rebuild, 22–23 Oct), split on
  24 Oct into a monorepo: attendee app `apps/pwa`, staff app `apps/admin`,
  shared `packages/` (see "Monorepo" below). GitHub TheoKwechi/afriff-app,
  branch main. Live:
  https://afriff-app-mu.vercel.app runs an OLDER Nuxt build (checked 25 Oct:
  from before the 24 Oct monorepo split). Point demo links / QR codes at the
  address Michael actually deploys to.
- Build steps: 1 look ✅ · 2 admin console + logins ✅ (owner's own login
  tests of Team / Approvals / Reports outstanding) · 3 real data ✅ (but
  screening + event TIMES ARE SAMPLES) · 4 My Festival + Share my day ✅ ·
  5 news + alerts ✅ (+ push notifications, built 26 Oct; need 2 keys set
  up, see "Push notifications") · 6 sponsors +
  venues ✅ · 7 watched log + Letterboxd ✅ · 8 live queues ✅ built, plus
  the volunteer door view; NOT yet tested with real logins on real phones.
- Extras built on request: masterclasses + events, jury page, film page
  extras, simplified Home, daily highlight, admin reports, home-screen
  install + offline (Michael), afriff.com film sync every 15 minutes
  (26 Oct; built and tested, NOT deployed: needs Blaze; SWITCHED OFF in the
  code 28 Oct, user decision; see "afriff.com film sync"), attendee accounts (26–27 Oct; email + password by
  Firebase, asked for only when saving; branch `feature/attendee-accounts`,
  27 Oct changes NOT committed or deployed; pending AFRIFF's written
  approval; see "Attendee accounts"), Profile page + header avatar
  (27 Oct; NOT committed; see "Profile page + avatar"), festival emails
  written and sent from the console, Brevo only delivers (27 Oct; NOT
  committed; see "Festival emails from the console"), "Continue with
  Google" sign-up / log-in (27 Oct; NOT committed; see "Continue with
  Google"), VIP invitations + contacts + VIP sign-up links + guest lists
  (27 Oct, PM brief; NOT committed; Brevo + afriff.app domain to set up; see
  "VIP invitations, contacts and guest lists"), superadmin (27 Oct; NOT
  committed; needs `npm run deploy:rules`; see "Superadmin"), pushes for
  scheduled invitations by Cloud Function + alerts switch on the VIP page
  (28 Oct; NOT committed; needs Blaze + `npm run deploy:functions`; see
  "Invitation pushes for scheduled sends + alerts on the VIP page").
- Branch `claude/daily-highlights-filmstrip` (filmstrip + "Daily
  highlights" headline) MERGED INTO main 23 Oct (pull request #3). The
  monorepo split (branch dev) is rebased on top of it; dev → main still
  to merge and deploy.
- OPEN RISKS before 1 Nov: (1) Firestore free plan: phones now read the
  database directly, so live queues can pass 50,000 reads/day and stop
  updating → move to Blaze + budget alert. (2) Vercel Hobby is
  non-commercial → Vercel Pro or Firebase Hosting (Blaze). (3) Sample
  times. (4) Nothing tested end to end on real phones with real logins.
  (5) ALL THREE demo logins are yopmail addresses (admin@, editor@,
  volunteer@yopmail.com; checked 25 Oct). yopmail inboxes are public, so
  anyone can use "Forgot password?" and read the reset email, and the
  admin's password is in GitHub history (commit 7d49371). User decision
  25 Oct: keep them for the demo, then move them to private addresses or
  delete them before 1 Nov. With attendee accounts this becomes URGENT:
  an admin login can see and download every attendee's name and email.
  (6) Push notifications stay switched off until
  their two Firebase keys are added on Vercel (see "Push notifications for
  announcements"); not yet tried on a real phone.
- Deploy commands (25 Oct, Firebase CLI, all to afriff-app): `npm run
  deploy:rules`, `deploy:functions` (the Cloud Functions in `functions/`;
  needs the paid Blaze plan). Pasting rules into
  the Firebase console still works. ADDED 29 Oct: `deploy:storage`
  (storage.rules) and `deploy:all-rules` = database rules + database indexes
  (`firestore.indexes.json`, empty: no query needs one; matches the live
  project, checked 29 Oct) + storage rules in one go. It only works once
  Firebase Storage is switched on.
- NEEDED FROM AFRIFF: real schedule (times, rooms), premiere status per
  film (afriff.com doesn't publish it, so no premiere badges yet), posters
  for the 18 films that have none, details for the 36 Out of Competition
  films (synopsis, runtime, country), poster / logo / jury photo files to
  host ourselves, sponsors' OK to show logos, confirm 3 "How to attend"
  sections, bios for Erin G. Wesley, Chuka Ejorh, Tunde Babalola, date +
  details for "From Idea to the Screen" (Banwo & Ighodalo), fixes for
  afriff.com data errors, and (optional) an app.afriff.com address.

### Decisions made (session 1, 18 Oct 2026)
- Tech: React + Vite (plain JavaScript), icons from lucide-react.
  Pages switch with `#/...` addresses (e.g. `#/film/harmattan`).
  CHANGED 22 Oct 2026: now a Nuxt PWA. See "Move to Nuxt PWA" below.
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
    CHANGED 25 Oct 2026 (user decision): the database now holds AFRIFF's
    official synopses from afriff.com. See "Data sync from afriff.com".
  - Posters are linked from AFRIFF's site (afriff-revival.lovable.app);
    films without one show a colour placeholder. Before launch, get the
    poster files from AFRIFF and host them ourselves.
    CHANGED 25 Oct 2026: linked straight from afriff.com
    (https://afriff.com/__l5e/assets-v1/...); the lovable.app links only
    redirected there.
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
  ADDED 25 Oct 2026: Out of Competition (36 films, new on afriff.com).
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
DO NOT BUILD (sign-in/accounts: CHANGED 26 Oct, see "Attendee accounts"): sign-in/accounts, other festivals, My season, rankings
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
- ALERTS (step 5; push notifications added 26 Oct, see "Push notifications
  for announcements"):
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
- Own address `/door` (old link `#/door` forwards there): same logins,
  only downloaded when opened (like the console), no console around it.
  Volunteers save it to their home screen. Admins + volunteers only (others
  told to ask an admin). Console "Door counter" tile now opens /door.
- Today list (`app/admin/AdminDoorCounter.vue`): volunteer's venue, today
  (admins pick venue + day). Gold "Count now" card = screening being
  counted, else the next to start within 2 h; other rows tagged Done
  (faded, "Final: …"), Counting, Count now, Next.
- Counter (`app/admin/AdminDoorScreening.vue`), USER'S DESIGN: two big
  buttons instead of four +/−: "+ Joined the queue" (in line +1) and
  "✓ Let in" (in line −1 AND seats left −1 together, so seats count down by
  themselves; walk-ins with no queue just use a seat). Small: "Let in 5",
  "Undo" (this phone's taps), "Fix numbers" (−/+ for line and seats, Mark
  as full). Start counting asks "Seats available at the door" (pre-filled
  from the console's Seats; change if seats are reserved/sold in advance)
  → saved as seatsStart; screen shows "of N". At 0 seats: Full label, red
  note "Let the N people still in line know", Let in disabled.
- Screen stays awake while counting (Wake Lock), short vibration per
  tap, "Saving… / Saved just now" dot. Same bundled saving as step 8.
  Quick double-taps read the latest numbers.
- Admin-only "Clear counts for this venue and day" (deletes that day's
  venue record) so test counts never show on the real day.
- First built in the React version (commit c56a208, deployed 22 Oct), then
  carried into the Nuxt app on 23 Oct with the Nuxt app's look (same
  buttons, cards, icons and colours as the rest of the app).
- Tested (Nuxt, 23 Oct) with a pretend in-memory database swapped in for
  Firebase in a throwaway test build (never in the repo): volunteer list,
  start with 150 seats, joins / let in / let in 5 with walk-ins, undo, fix
  numbers, mark full, 10 taps = 1 save, admin pickers, counting card, clear
  counts, editors refused, console tile → /door, #/door forwards. NOT
  tested by Claude with a real login → USER to test on a phone.
- React version saved (commit c56a208, pushed) and DEPLOYED 22 Oct 2026:
  live #/door showed the login. Rules are republished: live /api/queues
  answered 200 with no counts yet (queues switched on). The Nuxt version
  isn't deployed yet.

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

### Move to Nuxt PWA (22 Oct 2026, decision by Michael, the developer)
- SAME APP, SAME SCOPE, NEW FRAMEWORK: everything above (screens, admin
  console, Firebase, publish step, relays, queues, reports) is unchanged in
  behaviour. Only the framework and the look changed.
- Tech: Nuxt 4 (Vue 3) in SPA mode, TypeScript since 23 Oct (see below), Tailwind CSS 4,
  icons from lucide-vue-next. Code moved from `src/` to `app/`; the file
  map is in DEVELOPER.md section 3. Data files (`app/data/*.ts`) and most of
  `app/lib/` are the same code as before.
- Addresses are real paths now: `/film/lady`, `/programme/events`, `/my`,
  `/admin/data/films`. Old `#/...` links (already shared, or in a QR code)
  are forwarded to the matching page automatically.
- Relays moved from `api/*.js` to Nuxt server routes `server/api/festival.get.ts`
  and `server/api/queues.get.ts`. Same URLs, same caching, same answers.
  (SUPERSEDED 23 Oct: the relays were then deleted; phones read Firestore
  directly. See "Proper PWA, like DP Fitness" below.)
- LOOK: sizes, colours, spacing, icons and fonts now follow the AFRIFF
  design system from the earlier attendee build (deep navy + festival gold,
  Archivo headings + Onest text, one radius system, the official AFRIFF
  emblem and app icons). The layout and structure of every screen stays as
  described in this brief. Tokens live in `app/assets/css/main.css` (this
  replaces `src/theme.css`; the colours are the same family, e.g. page
  #060A26, card #0B1135, gold #D9A441, light gold #E9C262). Dark only (no
  colour themes, as before). Fonts are bundled, not loaded from Google.
  Page titles are no longer in capitals (the earlier design system's style).
- PWA (the brief's "add to home screen", now done): web manifest + icons;
  service worker keeps the app shell, fonts and icons on the phone so every
  page opens with no signal (images are kept once seen; the admin console
  is never downloaded by attendees); "Install the AFRIFF app" prompt on
  Android/Chrome; "Add to Home Screen" guide on iPhone (Safari has no
  install button), "Not now" remembered for a week; offline banner; "A new
  version is ready → Reload" toast after a deploy.
- Testing switches (`?now=`, `?queues=sample`, `?welcome=1`, `?share=1`)
  now go straight after the address, e.g. `/programme?now=2026-11-03T13:00`,
  and are remembered for the browser tab.
- Hosting: `vercel.json` tells Vercel the project is Nuxt now (it was set
  up as Vite). Deploy the same way as before.
- Checked (cloud browser at phone size): every screen, welcome cards, plan
  and Seen it saved across reloads, My plan sheet, search, timeline,
  festival-day Home (`?now=`), sample queues + Queues tab dot, News clears
  the bell, Jury bio sheet, old `#/` link forwarding, 404 page, admin login
  screen, relays (with pretend database answers), offline reload of deep
  links. NOT checked: admin logins (Firebase accounts), install prompts on
  real phones.

### TypeScript + visual hierarchy pass (23 Oct 2026, user request)
- WHAT CHANGED FOR ATTENDEES: nothing in what the app does; screens read
  more clearly. WHAT CHANGED FOR THE DEVELOPER: the whole app is TypeScript.
- TypeScript: every file in `app/` and `server/` is `.ts` (or a `.vue` file
  with `lang="ts"`); no JavaScript left except throwaway test scripts. The
  shapes of films, screenings, events, venues, news, jury and queue counts
  are written down once in `app/types/festival.ts` (console records in
  `app/admin/types.ts`), so a typo in a field name is caught before it
  ships. New check: `npm run typecheck` (must say nothing = all good).
- Visual hierarchy (design rules, also in DEVELOPER.md section 3):
  - Gold is kept for things you can tap or have chosen (buttons, selected
    day/chip/tab, active nav). Times, dates, counts and initials are now
    white or grey, so the gold buttons stand out.
  - One clear order of text sizes on every screen: page title → section
    heading → item title → details → small capital labels.
  - Programme: the All / Films / Events switch sits on the same row as
    Public/Industry; a heading above the list shows the day, its theme and
    how many items. (The day picker briefly became gold tiles; on 23 Oct
    it went back to the original strip: day name, big date number with
    month/year beside it, picked day light gold with a gold underline,
    others faded, in the app's own type sizes.)
  - Rows (schedule, events, My Festival, My plan): big white time on the
    left, title, then venue, then a small grey category label; masterclasses
    show a green "Free" tag; cancelled rows fade.
  - Home: the urgent banner is shorter (headline + 2 lines + "Read in News").
  - My Festival: the three number tiles became one card.
  - Queues: "Live" tag only on "Queues open now"; recent updates use short
    venue names so the line fits; labels are coloured tags.
  - News: tag and date on one quiet line, headline leads, "View" button.
  - Jury: country and initials grey instead of gold.
  - Console and door view: same rules (numbers white, gold for actions).
- Checked (cloud browser at phone size): every screen re-screenshotted; the
  attendee test run (welcome, plans saved across reload, bell, hash links,
  festival-day Home, sample queues); offline reload; door counter with the
  pretend database (all steps); `npm run typecheck` and `npm run build`.
- Not deployed yet. Michael: pull, `npm install` (adds typescript and
  vue-tsc), `npm run typecheck`, then deploy as usual.

### Proper PWA, like DP Fitness (23 Oct 2026, decision by Michael)
- WHAT CHANGED FOR ATTENDEES: the app now talks to the database directly and
  keeps working with no signal, then catches up by itself when the signal
  comes back. Updates arrive on their own. Screens look the same.
- Modelled on Michael's DP Fitness PWA (same service worker, offline cache,
  update and install approach), adapted for AFRIFF.
- NO SERVER ROUTES ANY MORE: the two relays (`/api/festival`, `/api/queues`)
  are deleted. Phones read Firestore directly with the Firebase SDK, which
  keeps a copy of everything it has read on the phone (IndexedDB):
  - Published data: "Publish to app" now also writes a tiny marker,
    `published/version`. Open phones watch it live; only when it says there's
    a newer version do they download the big bundle (`published/current`).
    A publish shows on open phones within seconds (it used to take up to
    ~1 min).
  - Live queues: phones listen to the day's ~3 venue records live. A count a
    volunteer saves shows within a second or two (it used to be up to ~1 min).
    To save database reads, phones only listen on festival days, while the
    app is on screen, from 3 hours before the day's first screening until
    the last one starts.
  - Anonymous usage counts: saved with the SDK; made with no signal, they
    wait on the phone (even if the app is closed) and go when it's back.
  - Door view: taps made with no signal now also survive closing the app.
- OFFLINE: the whole app is saved on the phone, including the console and
  door view (a volunteer can open /door with no signal). Banner "You're
  offline…", then "Back online" for a moment. Queues says when the counts
  are the last ones received, and only shows "Live" when they're live.
- UPDATES: no more "new version ready → Reload" toast. A deploy installs by
  itself; the app checks whenever it's reopened and reloads onto the new
  version. On the console and door view it waits until the person leaves the
  app, so a volunteer mid-count never loses taps.
- INSTALL: same toasts (Android one-tap Install, iPhone Share steps, plus a
  hint for Instagram/WhatsApp's built-in browsers). Fixed: "Not now" used to
  hide the Android install offer forever; now it's a week, as intended.
  CHANGED 28 Oct (user request): no week any more. Closing it lasts until a
  full reload, and it stays on every page but sign-up; iPhones get the steps
  screen instead of a toast. See "Install toast on every page".
- Splash screen (emblem + gold loading bar) while the app starts.
- COST WARNING (Firebase): with no relay, every phone's reads count against
  Firestore's free 50,000 reads/day. Published data is cheap. Live queues
  during the festival are not: each saved count is one read per phone
  watching. With thousands of phones open during screening hours this will
  pass the free limit, and on the free plan Firestore then stops answering
  for the rest of the day (the app keeps showing what it has). Before
  1 Nov: switch Firebase to Blaze (pay as you go, a few cents per 100,000
  reads; check Firebase's pricing page) and set a budget alert. Bigger download too: the offline copy is
  ~735 KB instead of ~525 KB (the Firebase code).
- Checked (cloud browser at phone size, with a pretend database in a
  throwaway test build, never in the repo): publish reaches an open phone
  without reloading, bundle read once per publish, live queue counts,
  offline banner and Queues note, offline reload of deep links with the
  Firebase code, "Back online" and counts catching up after reconnecting,
  usage write queued offline and sent on reconnect (only allowed fields),
  queue listener closed in background and before the festival, install
  toast and dialog, a deploy reaching an open app by itself while the door
  view waits until hidden, no-cache headers on sw.js and the manifest.
  `npm run typecheck` and `npm run build` pass. NOT checked: the real
  Firestore (this sandbox can't reach it), real phones.
- USER (Michael) TO DO: run it against the real database (`npm run dev`),
  deploy, press Publish to app once (creates the marker), test on a real
  Android and iPhone (install, airplane mode, back online), and decide on
  Blaze before the festival.

### Monorepo: attendee app + staff console (24 Oct 2026, decision by Michael)
- WHAT CHANGED FOR ATTENDEES: nothing they'd notice, except the app they
  download no longer contains any staff code (a little smaller and lighter).
- WHAT CHANGED FOR STAFF: the admin console and the door view are now their
  OWN app at their OWN address (a second Vercel project), called "AFRIFF
  Staff" when installed. (25 Oct: signed-out people now land on /login.)
  Opening it sends volunteers straight to the door
  counter and everyone else to the console. Old links still work: /admin,
  /door, #/admin and #/door on the attendee app forward to the staff app.
  CHANGED 28 Oct 2026 (Michael: "they are two different apps"): forwarding
  REMOVED. /admin and /door on the attendee app now show "We couldn't find
  that page". The old links only ever lived on afriff-app-mu.vercel.app,
  never on the new addresses, so nobody loses a working link.
  `NUXT_PUBLIC_ADMIN_URL` stays: push alerts still use the staff server.
- WHY: same architecture as Michael's DP Fitness project. One folder
  ("monorepo") with two apps split by who uses them, and shared packages for
  everything both must agree on, so they can't drift apart:
  - `apps/pwa`: the attendee app.
  - `apps/admin`: the staff console + door view.
  - `packages/theme`: the look (colours, sizes, fonts, buttons, sheets, logo).
  - `packages/pwa`: offline, updates, install prompts, offline banner.
  - `packages/core`: festival data, data shapes, date/time helpers, Firebase.
- Tool: npm workspaces (same `npm` commands, run from the main folder).
  Versions of every library unchanged.
- Checked (cloud browser at phone size, pretend database, throwaway test
  builds): the full attendee test run again (29 checks: live publish, live
  queues, offline, back online, queued writes, install toast…), plus the
  staff app (sign-in screen on /admin and /door, its own install details,
  "/" sends you to the console), old /admin and #/door links forwarding to
  it, and a deploy reaching both apps (the door view still waits until the
  volunteer leaves the app). Typecheck and both builds pass. NOT checked:
  real logins, the real database, real phones.
- USER TO DO (once): create the second Vercel project for the staff app,
  set the attendee project's Root Directory to `apps/pwa` and its
  `NUXT_PUBLIC_ADMIN_URL` to the staff app's address, add that address to
  Firebase → Authentication → Authorized domains. Details in DEVELOPER.md §5.

### Staff app routing + data sync from afriff.com (25 Oct 2026, Michael's request)
- STAFF APP ROUTING (apps/admin): the old catch-all page (`admin/[...path]`
  + one big AdminApp component) is replaced by one Nuxt page per address.
  "/" no longer sends signed-out people to /admin: they land on **/login**.
  Addresses: /login, /pending (signed in, no role yet), /door, /admin
  (tiles), /admin/team, /admin/approvals, /admin/publish, /admin/reports,
  /admin/mine, /admin/data, /admin/data/<collection>, /admin/data/
  <collection>/<id or new>; /admin/door forwards to /door. Deep links
  survive sign-in (/login?redirect=...). Who may open what is in ONE file,
  `apps/admin/app/lib/access.ts` (used by `middleware/auth.global.ts` and
  `plugins/auth-guard.client.ts`, which also moves people on by themselves
  when they log out or an admin changes their role).
- Folders: screens in `apps/admin/app/components/` (auth/, console/, door/),
  helpers in `apps/admin/app/lib/` (same pattern as the attendee app); the
  old `app/admin/` folder is gone. Console top bar = `layouts/console.vue`.
- Tested: 45 role × address combinations of the access rules, signed-out
  redirects in a browser, typecheck + both builds. NOT tested by Claude:
  signing in with a real account (Claude may not create logins) → test
  admin, editor and volunteer logins once.
- ATTENDEE APP FIXES: Share my day now ends with "Full programme: <link>",
  which opens the Schedule on that day (`/programme?day=2026-11-03`).
  Films with no screenings hide the Queue section; no "0m" for films
  without a running time; no stray "·" when a film has no country.
- DATA SYNC (written straight to Firestore with the Firebase CLI's admin
  sign-in on Michael's Mac, then published; backup taken first, kept in
  /Users/mac/Documents/afriff-backups/ outside the project because it holds
  team emails):
  - Source: afriff.com's own film list (105 films). All posters, jury photos,
    sponsor logos and masterclass graphics now link straight to
    https://afriff.com/__l5e/assets-v1/... (6 posters come from IMDb's image
    server, as on afriff.com). 23 posters switched to AFRIFF's newer uploads,
    15 films got a poster for the first time. 18 films still have none.
  - Official afriff.com synopses for 64 films (user decision). Kept ours for
    2:Love (afriff.com shows the wrong film's synopsis) and for 4 films with
    none on afriff.com (2.6 Seconds, Eseuseu, Maktoub, Soul Catcher).
  - Cast filled in for 45 films (empty before); missing languages filled.
    Titles, directors, countries kept as we had them (afriff.com differs
    only in capitals or has known errors).
  - 36 NEW "Out of Competition" films (user decision): title, director and
    poster only (afriff.com has nothing else yet). afriff.com lists "Ife Ati
    Iku" twice; it's our "Ìfẹ́ àti Ikú (Love and Death)", so not added again
    (ours got its poster). All-caps titles title-cased (Yes, Two, Calabash,
    The Other Gaze).
  - Trailers: added public Vimeo trailers for For Life and Hope is a Word;
    removed In the Shadows 75's (Vimeo: private or deleted).
  - 2:Love corrections and the Sun 1 Nov line-up swaps from corrections.ts
    applied (every opening-day film has a poster).
  - NEW masterclass (user decision) "From Idea to the Screen" with Banwo &
    Ighodalo (law firm), graphic from afriff.com, SAMPLE date Mon 2 Nov
    16:30–18:30, Twinwaters Masterclass room (the first suggested slot,
    Thu 10:00, clashed with the Producing Masterclass).
  - How to attend → Tickets: "Prices and sale dates are coming soon" →
    "will be announced on afriff.com" (prices still unannounced).
  - Not changed: "Times are samples for now" urgent banner (still true);
    premiere badges (afriff.com doesn't say which films are premieres;
    only Lady is ticked "In competition", by the team).
  - Published to the app 25 Oct 20:55 UTC ("Data sync from afriff.com
    (Claude, for Michael)"), which also created the `published/version`
    marker for the first time, so open phones now get publishes live.
- Built-in copy (`packages/core/src/data/`): image addresses switched to
  afriff.com, section "Out of Competition" added. Synopses and the 36 new
  films live only in the database (the master copy); the built-in files
  stay the starting point / offline fallback.
- Removed the `demo:logins` and `seed:admin` npm scripts (their files were
  deleted on 25 Oct).

### Push notifications for announcements (26 Oct 2026, user request)
- CHANGED DECISION: this brief said "no push notifications, by design".
  The user asked for them on 26 Oct, so they're built.
- WHAT ATTENDEES SEE: an "Alerts on this phone" switch at the top of News
  and at the bottom of My Festival. Off until they turn it on (the phone
  then asks permission). Tapping a notification opens News. iPhone: only
  works once AFRIFF is added to the Home Screen (iOS 16.4 or later); in
  Safari the card says so instead of showing the switch.
- CHANGED 27 Oct (user test: changed a screening, saved, published, no push):
  the Publish page now offers an alert for every changed screening/event by
  itself. See "Push: changed screenings at Publish + invitations by push".
- WHAT THE TEAM DOES: nothing new. News items have a new tick box, "Send as
  a push notification to phones with alerts on", ticked by default on NEW
  items and on "Tell attendees?" alerts (existing items stay unticked). It's
  sent ONCE, the first time it's published with Publish to app. Editing and
  publishing again never re-sends it. Editors' items go through approval as
  before. The Publish page lists what will be sent before you press it, and
  says "Push notification sent: …" after.
- SAFETY RULES: at most 3 notifications per publish (newest first; extras
  are never sent later); nothing sent once its banner end time ("until")
  has passed; a phone offline for over 24 h doesn't get it late. The
  notification is the headline plus the first 180 characters of the message.
- COST: none expected. Google's Firebase Cloud Messaging is free on the
  current free plan (no Blaze needed). Each publish that sends uses a few
  database reads; each phone turning alerts on is one small request to the
  staff app.
- HOW (for the developer): FCM topic "news"; the staff app now has three
  small server routes, `/api/push/*` (send = admins only; subscribe /
  unsubscribe = called by phones); Firestore `pushLog` remembers what was
  sent. Details in DEVELOPER.md "Push notifications for announcements".
- SETUP BEFORE IT WORKS (once, all free; Michael or the owner):
  1. Firebase console → Project settings → Cloud Messaging → Web Push
     certificates → Generate key pair. Copy the key into the ATTENDEE
     Vercel project as `NUXT_PUBLIC_FIREBASE_VAPID_KEY`; redeploy it.
  2. Firebase console → Project settings → Service accounts → Generate new
     private key (downloads a .json file; it's a SECRET: never put it in
     GitHub, chat or email). Paste the whole file into the STAFF Vercel
     project as `NUXT_FIREBASE_SERVICE_ACCOUNT`, marked Sensitive; redeploy it.
  3. `npm run deploy:rules` (new `pushLog` rule, so the Publish page can list
     what it will send).
  Until 1 and 2 are done, the switch stays hidden and publishing works as
  before; publishing a ticked item then says push isn't set up yet.
- TESTED (26 Oct, by Claude): typecheck and both builds; the sending rules;
  the staff app's routes with a pretend Firebase (editor refused, first
  publish sends the 3 newest and skips the rest, publishing again sends
  nothing, a failed send is retried next publish, phones join and leave the
  list, key pasted as JSON or base64, clear messages for a missing or broken
  key); the attendee app in a phone-sized test browser with Google faked
  (switch on → phone on the list; push → notification shown; same one twice
  → one notification; tap → News without reloading; renewed phone address
  re-joined on start; switch off → removed; blocked in settings → explained;
  iPhone Safari → "add to Home Screen first"). Found and fixed on the way:
  Nuxt turns a JSON setting into an object, which would have stopped sending
  on Vercel. NOT TESTED: a real notification to a real phone (needs the two
  keys), and the Publish page with a real admin login.

### Attendee accounts (26 Oct 2026, user request; reworked 27 Oct)
- STATUS: on branch `feature/attendee-accounts`. Michael committed the first
  version (b2b29b2), reverted the attendee app to the classic React look
  (f24288c) and merged main. The 27 Oct rework below is NOT committed yet.
  Not deployed. PENDING AFRIFF'S WRITTEN APPROVAL.
- HISTORY: 26 Oct built with a 4-digit PIN, our own lockout (5 tries → 15
  min) and a Forgot-PIN code by Brevo, all checked by the staff app's
  server, and the sign-up page first. 27 Oct (user decisions): Home first,
  sign-up only when saving; then "just email and password, let Firebase
  handle it natively, reset link instead of code" (like DP Fitness). The
  PIN, the code and the staff-server login routes are gone.
- HOW IT WORKS NOW: Firebase's own email + password sign-in, straight from
  the phone. Password: at least 8 characters (with Show/Hide). Wrong
  passwords: Firebase's own protection ("Too many tries. Wait a few minutes,
  or reset your password."; the numbers aren't ours to set). Forgot
  password: Firebase emails a reset link → Firebase's page to choose a new
  password → back to the app to log in. The reset email's wording/sender:
  Firebase console → Authentication → Templates. Accounts work even when the
  staff app is down.
- WHEN SIGN-UP IS ASKED FOR: never to browse (Home first; QR links to film
  pages open straight away). Saving to My Festival asks: + on a screening or
  event, "+ Schedule" on a film page, and "Seen it" (CLAUDE'S CHOICE, same
  kind of save; easy to drop). The sign-up page says "Save your festival",
  has "Not now ✕", and after sign-up / log-in saves what they tapped and
  returns them to the page. Removing never asks. My Festival opens without an
  account, with a "Keep your plan on any phone · Sign up" card.
- NO INTERNET (27 Oct, user request; replaces "Save on this phone for now",
  which is gone): a slim bar fixed at the top of every screen, "No internet
  connection · You can still browse" (then "Back online" for a moment). It
  pushes the page down, never covers it. With no account and no internet,
  tapping + or "Seen it" saves nothing and shows a short message above the
  bottom bar: "You're offline · Connect to the internet to sign in and add
  “Lady” to My Festival." (or "…mark “Lady” as seen."). Signed-in people can
  still save offline; it reaches their account when the signal is back. The
  sign-up page offline says "Connect to the internet to sign up or log in"
  and its button waits. Firebase unreachable while online: "We can't reach
  AFRIFF right now. Check your connection and try again.
- SIGN-UP FORM: first name, last name, email, password, "Confirm password"
  (added 27 Oct, user request: "Type your password again." / "The passwords
  don't match."; each box has its own Show), an UNTICKED "Yes,
  AFRIFF can email me festival news and updates." box (optional), a short
  privacy note and a link to `/privacy` (readable without an account).
- DETAILS ARE NEVER ASKED TWICE (27 Oct, user request): if the login is made
  but the details don't reach the database (no signal, or the database
  refuses them, as the live one does until `npm run deploy:rules`), the page
  says "Almost done · Your account is made, but we couldn't finish setting it
  up just now" with ONE "Try again" button: no form. The details are kept on
  the phone and the name is also stored on the Firebase login, so logging in
  later (any phone) finishes it silently (emails choice off if from another
  phone). "One more step" (name form) is only for a login whose name we
  don't know at all, e.g. an AFRIFF team login. Seen by the user on 27 Oct
  because the live database still has the OLD rules (checked: the public
  `settings/attendeeAccounts` read answers 403).
- LOG IN ON ANOTHER PHONE: email + password; My Festival (plans, Seen it,
  stars, queues checked) comes along and stays in step between phones.
- PROFILE (was MY FESTIVAL until 27 Oct; see "Profile page + avatar"):
  account card (avatar, name, email, "Saved to your account"),
  "Festival emails from AFRIFF" switch, Log out (clears the plan from that
  phone; it stays in the account), Delete my account (asks for the password
  again; team members keep their staff login).
- IPHONE (27 Oct, user request, like DP Fitness's install-first screen):
  on an iPhone or iPad in the browser (not the Home Screen app), the first
  thing shown is "Install the app first": 3 steps (Share → Add to Home
  Screen → Add; hint that newer iPhones put Share under •••), a note for
  Instagram / WhatsApp's built-in browsers, "Already added it? Open AFRIFF
  from your Home Screen", and "Continue on the web" (remembered in that
  browser; CHANGED 28 Oct, user decision: it now closes the screen only until
  a full reload, see "Install toast on every page"). Then the welcome cards. Not shown in the Home Screen app, on
  Android or on laptops. Test on a laptop: add `?install=ios` to the address.
- CONSOLE (admins only): Attendees page = "Require an account to save to My
  Festival" switch (ON by default; OFF = saving works without an account),
  what's set up, the "App users" list, spreadsheets of all users or only
  "App subscribers", delete an account on request.
  Reports → "Sign-ups": per day and how many said yes to emails. Editors and
  door volunteers can't see attendee details (database rules).
- FESTIVAL EMAILS (CHANGED 27 Oct, user decision): no Brevo list any more
  ("Send to Brevo" is gone). Admins write and send the emails in the console;
  see "Festival emails from the console" below.
- WHY THE STAFF APP'S SERVER IS STILL INVOLVED (admins only): deleting
  someone's login from the console and sending festival emails need secret
  keys (Firebase service account, Brevo key) that can't live in a browser.
  Attendees never touch it (except an email's unsubscribe link).
- TESTED (27 Oct, by Claude, the running dev app + a pretend Firebase): 26
  browser checks (browse without an account; + → sign-up → saved and back;
  short password refused; Show password; account record fields; plan
  synced; emails switch; wrong password; "Too many tries" → Forgot
  password → reset email asked for; log in on a second phone brings plan
  and Seen it; team login → "One more step"; delete with wrong password
  refused; team member keeps login; delete removes records, plan and login
  and leaves the Brevo note; other phone signed out by itself; switch off →
  no asking; iPhone install-first + Continue on the web) and 20 checks of
  the offline bar and messages (on every screen, fixed while scrolling,
  header below it, + and Seen it messages with the film's name, nothing
  saved, Back online, sign-up page offline, Firebase unreachable, signed-in
  saving offline, privacy page); 16 automatic tests
  (`npm run test:accounts`); typecheck of both apps; database rules compile.
  NOT TESTED: real Firebase sign-up / reset emails, the new database rules
  for real (no local Firebase emulator on this Mac: no Java), real phones,
  the console's Attendees page with a real admin login, a production build
  (the running dev server shares the build folder).
- SETUP BEFORE IT WORKS:
  1. `npm run deploy:rules` (new attendee rules; until then the database
     refuses the sign-up records).
  2. Firebase console → Authentication → Settings → Authorized domains: add
     the attendee app's address (for the reset email's way back). Optional:
     Templates → Password reset, to word it for AFRIFF.
  3. For festival emails: see "Festival emails from the console" below. For
     deleting accounts from the console: `NUXT_FIREBASE_SERVICE_ACCOUNT`
     (same key push uses).
  4. Attendee project: `NUXT_PUBLIC_PRIVACY_EMAIL` (AFRIFF's privacy contact).
  5. Remove the yopmail admin logins first (OPEN RISKS 5).
- NEEDED FROM AFRIFF: written approval; their lawyer to approve the privacy
  text (`apps/pwa/app/pages/privacy.vue`; Nigeria Data Protection Act 2023;
  data stored in London) incl. how long accounts are kept; the privacy
  contact email; who owns the Brevo account (it sends the festival emails).
- COST: no new costs for accounts (Firebase's email/password login is free).
  A few database reads/writes per person per day (another reason for
  Blaze). Festival emails: Brevo's free plan sends about 300 a day; more
  needs a paid Brevo plan (AFRIFF's cost, from about $9/month; check
  brevo.com/pricing). Marketing emails = commercial use: another reason for
  Vercel Pro.

### Festival emails from the console (27 Oct 2026, user decision)
- CHANGED DECISION: emails no longer go through a Brevo contact list. Admins
  write them in the console and press Send. Brevo stays, ONLY as the postman
  that delivers them (user chose "Brevo, sending only" over Resend).
- STATUS: built and tested, NOT committed (on `dev` in this laptop's copy).
- WHO GETS THEM: everyone who ticked "Yes, AFRIFF can email me festival news
  and updates" (and hasn't switched it off in Profile). Nobody else, ever.
- CONSOLE → FESTIVAL EMAILS (`/admin/emails`, admins only, new tile on the
  console home): Ready / Off (what the server still needs), "N people said
  yes", the form (Subject; Message: plain text, blank line = new paragraph,
  https links clickable; optional Button text + Button link), a live preview
  of the email, "Send me a test" (only to you, "[Test]" in the subject),
  "Send to N people" (asks first; can't be called back). Below: Sent emails,
  each Sent / Sending / Paused, "Sent to N of about N", addresses Brevo
  turned down, "Continue sending", "Copy into the form". The half-written
  email is kept in that browser until it's sent.
- EACH EMAIL: AFRIFF header, "Hi <first name>,", the message, the gold
  button, and a footer "You're getting this because you said yes…" with
  Unsubscribe + Open the AFRIFF app.
- UNSUBSCRIBE: each person's own link. It opens a page "Stop festival emails
  from AFRIFF?" with one button (not instant: some email services open every
  link to scan it). The button switches their emails off, same as the
  Profile switch (which turns them back on). Links can't be made for anyone
  else.
- FREE-PLAN LIMIT: Brevo's free plan sends about 300 a day. Past that the
  email shows "Paused" with Brevo's reason; press "Continue sending" the next
  day. It carries on where it stopped: nobody gets it twice.
- ALSO REMOVED: the `brevo` / `brevoError` fields on attendee records and the
  `brevoRemovals` collection (deleting an account now simply means no more
  emails). firestore.rules updated to match the phone (checked: they
  compile); new `emails` rule (admins read).
- SETUP BEFORE IT WORKS (staff Vercel project, then redeploy it):
  1. `NUXT_BREVO_API_KEY` (Sensitive; Brevo → SMTP & API → API keys).
  2. `NUXT_EMAIL_FROM_ADDRESS`, e.g. news@afriff.com. It must be added in
     Brevo → Senders, Domains & Dedicated IPs; AUTHENTICATE THE afriff.com
     DOMAIN there (DNS records, done by whoever runs afriff.com) or emails
     land in spam. Optional: `NUXT_EMAIL_FROM_NAME` (default AFRIFF),
     `NUXT_EMAIL_REPLY_TO`.
  3. `NUXT_FIREBASE_SERVICE_ACCOUNT` (already needed for push).
  4. `npm run deploy:rules`.
  Then send yourself a test from the console.
- TESTED (27 Oct, by Claude): 20 automatic tests with a pretend database and
  pretend Brevo (only people who said yes; own name and link each; batches
  of 50; daily limit → paused → continue, nobody twice; refused address
  skipped and listed; wrong key → paused with what to do; unsubscribing
  mid-way; one sender at a time; finished email sends nothing; test email
  only to the admin; forged links refused; nothing typed becomes HTML);
  47 staff tests pass; typecheck both apps; staff app production build; the
  built server with a throwaway key (test link page, confirm page, broken
  links, database not answering → "try again" after 10 s, admin routes
  refuse without a login); screenshots of the email and the unsubscribe page
  at phone width. NOT TESTED: a real email through Brevo (needs the sender
  set up; Claude didn't use the Brevo key in apps/admin/.env), the console
  page with a real admin login, how Gmail / Outlook show the email.

### Profile page + avatar (27 Oct 2026, user request)
- STATUS: committed on `dev` in 7fe69bf with Open Peeps avatars; the switch
  to neutral faces (below) is NOT committed yet.
- HEADER: right of the bell, a round avatar (signed in) or a plain person
  icon (not signed in). Both open the Profile page (`/profile`); the circle
  gets a gold ring while you're on it.
- PROFILE PAGE (`apps/pwa/app/pages/profile.vue`), moved from the bottom of
  My Festival: the account card (avatar, name, email, "Saved to your
  account", "Festival emails from AFRIFF", Log out, Delete my account), the
  "Alerts on this phone" switch (also still on News), "Share anonymous
  counts with AFRIFF", and a link to the privacy page. Not signed in: the
  "Keep your plan on any phone · Sign up" card (comes back to Profile after
  signing up) and the same switches. The privacy page and the sign-up
  page's note now say "Profile" instead of "My Festival".
  CHANGED 28 Oct (user request): Log out and Delete my account are no longer
  in the account card; they're the very last thing on Profile, under the
  privacy link, with a divider above (`components/account/AccountActions.vue`;
  same confirm sheets as before). NOT committed yet.
- AVATARS (user asked for DiceBear with a seed; CHANGED 27 Oct, user: "use
  a neutral dicebear category"): style "Notionists Neutral" = a face only on
  a plain colour, no hair, body or skin tone (CC0 licence: free for
  commercial use, no credit needed). CLAUDE'S CHOICES, easy to change: that
  style out of the CC0 neutral ones (others: Lorelei Neutral, Pixel Art
  Neutral; Adventurer / Big Ears / Croodles Neutral need a credit), and the
  colours behind the face: light gold, gold, sky, lilac, coral, mint (no
  peach or browns, so it reads as a colour, not a skin tone). Replaces "Open
  Peeps" (people with hair and brown skin tones). The seed is the account's
  ID, so everyone gets their own random face and it's the same on every
  phone they log in on. Drawn ON THE PHONE with DiceBear's free code library
  (no request to DiceBear's website, works offline, nothing about the person
  leaves the phone). Initials show for a moment until it's drawn.
- SIZE: ~20 KB (compressed), loaded after the first screen and included in
  the offline copy like the rest of the app. (Open Peeps was ~107 KB, so it
  had been kept out of the offline copy; that special setup is gone.)
- No cost (DiceBear's code library is free and open source).
- TESTED (27 Oct, by Claude): 28 checks in a phone-sized test browser with a
  pretend login (avatar next to the bell, same picture on Profile and after
  reload, all account details and switches on Profile, counts switch saves,
  My Festival no longer repeats them, log out → person icon + sign-up card,
  sign-up returns to Profile / My Festival, privacy wording), run again
  after the switch to neutral faces; typecheck. NOT TESTED: real phones, a
  real login.

### Input checks on every form (27 Oct 2026, user request: "proper input validations for all the input fields")
- STATUS: built and tested, NOT committed (on `dev` in this laptop's copy).
- EVERY FORM, BOTH APPS: sign-up, log in, forgot password, "One more step",
  delete-account password, staff login / create account / forgot password,
  every console data form (films, screenings, events, venues, news, sponsors,
  jury, How to attend) and the "Tell attendees?" alert, the door view's seat
  count. Searches are capped at 100 characters.
- HOW IT FEELS: no red while someone is still typing a box for the first
  time; leaving a box shows its problem in plain words under it; once shown,
  it disappears the moment it's fixed; pressing the button marks every
  problem and puts the cursor on the first. Nothing is sent until it's right.
- ATTENDEE ACCOUNTS: names in any language (Ìfẹ́, Adé-Bàbá, O'Neil), no
  numbers or symbols; extra spaces tidied. Emails get specific messages
  ("needs an @", "Check the dots"…) and "Did you mean ada@gmail.com?" for
  typos like gmial.com / yahoo.con (a suggestion; tap to use it). New
  passwords (USER DECISION 27 Oct: basic rules only; an earlier stricter
  version refusing common passwords or your own name/email was dropped as
  too strict): at least 8 characters with an uppercase letter, a lowercase
  letter and a special character (like ! or #), written under the box before
  typing; the message says what's missing ("Add an uppercase letter and a
  special character"). Confirm password must match. Same rules for staff
  accounts. Logging in accepts any existing password.
- CONSOLE: required fields, length limits, whole numbers in range (running
  time 1–600, year 1895–2027, seats 1–5000, positions 0–999), proper links
  (posters https, trailers YouTube/Vimeo only), times, colours, event last
  day after the first, end time ≠ start, button text and link together, news
  banner end after its time. Save says "Fix the N fields marked in red".
- SAFETY: phones also drop any link that isn't a real web address when
  published data arrives, so a bad link (e.g. "javascript:…") can never
  become a button attendees tap.
- BUGS FIXED ON THE WAY: console number boxes (Running time, Year, Seats,
  Position) emptied themselves on every key press, so only the last digit
  typed was saved ("90" → 0); the door view started counting at 0 seats
  (= Full) if the seats box was left empty.
- TESTED (27 Oct, by Claude, again after the password change): 35 automatic
  tests (`npm run test:accounts`); phone-sized test browser: 28 sign-up /
  log-in / forgot checks + 17 confirm
  password / delete password checks (pretend Firebase), 25 console + staff
  login checks and 7 door seat checks (staff app with pretend login and data,
  all Firebase traffic blocked); typecheck both apps; staff app build. NOT
  TESTED: real phones; the attendee app's production build (the running dev
  server shares its build folder).

### Continue with Google (27 Oct 2026, user request: "just like how we did the DPfitPWA")
- STATUS: built and tested, NOT committed (on `dev` in this laptop's copy).
  Part of attendee accounts, so also PENDING AFRIFF'S WRITTEN APPROVAL.
- WHAT ATTENDEES SEE: a "Continue with Google" button at the top of the
  sign-up page, on both Sign up and Log in, with "or use your email" under it
  (CLAUDE'S CHOICE to put it at the top, since it's the quickest way in; easy
  to move under the form, where DP Fitness has it). One tap opens a small
  Google window to pick an account; then they're back where they were, with
  what they tapped saved. Next time, that's all: one tap.
- FESTIVAL EMAILS BOX FOR GOOGLE SIGN-UPS (27 Oct, user request: "we need to
  account for it"): the first time someone uses Google, a short "Finish
  signing up" screen comes before the account is made: the Google email
  they're signing up with, their name from Google (they can correct it), the
  "Yes, AFRIFF can email me…" box UNTICKED, the same privacy note as the email
  form, and "Create my account". The account is only made when they press it,
  so the emails choice is recorded exactly as for an email sign-up (counted as
  "said yes at sign-up" in Reports, with the wording they agreed to). If they
  had already ticked the box on the email form before tapping Google, it
  starts ticked and they can untick it. "Not now" = no account (signed out
  again, nothing saved). A name that won't do (one word only, numbers in it)
  is pointed at in red on the same screen.
- ALSO 27 Oct (asked by the session building VIP invitations): the sign-up
  page's privacy notes now say "only AFRIFF's festival team (admins and
  editors) can see it", since editors can now see attendee names and emails.
- SAME EMAIL BOTH WAYS: a Gmail address that signed up with a password can
  also use Google: same account, same plan. Any other address that has a
  password is told "This email already has an AFRIFF account with a password.
  Log in with your email and password." The wrong-password message now also
  says "Signed up with Google? Use Continue with Google".
- DELETE MY ACCOUNT (Profile): people who use Google confirm with Google
  instead of typing a password ("Confirm with Google and delete").
- WHERE THE BUTTON DOESN'T SHOW: inside Instagram's, Facebook's, TikTok's
  (and similar) built-in browsers, because Google refuses to sign anyone in
  there; a note says to open the page in Chrome or Safari. (Until 28 Oct also
  hidden in the iPhone Home Screen app until a setup step was done; CHANGED
  28 Oct, user request "make sure it works just like" DP Fitness: it shows
  there now. See "Install toast on every page" → GOOGLE.)
- HOW (same as DP Fitness): Firebase's own Google sign-in. A pop-up window
  everywhere, except the iPhone Home Screen app, where the whole page goes to
  Google and comes back (a pop-up there opens in Safari and never returns).
  Privacy page: says Google passes on the name and email (and a profile
  picture link the app doesn't use), never the Google password.
- COST: none (Firebase's Google sign-in is free). About 4 KB more to download
  after the first screen; Google's sign-in helper loads only on the sign-up page.
- SETUP BEFORE IT WORKS:
  1. Nothing to switch on: Google sign-in is already enabled in the Firebase
     project (checked 27 Oct: the Google window reaches Google's account
     chooser). Optional: Firebase console → Authentication → Sign-in method →
     Google, to set the name and support email Google shows people.
  2. Firebase → Authentication → Settings → Authorized domains: the attendee
     app's address (already on the accounts list).
  3. For the iPhone Home Screen app: add the app's own sign-in address in
     Google Cloud and one Vercel setting on the attendee project (exact clicks
     in DEVELOPER.md "Continue with Google" → SETUP 3), then redeploy and test
     on a real iPhone.
- WATCH OUT: staff logins share the same login list. A team member whose
  staff login is a Gmail address and who taps "Continue with Google" in the
  attendee app may find their staff PASSWORD stops working (Firebase swaps it
  for Google). Fix: "Forgot password?" on the staff login. Tell the team.
- TESTED (27 Oct, by Claude): typecheck; production build for Vercel; the real
  Firebase in a phone-sized test browser (Google's helper loads when the
  sign-up page opens, the tap opens Google's account chooser); 35 checks with
  a pretend Firebase and pretend Google, 48 after the "Finish signing up"
  step (new person from a film page's + Schedule, back with it saved; the
  step: unticked box, email shown, no record until "Create my account", ticked
  there = yes, ticked first then unticked = no, "Not now" = no account;
  accents; log out and back in with Google skips the step; one-word name;
  window closed = nothing said; password account with the same email;
  whole-page route there and back; Instagram; iPhone Home Screen; delete with
  Google). NOT TESTED: a real Google account
  (Claude may not sign in), real phones, the iPhone Home Screen route for real.

### VIP invitations, contacts and guest lists (27 Oct 2026, PM brief)
- STATUS: built and tested (pretend database + pretend Brevo), NOT committed,
  NOT deployed. Opening-night invites must go out 28–29 Oct.
- DECISIONS (user, 27 Oct, answering the brief):
  - Sign-up stays as built: Home first, sign-up only when saving, email +
    password or Google. The brief's "sign up first, no password" screen is
    NOT built. From its section 1 only: the box now reads "AFRIFF may email
    me invitations and festival updates. I can unsubscribe anytime."
    (MARKETING_CONSENT; people who ticked the old wording keep it on their
    record), and every sign-up is a contact, one per email.
  - "Festival emails" stays as it is; invitations are a NEW page.
  - CHANGED 27 Oct (user): NO Brevo templates. Every invite is AFRIFF's own
    invitation email, built into the app; Brevo only delivers it. No designer
    needed, no placeholders to learn.
  - VIP links open the app's normal sign-up with "You're invited", then put
    the person in that group, marked VIP.
  - Who can get an invite: app users only if they ticked the box (their own
    choice in the app decides); guests added by hand only if an admin ticks
    "This guest agreed to receive AFRIFF invitations" (saved with who and
    when). Everyone else is left out, and the send screen says how many and why.
  - QR check-in (brief section 8): NOT this festival. No QR_IMAGE_URL /
    INVITE_CODE. The door team uses the printed guest list.
  - Editors prepare and test invites; ONLY admins send (checked on the server).
  - CHANGED DECISION: editors can now see attendees' names and emails (the
    Contacts page needs them; database rules changed). The Attendees page
    (delete accounts, spreadsheets) stays admins-only. Privacy page and the
    sign-up notes say so; AFRIFF's lawyer should see the change.
- CONSOLE → CONTACTS (admins + editors): one list, one person per email: app
  sign-ups (appear by themselves), guests added by hand, VIP-link sign-ups.
  Search; filters (group, VIP, can / can't be emailed, how they joined); tick
  people → add to a group or take them out; tap someone → groups, VIP, notes
  (hand-added guests also name, email, agreement); remove; spreadsheet.
  Groups: add and rename (editors too), delete (admins). "Add a VIP by hand":
  name, email, groups, VIP, the "agreed" box; labelled "Added by AFRIFF". An
  email already on the list isn't added twice (they just get the groups).
  Someone taken out of a group can't put themselves back through a VIP link.
- VIP SIGN-UP LINKS (admins, on Contacts): one per group, with what guests see
  (e.g. "Opening night"). Address: <attendee app>/vip/<24-character secret>.
  Copy, switch off / on, delete; shows how many joined. The page: "You're
  invited · Opening night" → Sign up / Log in (the app's own page) → back →
  "You're on the guest list". Already signed in: one tap. Without the emails
  box ticked, it's offered there ("Needed to get your invitation by email").
- CONSOLE → INVITATIONS (admins + editors), saved as you type, email only:
  - The event: fill in from a festival event, or type it (Lagos time):
    name, day, start and end, venue, map link (empty: Google Maps search for
    the venue), dress code.
  - THE EMAIL (`renderInvite` in apps/admin/shared/invites.ts; the console's
    preview is exactly what's sent): navy header with the AFRIFF emblem and
    "1–7 November 2026 · Lagos"; the artwork (optional image link) full width;
    gold "YOU'RE INVITED" and the event's name as the headline; "Dear <first
    name>," and the message (empty: "It would be our pleasure to have you as
    our guest at this year's Africa International Film Festival. Your
    invitation details are below."); a cream card with WHEN, WHERE, DRESS CODE
    and GUEST (<full name>, "Your name is on the guest list."); gold "Add to
    calendar" and "Get directions"; "We look forward to welcoming you. The
    AFRIFF team"; navy footer with the app link and the guest's own
    Unsubscribe. Subject: empty = "You're invited: <event>". An update says
    "CHANGE OF PLAN" (coral), needs "What has changed", and "Your place on the
    guest list is unchanged."; subject "Change of plan: <event>". Every detail
    is real text (not only in the artwork), so nothing is lost when an email
    app hides images. Built for Gmail, Outlook, Apple Mail and phones (tables,
    inline styles; buttons fill the width on phones); Gmail and Outlook show
    Arial where Apple Mail shows the app's Archivo.
  - Who: whole groups + people picked − people left out; each person once;
    live count ("2 people get it, each once · 1 left out: haven't agreed").
  - Preview (filled in for the first guest); test to up to 5 typed addresses
    ("[Test]" in the subject).
  - Editors: "Ask an admin to approve" (admins can send it back with a note).
    Admins: "Send now…" or "Schedule…" (Lagos time, 10 minutes to 71 hours
    ahead: Brevo holds it and it can be called off until then) → "Send to 87
    people?" with who's left out and why → sent.
  - After: the log (sent, delivered, opened, bounced, unsubscribed; Brevo's
    numbers lag a few minutes; "opened" is a rough guide), "Didn't arrive" with
    Fix → "Resend to fixed addresses", "Send to new people only…", "Send an
    update…" (short change-of-plan email to the same people, same approval),
    "Guest list". The list page's "Delivery numbers" loads them for every invite.
- GUEST LIST (admins): per invite (who it went to) or per group (everyone in
  it, emailed or not), A–Z by last name: #, last name, first name, group, VIP,
  an empty "Arrived" box. Print (black on white) or spreadsheet.
- IN THE EMAIL: each guest's own Unsubscribe link → "Stop emails from AFRIFF?"
  → button: no more invitations or festival emails (for app users, the same as
  the Profile switch). "Add to calendar" → Google Calendar, or a calendar file
  for Apple / Outlook.
- BREVO SETUP (PM; nothing here costs money until a plan is chosen):
  1. Brevo → Senders, Domains & Dedicated IPs → Domains → Add afriff.app.
     Brevo shows the exact records (or adds them itself if it supports the DNS
     provider): a TXT "brevo-code" (proves AFRIFF owns the domain), DKIM (two
     CNAMEs, brevo1._domainkey and brevo2._domainkey, or one TXT) and a DMARC
     TXT (_dmarc). Brevo doesn't need SPF. Whoever runs afriff.app's DNS adds
     them; checking can take up to 48 hours.
  2. Senders → add invites@afriff.app.
  3. Staff Vercel project: NUXT_INVITE_FROM_ADDRESS=invites@afriff.app (plus
     NUXT_BREVO_API_KEY and NUXT_FIREBASE_SERVICE_ACCOUNT, as festival emails),
     then redeploy. 4. `npm run deploy:rules`.
- BREVO PLAN (PM: check brevo.com/pricing before paying): the free plan sends
  300 emails a day in all (tests, invites and festival emails together) and
  adds Brevo's branding; a 300-guest opening night would use a whole day.
  Recommendation: Starter for Oct–Nov, reported from about $9/month for 5,000
  emails a month with no daily limit; a bigger tier only if festival emails go
  to thousands. Cancel after the festival if not needed.
- TESTED (27 Oct, by Claude): 30 automatic tests with a pretend database and
  pretend Brevo (each guest's email: their name, every detail in text, their
  own unsubscribe link, Add to calendar and Get directions, nothing typed
  becomes code; each guest once; consent; batches; daily limit pauses and
  Continue carries on, nobody twice; refused addresses; one sender at a time;
  unfinished invites refused; new people only; update to the same people minus anyone who
  unsubscribed; bounced address fixed and resent; scheduling limits and calling
  off; test sends; unsubscribe links, forged ones refused; calendar in Lagos
  time). All 85 staff tests pass; both apps typecheck; database rules compile
  (dry run, NOT published). Phone-sized browser with a pretend Firebase: 37
  console checks (contacts, add VIP + no duplicates, groups, VIP link, guest
  list + print, invite form, live count, the preview is the real email and
  shows the message as it's typed, test, "Send to 2 people?",
  log + fix, update draft, editor can't send / asks for approval / no guest
  list) and 14 attendee checks (VIP link → sign up → back → in the group;
  signed in → one tap + emails box; switched-off and unknown links).
  Screenshots of the invitation (phone and desktop, with and without artwork)
  and of the update email.
- NOT TESTED: a real email through Brevo and how Gmail / Outlook / Apple Mail
  show it, Brevo's statistics and scheduling for real, the console with real logins, real
  phones, the rules once published. FIXED 27 Oct: NUXT_FIREBASE_SERVICE_ACCOUNT
  in apps/admin/.env now holds the real key (the downloaded .json file as one
  base64 line; checked: it reads the live database). The staff Vercel project
  still needs it too.
- BEFORE THE REAL SEND (brief: test with 3 people): make a group "Test", put
  3 people in it, send the real invite to "Test", check inbox and spam,
  Unsubscribe, Add to calendar and the guest list; then send to the real group.
- NEEDED: the PM's Brevo account (invite Michael), access to afriff.app's DNS,
  each event's artwork as an image link (optional), AFRIFF's OK on the privacy
  change.

### Superadmin (27 Oct 2026, user request)
- STATUS: built and tested, NOT committed (on `dev` in this laptop's copy).
  Needs `npm run deploy:rules` before it does anything for real.
- WHO: only michaelakpuofoba@gmail.com and tithera14@gmail.com. The list is
  in TWO places that must match (an automatic test checks they do):
  `apps/admin/shared/team.ts` and `superadminEmails()` in `firestore.rules`.
- WHAT CHANGES ON THE TEAM PAGE:
  - Admins can still give any role to anyone who isn't an admin, including
    making them an admin. It asks first: "…you won't be able to take it back".
  - Admins can't change or remove an admin (role box greyed out, "Admins
    can't remove other admins."). Nobody can change their own role (as before).
  - Superadmins can change anyone's role, including taking admin access away
    (asks first). Nobody can change a superadmin.
  - Admins never see the word "superadmin": the two owners show as "Admin"
    like everyone else. Only the two owners see a "Superadmin" tag (on their
    rows and top-right of the console).
- HOW (CLAUDE'S CHOICES, easy to change): superadmin is NOT a role saved in
  the database. The owners' profiles say "admin"; the extra power comes from
  their sign-in email. So nobody can make someone a superadmin from the
  console, and every existing "admin" check keeps working. The database
  rules enforce all of it (not just the screen), and the staff app's server
  treats the two owners as admins too. If an owner's profile ever says
  something other than admin, it puts itself back to admin when they open
  the console.
- CONFIRM YOUR EMAIL (once, each owner): the power only switches on once
  Firebase has confirmed the owner really owns that email; otherwise anyone
  could create a login with one of those addresses and become superadmin.
  If not confirmed yet, the Team page shows a "Confirm your email" card:
  Send me the link → tap the link in the email → "I've confirmed it". Signing
  in with Google confirms it too. An owner who signs up fresh lands on the
  "Almost there" page with the same card, and is let in as soon as it's done.
- ALSO TIGHTENED: a new staff sign-up can only save its own email on its
  profile (stops someone posing as an owner on the Team page).
- TESTED (27 Oct, by Claude): 25 pretend requests against the new
  firestore.rules with Firebase's own rules-test service (nothing published;
  the old rules fail 12 of them, so the test is real); 8 automatic tests
  (`npm run test:accounts`); 41 checks in a phone-sized test browser with a
  pretend login (admin view, owner view, unconfirmed email, profile fixing
  itself, fresh owner sign-up); typecheck; rules compile. NOT TESTED: real
  logins, the real confirm email.
- TO DO: `npm run deploy:rules`, then each owner opens Team once and
  confirms their email if the card shows.

### Team page tabs + one email for both apps (27 Oct 2026, user request)
- STATUS: built and tested, NOT committed (on `dev` in this laptop's copy).
  No rules change, no new settings.
- TEAM PAGE: two tabs. "With a role · N" (admins, editors, door volunteers)
  opens first; "All members · N" lists everyone with a staff login,
  "No access yet" included. The "N people are waiting for access" banner
  has a "See them" button that opens All members. Someone whose role you
  just took away stays on screen until you switch tabs (so they don't
  vanish mid-edit). Attendees who only use the festival app are NOT on Team
  (they're under Attendees), until they log in to the staff app.
- SAME EMAIL IN BOTH APPS (already worked; smoothed): both apps share one
  list of logins, so one email = one password. A team role (users/{uid})
  and an attendee account (attendees/{uid}) are separate records on that
  login. Festival-app user becoming a volunteer: they LOG IN on the staff
  app (not Create account) with the same email + password; their "No access
  yet" record is now made by itself (no more "Finish setting up" button),
  they show under All members, an admin gives the role. Volunteer using the
  festival app: they log in there with the staff email + password. Staff
  login messages now mention the festival app ("…maybe from the AFRIFF
  festival app. Log in with that password instead."; wrong password adds
  "Joined the festival app with Google? Tap “Forgot password?” to set a
  password for this login.").
- STILL TRUE: a staff Gmail login that taps "Continue with Google" in the
  festival app can lose its password (see "Continue with Google" → WATCH
  OUT); "Forgot password?" on the staff login fixes it.
- TESTED (27 Oct, by Claude): 23 checks in a phone-sized test browser with a
  pretend Firebase (tabs and counts, See them, role changes in both tabs,
  festival-app login → "Almost there" with its record made, a volunteer's
  record never touched, both messages); staff typecheck; 85 automatic tests.
  NOT TESTED: real logins; that "Forgot password?" adds a password to a
  Google-only login (Firebase's documented behaviour, not tried for real).

### Search in the console (27 Oct 2026, user request: "add the search functionality where needed")
- STATUS: built and tested, NOT committed (on `dev` in this laptop's copy).
- NEW SEARCH BOXES (CLAUDE'S CHOICE of where it's needed):
  - Team: by name or email; role and venue match too ("volunteer",
    "landmark"). Searches the open tab; finding nobody with a role but
    someone under All members offers "Look in All members (N)".
  - Approvals: by item, kind ("films"), who sent it ("afriff.com" finds the
    automatic sync's changes) or the field changed ("synopsis"); "N of N
    waiting".
  - Invitations: by event, group, who started it or status ("draft").
  - Guest list: find a guest on screen (e.g. at the door). Print and
    Spreadsheet ALWAYS have everyone, and each guest keeps their number.
- BETTER EVERYWHERE (also Festival data lists, Attendees, Contacts, the
  invitation people picker): capitals and accents don't matter ("ife ati
  iku" finds "Ìfẹ́ àti Ikú", "adebayo" finds "Adébáyọ̀"), and each word can
  match anywhere ("lady landmark"). Festival data lists also search more
  fields: films by country, language, genre, cast, year, premiere;
  screenings by Public/Industry and status; events by speaker's role, room,
  venue, who can attend; venues by address; news by message and type; jury
  by roles. "Nothing matches" when nothing does.
- FIXED ON THE WAY: the search icon overlapped the typed text on Attendees
  and Contacts.
- NO SEARCH ADDED (short lists): My changes (editors), Sent emails, VIP
  links, Reports, door view.
- TESTED (27 Oct, by Claude): 25 checks in a phone-sized test browser with a
  pretend Firebase (every box above, incl. printing the guest list while
  searching), the 23 Team checks again, 4 new automatic tests (89 in all),
  staff typecheck. NOT TESTED: real logins and real data.

### Push: changed screenings at Publish + invitations by push (27 Oct 2026, user request)
- STATUS: built and tested, NOT deployed. Invitation pushes committed on `dev`
  (9b2d226); the Publish-page alerts NOT committed yet. No rules change, no
  new settings, no cost.
- WHY (user's test, 27 Oct): an admin changed a screening (s3 marked
  "moved"), saved, published: no push on a phone with alerts on, signed in
  or not. Checked in the live database: the change WAS published, but no
  alert was posted (the "Tell attendees?" card under the form needs "Post
  alert" pressed), so Publish had nothing to send. Push delivery itself works
  (below).
- NOW, ON THE PUBLISH PAGE: "N changes since the last publish: tell
  attendees?" lists every screening and event whose day, time, venue, screen,
  room or status changed compared with what attendees have, one alert each
  ("Lady moved", "Lady: new time", "Lady cancelled", "Lady is back on"), with
  a tick box. Ticked ones are posted as urgent alerts (Home banner, News,
  linked to the item) just before publishing and sent as push notifications
  to every phone with alerts on, logged in or not. Up to 3 changes: ticked by
  default. More (CLAUDE'S CHOICE, e.g. loading the real timetable changes
  every time at once): none ticked, the admin picks; still at most 3 pushes
  per publish. Works for editors' approved changes too, and a screening
  changed several times before a publish gets ONE alert. An item the team
  already posted its own alert for since the last publish is left out. The
  form's "Tell attendees?" card stays, for wording it yourself (admins: its
  "No thanks" is now "Close", since Publish offers it anyway). Rule and
  wording: `apps/admin/shared/changeAlerts.ts`.
- INVITATIONS BY PUSH (user request: "the user should receive the push
  notification and receive the invitation email as well"): when an invitation
  (or a change-of-plan update) is sent with "Send now", each guest who uses
  the attendee app, is LOGGED IN and has "Alerts on this phone" on, also gets
  a push: "You're invited: Opening Night Gala / Sunday 1 November 2026, 7:00
  PM · Filmhouse Landmark. Your invitation is in your email." (update: "Change
  of plan: …" + what changed). Once per guest. Hand-added guests (no app
  account) get the email only. The console shows "N got a push" on the
  invite. A push failing never stops the emails.
  - SCHEDULED invites: CHANGED 28 Oct (user request: "when an invitation is
    sent … those users' signed-in attendee apps should receive a push"; then
    "I would prefer the cloud function approach"). They get their push too,
    within a minute of their time, from a Firebase Cloud Function,
    `pushScheduledInvites`. Needs Blaze and a deploy; until then the console
    says scheduled ones go by email only. See "Invitation pushes for
    scheduled sends + alerts on the VIP page".
  - HOW: a phone with alerts on sends proof of who's logged in when it joins
    the alerts list; the staff server links that phone to the account
    (`pushTokens`, server only). Logging out, alerts off or deleting the
    account unlinks it. Privacy page and the switch's text say so.
- TESTED (27 Oct, by Claude): REAL push in a real Chromium with the app's own
  service worker, the live Firebase project and the real staff server routes,
  sent only to that test browser (never to the "news" list): push address
  with the app's key, joining the alerts list, an announcement shown, one sent
  through a private test topic shown, an invitation push to a linked account
  shown, unlinking, a forged sign-in refused, leaving the list (10/10).
  Dry run on the live data: the new Publish page would have offered "It's the
  Blackness moved" for the user's test. 100 automatic tests (11 new), both apps
  typecheck. NOT TESTED: the Publish page and Invitations with a real admin
  login, a real phone (Android / iPhone Home Screen app), a real invitation
  email.
- WHERE ATTENDEES SEE IT: each alert is a News item: top of News (the bell's
  page, urgent style, tag, "View screening"), unread count on the bell, Home
  banner, and the push (tapping opens News).
- SECOND TEST (27 Oct, 15:17 UTC): published again with s24 marked "moved",
  still no alert created. The fix (cac70d1) is on GitHub `dev` but NOT on
  `main`, so a console deployed from main (or before 14:26) still has the old
  Publish page. ALSO FIXED (NOT committed): the list was only worked out when
  the Publish page opened, so a change made in another tab while it was open
  was missed; it's now checked again when Publish is pressed and when you come
  back to the tab, and the confirm box names the alerts it will post.
- HOW TO TELL THE CONSOLE HAS THE FIX: after changing a screening, Publish to
  app shows "1 change since the last publish: tell attendees?" above the
  button. No box = old version: deploy the staff app from `dev`.
- TO TRY: deploy both apps; on a phone turn alerts on; in the console change a
  screening's time, save, open Publish to app, check the alert is ticked,
  publish. The phone should buzz within seconds, and the alert is in News.

### Confirmations in the app's own look (27 Oct 2026, user request: "use a proper confirmation UI instead of the default javascript one, make sure nothing is like that")
- STATUS: built and tested, NOT committed, NOT deployed.
- WHAT CHANGED: all 16 browser pop-ups in the staff app (14 "OK / Cancel"
  boxes and 2 "type a note" boxes) are now the app's own bottom sheet: the
  question as the heading, what happens in plain words, a button named for
  the action ("Publish and send 1 notification", "Delete group", "Call it
  off") and Cancel. Things that can't be undone get a red button. The two
  note boxes (rejecting a change in Approvals; sending an invite back to the
  editor) are a text box inside the sheet. Closing the sheet (✕, Esc, tapping
  outside) = Cancel. The Publish sheet lists the alerts it will post. The
  attendee app had none.
- RULE FROM NOW ON: no browser pop-ups anywhere (DEVELOPER.md, design rules).
- ALSO FIXED: every bottom sheet in both apps (My plan, How to attend, jury
  bio, the console's sheets) had no space under its last button on most
  phones and laptops (two spacing rules cancelled out); now 24px, or the
  iPhone home bar's room if that's more.
- TESTED (27 Oct, by Claude): staff typecheck, 100 automatic tests, and in a
  real browser on the staff dev server at phone and desktop sizes: confirm →
  yes, Cancel → no, Esc → no, the note box focused and its text kept, a
  required note refused when empty; screenshots of Publish, Delete and
  Reject. NOT TESTED: each screen's own sheet with a real admin login (they
  all call the same sheet).

### afriff.com film sync, every 15 minutes (26 Oct 2026, user request)
- SWITCHED OFF 28 Oct 2026 (user decision: "for now"; commented out, not
  deleted). The `syncFromAfriff` block in `functions/src/index.ts` is
  commented out, so `npm run deploy:functions` deploys only
  `pushScheduledInvites`. The console's "afriff.com sync" card is hidden too
  (commented out in `AdminDataHome.vue`). It had never been deployed (checked
  28 Oct: the Cloud Functions service isn't even switched on in afriff-app),
  so nothing runs anywhere. Films change only by hand in the console. TO
  SWITCH BACK ON: uncomment the block and its three imports in index.ts and
  the card in AdminDataHome.vue, then (on Blaze) `npm run deploy:functions`.
  To stop it quickly once deployed: Google Cloud console → Cloud Scheduler →
  firebase-schedule-syncFromAfriff-europe-west2 → Pause.
- WHAT: a Cloud Function, `syncFromAfriff` (folder `functions/`), checks
  afriff.com every 15 minutes and brings the FILMS in the database up to
  date: title, synopsis, poster, director, cast, country, language, genre,
  running time, year, programme section, trailer. Films new on afriff.com
  are added. Nothing is ever deleted. It never publishes: attendees see the
  changes after an admin presses Publish to app (the brief's approval rule).
- TIMES AND DATES: afriff.com has none to fetch yet. Its schedule page says
  "Screening times are added when the programme is out", its film records
  have no showtime field, and masterclasses have no per-class dates. The
  function WATCHES for them: the console card says when the schedule page
  changes or the film records gain new kinds of details. Adding times to the
  sync is then a small job, once their format is known.
- THE RULE (keeps "the database is the master copy"): a field only changes
  when afriff.com changes it, and only if ours still holds afriff.com's
  previous value. If the team edited that field, the change waits in
  Approvals ("afriff.com changed the synopsis of …", from "afriff.com sync
  (automatic)"); approving writes only those fields (`approveChange` now
  honours a change's `fields`). afriff.com emptying a field never empties
  ours. A film the team deleted isn't added back. The FIRST check changes
  nothing; it only learns what afriff.com says. So the 25 Oct cleanup
  (capitals, 2:Love's synopsis, removed trailers, "Not Specified"…) stays.
- CLEANING (same as the 25 Oct sync by hand): ALL-CAPS titles and names get
  normal capitals; "Not Specified" countries and "Other" languages dropped;
  only YouTube / Vimeo trailer links (Drive / Mega screeners ignored);
  poster paths become https://afriff.com/__l5e/... links; "coming soon"
  synopses count as none; genre = afriff.com's first 2 tags; afriff.com's
  duplicate "Ife Ati Iku" listing only fills gaps in ours (`ALIASES` in
  `functions/src/config.ts`). NOT checked: whether a YouTube / Vimeo
  trailer is private (this Mac can't reach YouTube or Vimeo to test it).
  Clear a bad one in the console and the sync never puts it back.
- HOW IT READS afriff.com: there's no feed. The film list is a JavaScript
  file (film-selection-test-<fingerprint>.js) linked from afriff.com/program.
  Its name only changes when its contents do, so each check downloads just
  /program and /program/schedule (~150 KB), plus the film file only when its
  name changed. The file runs inside QuickJS, a JavaScript engine compiled to
  WebAssembly (no network, no files, no access to our keys; 64 MB and 5 s
  limits), and only plain data comes out.
- SAFETY: fewer than 20 films, under half of last time, or many without
  titles → change nothing and show the error. One all-or-nothing save per
  check; if someone saves a film in the console mid-save, nothing is saved
  and the next check redoes it. Every check that changes something leaves a
  log with before/after values (Firestore `syncRuns`).
- WHERE TO SEE IT: console → Festival data → "afriff.com sync" card
  (admins): last check, last change, "Not on phones yet: Publish to app",
  afriff.com changes waiting in Approvals, the schedule watch, films no
  longer on afriff.com, and a warning if there's been no check for 45 min.
  Firestore: `sync/afriff` (status), `sync/afriff-baseline` (what
  afriff.com said last time), `syncRuns` (logs). New rule `match
  /sync/{id}` (admins read) → `npm run deploy:rules`.
- COST: needs Blaze (Cloud Functions and the Cloud Scheduler job aren't on
  the free Spark plan). Expected about $0: 2,880 runs a month of a few
  seconds each (free allowance: 2 million), 1 scheduler job (3 free per
  account), ~2 tiny database writes per check; at most a few cents a month
  to store the function's code. Set a budget alert anyway.
- TESTED: `npm run functions:test` (37 tests: cleaning, sandbox limits, the
  rule above, a "whole season" of checks against a pretend afriff.com and a
  pretend database, a broken site, an edit during a save).
  `npm run functions:check` = dry run against live afriff.com and the
  published copy; changes nothing. Live rehearsal 26 Oct (real afriff.com,
  pretend database holding our published films): check 1 learned 104 films
  and changed nothing; check 2 said "unchanged" in 2 s. Rules compile
  (dry run); staff console typecheck + build pass. NOT TESTED: the real
  deploy (needs Blaze), the card with a real admin login.
- NOT SYNCED: masterclasses, jury and partner logos (films only for now;
  the same code can be extended).
- TO DEPLOY (Michael, once on Blaze): `npm run functions:install`, `npm run
  deploy:rules`, `npm run deploy:functions` (runs typecheck, tests and the
  build first). The first check comes within 15 minutes and the card says
  "first check done". To run one now: Google Cloud console → Cloud Scheduler
  → firebase-schedule-syncFromAfriff-europe-west2 → Force run. Logs:
  `npm --prefix functions run logs`. The `functions/` folder has its own
  package.json and lockfile, outside the npm workspaces, so the apps'
  installs and Vercel builds don't change.

### Push test undone + afriff.com re-check (28 Oct 2026, Michael's request)
- Undid the 27 Oct push-notification tests in Firestore and published (28 Oct
  ~00:50 Lagos, "Undo push test + afriff.com check (Claude, for Michael)"):
  "moved" tag removed from s3 (It's the Blackness) and s24 (Three Black Men),
  the "Three Black Men moved" alert deleted, and the Demo door volunteer's
  test counts for Sun 1 Nov at Landmark (Lady, Hadda "Full") cleared. No push
  went out for the undo. Nothing else had changed since the 25 Oct sync.
- afriff.com re-checked: same 104 films, jury, partners and masterclasses.
  Two newer details taken: One Woman One Bra's cast (afriff.com removed a
  doubled name) and Shared Space's languages (Assamese added). The other
  differences are our deliberate 25 Oct cleanups, kept. In the Shadows 75's
  Vimeo trailer is still private (404), so it stays off.
- Left alone (not festival data): test accounts, the "Test" group, its VIP
  link and the test invitation.
- Backups (outside the project, they hold attendee emails):
  /Users/mac/Documents/afriff-backups/before-revert-2026-10-28.json.

### Invitation pushes for scheduled sends + alerts on the VIP page (28 Oct 2026, user request)
- STATUS: built and tested, NOT committed, NOT deployed. No rules change, no
  new settings. Needs the Blaze plan for the Cloud Function (see COST).
- WHY: the user's request: "when an invitation is sent to a vip or group, or
  whichever user, those users' signed-in attendee apps should receive a push
  notification". Checked in the live database: the one real invitation (27 Oct,
  2 guests, both with app accounts) was SCHEDULED, so no push went (scheduled
  ones were email only), and neither guest's phone had "Alerts on this phone"
  switched on while logged in, so even Send now couldn't have reached them.
- WHO GETS A PUSH (same rule for Send now and scheduled): every guest of the
  invitation (from a group, picked by hand, or a VIP link sign-up) who has an
  app account with the same email AND is logged in on a phone with "Alerts on
  this phone" switched on. Once each. Phones only show notifications the
  person has allowed (a browser rule nobody can get round), so a guest who
  never turned alerts on gets the email only. Hand-added guests with no app
  account: email only (if they later sign up with that email, later invites
  reach their phone).
- SCHEDULED (USER DECISION 28 Oct: a Cloud Function, chosen over a Brevo
  webhook that was built first and then removed; the webhook needed no paid
  plan, the function keeps it all in Firebase): when an admin schedules an
  invitation, the staff app notes the time on it. A Cloud Function,
  `pushScheduledInvites` (folder `functions/`, next to the afriff.com sync),
  checks every minute and, once the time has come, sends the push to the same
  people by the same rule, with the same words as Send now. Each guest once.
  Calling the invite off cancels its pushes. If sending fails it tries again
  a couple of minutes later; more than 3 hours late (e.g. deployed after the
  time) it drops them, as the email has long arrived. Send now pushes still
  go from the staff app straight away (they don't need Blaze).
- CONSOLE: Invitations (admins) shows "Push notifications for scheduled
  invitations: On" when the function has run in the last 15 minutes, else
  "Off … needs Firebase's Blaze plan: ask the developer". The send
  confirmation and the "Scheduled:" note say which applies. A sent invitation
  whose time passed 5 minutes ago with its pushes not sent says so ("Push
  notifications not sent yet…"). The invite form now says "By email, plus a
  push notification for guests who use the AFRIFF app".
- COST (Blaze needed: Firebase only runs scheduled functions on it, as for
  the afriff.com sync): expected about $0. About 43,200 runs a month (free
  allowance: 2 million), a second Cloud Scheduler job (3 free; the sync uses
  1), about 1 database read a minute when nothing is due, and a status write
  every 10 minutes. Set a budget alert anyway.
- VIP LINK PAGE (attendee app): "You're on the guest list" now shows the
  "Alerts on this phone" switch, worded "A notification on this phone when
  your invitation is sent, as well as the email". iPhone in Safari: how to add
  the app to the Home Screen, log in there and turn alerts on in Profile.
- TESTED (28 Oct, by Claude): 11 new function tests with a pretend database
  and pretend FCM (nothing before the time; at the time every guest signed
  in with alerts on, all their phones, once; the same words as Send now;
  "Change of plan" updates; already pushed / unsubscribed / never handed to
  Brevo left out; gone phones unlinked; FCM down → retried after the hold;
  one failing invite doesn't stop others; waits while the staff app is still
  sending; over 3 hours late dropped; called off; the status note's timing);
  48 function tests and 101 staff tests pass (2 new: scheduled sets the time,
  Send now doesn't, calling off clears it); both apps and the functions
  typecheck; the bundle builds with the shared code inside and needs no extra
  packages in the cloud. NOT TESTED: the real deploy (needs Blaze), a real
  scheduled invite reaching a real phone, the console screens with a real
  admin login, the VIP page's switch on a real phone (hidden in `npm run
  dev`).
- TO DEPLOY AND TRY: switch Firebase to Blaze (with a budget alert), then
  `npm run functions:install` and `npm run deploy:functions` (deploys this
  only, since the afriff.com sync is switched off; see "afriff.com film sync"),
  and deploy both apps from this branch. Within a few minutes Invitations
  shows "On". On a phone: log in to the attendee app as a guest in the "Test"
  group, Profile → "Alerts on this phone" on. Schedule a test invite to
  "Test" 10 minutes ahead: at that time the email arrives, the phone buzzes
  within a minute ("You're invited: …"), and the invite shows "1 by push
  too". Logs: `npm --prefix functions run logs:invites`.

### Official screening schedule loader (28 Oct 2026)
- STATUS: script checked and fixed, NOT committed. RUN WITH --write
  --add-missing (checked 29 Oct: 124 official screenings and 30 "Also
  screening" films in the database, no samples left) but NOT PUBLISHED yet
  (last Publish to app 28 Oct 11:42 UTC), so phones still show samples.
  `scripts/schedule/` (load-schedule.mjs, plan.mjs, the sheet as JSON).
  Dry run: `node scripts/schedule/load-schedule.mjs` (changes nothing). Load:
  add `--write` (backup first; with `--add-missing` it also makes title-only
  films). Never publishes: Publish to app afterwards.
- DECISIONS (Claude's, easy to change, in plan.mjs): a film playing on several
  screens at the same time (47 cases in the sheet, e.g. Screens 1 & 3) is ONE
  screening ("Screens 1 & 3", seats added up, one + button, one door queue),
  not one per screen. "Love and Blood" = SOYAYA da JINI (love and blood),
  "The Memory of Cleo" = The Memory of Mother Cleo (CHECK with AFRIFF).
  Films with no running time get their slot length (else their screenings end
  as they start and vanish from the timeline). New films go in section "Also
  screening" (added to SECTIONS so the console can save them). Invitation-only
  rows (Lady 1 Nov, Calabash and It's the Blackness 6 Nov) are saved as
  `invitationOnly` but the app doesn't show it yet.
- SAFE TO RE-RUN: same IDs each time; a loaded screening only gets the sheet's
  fields, so seats, Q&A and status set in the console stay. Deletes only the
  sample timetable (s1…) and earlier loads (sch-…); screenings added in the
  console are kept and listed. Titles that look like an existing film are
  never auto-created (ALIASES / DIFFERENT_FILMS in plan.mjs).
- WHAT GOES (29 Oct): the 90 sample screenings and the alerts posted about
  them (e.g. the 28 Oct test "A Girl Unknown moved", an urgent banner with no
  end time). NEVER deleted: films (11 have no screening in the sheet and keep
  a page with no showtimes), events, venues, jury, sponsors, other news.
- "Add missing festival data" no longer adds the sample timetable back once
  it's been replaced (apps/admin/app/lib/data.ts). Until the staff app is
  redeployed with that, DON'T press it after loading the schedule.

### Install from the alerts card (28 Oct 2026, user request)
- STATUS: built and tested, NOT committed, NOT deployed.
- IPHONE (Safari, not the Home Screen app): the "Alerts on your iPhone" card
  on Profile, News and the VIP page can now be tapped ("Show me how"). It
  opens a bottom sheet, "Add to Home Screen", with the same 3 steps as the
  install-first screen (one shared piece, `components/app/InstallSteps.vue`),
  the note for Instagram / WhatsApp's browsers, "Then open AFRIFF from your
  Home Screen, log in if you have an account, and turn alerts on in
  Profile", and "Got it".
- ANDROID / CHROME: the switch still works straight away, because Android
  allows alerts from the browser, so nobody has to install first. While the
  app isn't installed and Chrome offers it, the card also has an "Install"
  button under the switch. It opens Chrome's own install dialog and goes away
  afterwards. If Chrome isn't offering the install (other browsers, or the
  person said no to Chrome recently), the button doesn't show.
- Test the iPhone card on a laptop: `?install=ios`, on a build with alerts
  set up (the card is hidden in `npm run dev`).
- TESTED (28 Oct, by Claude): 24 checks in a phone-sized test browser on a
  throwaway production build with pretend alert keys (iPhone: card, sheet,
  steps, Got it / Esc / ✕ / tap outside close it, News too, install-first
  screen unchanged; Android: no button until Chrome offers, Install opens
  Chrome's dialog (faked), button gone after yes or no, switch stays);
  typecheck. NOT TESTED: real phones.

### Install toast on every page (28 Oct 2026, user request)
- STATUS: built and tested, NOT committed, NOT deployed.
- USER REQUEST: "the install prompt [should be] fixed through the screens …
  they should be able to close the install prompt or swipe it away. However
  after a full refresh of the app, the prompt should become visible again."
- ANDROID / CHROME: the "Install the AFRIFF app" toast now sits in
  `apps/pwa/app/app.vue`, not the page frame, so it stays put on every page,
  incl. the privacy and VIP-link pages (near the bottom edge there: no bottom
  bar). NOT on the sign-up page (USER DECISION 28 Oct); it comes back on
  leaving it. Before, it vanished on those pages.
- CLOSING IT: ✕, "Not now", a swipe sideways (either way) or down, or "Cancel"
  in Chrome's own install dialog. While swiping, the card follows the finger
  and fades. A short drag springs back. Dragging up does nothing.
  Closed = gone until the app is fully reloaded (kept in memory only, never
  on the phone), then it shows again. Replaces the week-long "Not now".
- IPHONE (USER DECISION 28 Oct: "on iphones it is not a prompt … rather, the
  installation steps … that is what can be closed and then upon full refresh
  it comes back"): no install toast on iPhone any more. The "Install the app
  first" steps screen is what shows. "Continue on the web" closes it until a
  full reload (no longer remembered in the browser; the old saved choice is
  ignored), then it shows again. Same rule and same switch as Android's
  toast. The alerts card's "Show me how" sheet still has the steps too.
- Files: `components/app/AppPwaPrompts.vue` (toast + swipe),
  `layouts/default.vue` (iPhone steps screen),
  `packages/pwa/app/composables/useInstallApp.ts` (`dismissed` / `dismiss()`
  replace `snoozed` / `snooze()`).
- GOOGLE IN THE IPHONE HOME SCREEN APP (user question 28 Oct): the Home
  Screen app has its own storage, separate from Safari, so the AFRIFF login
  and the Google accounts signed in in Safari don't come along. The first
  time, Google asks for the email + password there (iPhone can fill a saved
  password or passkey); after that Google remembers them in the app.
  ASKED 28 Oct: "what if the pop-up stays inside the Home Screen app?" Answer:
  iOS decides where a pop-up opens (Safari or a separate sheet), and its
  result can't get back to the app, so it hangs; storage is still separate.
  The redirect (whole screen to Google and back, inside the app) already
  keeps people in the app.
  CHANGED 28 Oct (user: DP Fitness works on iPhones, "make sure it works just
  like that here"): the button now SHOWS in the Home Screen app, with the
  usual afriff-app.firebaseapp.com helper, exactly as DP Fitness (same code
  path; DP Fitness had no rule hiding it). SETUP 3 is now optional hardening
  (DEVELOPER.md). Google's page says "to continue to afriff-app.firebaseapp.com".
  FIXED on the way: opening the sign-up page and tapping Google quickly
  erased the "gone to Google" note, so backing out said nothing and a ticked
  emails box was forgotten (`googleReturn` in lib/firebase/google.ts).
  TESTED: real Firebase in a phone-sized test browser posing as the Home
  Screen app: button shows, tap sends the whole screen to Google's sign-in
  page (no pop-up), Back → "Google sign-in didn't finish", second try works;
  Safari still uses the small window (6 checks; nobody signed in). NOT
  TESTED: a real Google sign-in on a real iPhone.
- TESTED (28 Oct, by Claude): 39 checks in a phone-sized test browser on the
  dev app, with Chrome's install offer faked (Chrome only makes a real one on
  an HTTPS deploy): same toast through Home → Programme → Queues → My
  Festival → Home, Profile → privacy → back; none on the sign-up page (from
  Profile or opened directly), back on leaving it; a sheet opens on top of
  it; ✕ / Not now / Cancel in Chrome's dialog close it and it stays closed on
  other pages; mouse and finger swipes right, left and down close it; short
  drag springs back; up does nothing; a drag from Install doesn't install; a
  full reload brings it back each time. iPhone: steps on opening even with
  the old saved choice; Continue on the web closes them; no toast after 16 s;
  stay closed across tabs, privacy and sign-up pages; back after each full
  reload; none in the Home Screen app. Typecheck. NOT TESTED: real phones.

### Pictures in Firebase Storage + poster upload script (29 Oct 2026, user request)
- USER REQUEST: "we are on the blaze plan now … implement everything about
  storage and create a script that will upload these posters and associate
  them with the appropriate film and schedule".
- STATUS: built and tested, NOT committed, NOT deployed. Storage SWITCHED ON
  (bucket afriff-app.firebasestorage.app, us-central1) and the script RUN
  WITH --write 29 Oct ~09:58 Lagos: 86 films now link to our own copies
  (checked: all 86 links load as pictures for anyone). Backup of the old
  links: /Users/mac/Documents/afriff-backups/before-posters-2026-10-29T08-58-34.json.
  NOT PUBLISHED yet, so phones still use the afriff.com / IMDb links.
- POSTERS: `AFRIFF-posters/` (87 files from afriff.com, 29 Oct; kept out of
  Git and Vercel). `scripts/posters/upload-posters.mjs`: dry run by default,
  `--write` uploads. Matches each file to its film (file name = film ID, else
  the title in `_poster_list.csv`), shrinks it to 720 × 1080 (28 MB → 12 MB
  for all 86; still sharp on a phone), stores it in Storage and sets the
  film's poster. Dry run 29 Oct: 86 films, all currently linked from
  afriff.com / IMDb, all the same pictures; `ife-ati-iku.jpg` is a second copy
  of Ìfẹ́ àti Ikú's poster, not used. Never touches a poster the team set in
  the console. Never publishes. Safe to run again.
- THE SCHEDULE: screenings show their film's poster (Programme, Home, My
  Festival), so films are all that need one. 42 films on the schedule still
  have NO poster (the 30 "Also screening" films + 12 more): the dry run lists
  them. Add pictures named <film id>.jpg to the folder and run again.
- CONSOLE: every picture field (film poster, event graphic, sponsor logo,
  jury photo) has a preview and "Upload a picture"; the picture is made
  smaller on the device first (same size as the script). Admins and editors
  only (`storage.rules`); editors' pictures go live with their approved change.
- SETUP (once, in this order):
  1. Firebase console → Build → Storage → Get started. LOCATION: pick
     us-central1 (or us-east1 / us-west1) for Firebase's no-cost allowance
     (5 GB stored, 100 GB downloaded a month); London (europe-west2) has
     none. It can't be changed later. Posters aren't personal data, so the US
     is fine (attendee data stays in Firestore, London).
  2. `npm run deploy:storage`, or `npm run deploy:all-rules` for everything
     (answer yes when it asks to let Storage read the database: that's how it
     knows who's an admin or editor).
  3. `node scripts/posters/upload-posters.mjs --write`, then Publish to app.
  4. Deploy the staff app (for the Upload button).
- COST (Blaze): in a US location, expected $0: ~12 MB stored, and each phone
  downloads a poster once (kept offline after). Beyond the allowance: about
  $0.12 per GB downloaded; e.g. 5,000 phones each seeing 50 posters ≈ 34 GB.
  Set a budget alert in Google Cloud Billing.
- TESTED (29 Oct, by Claude): storage rules with Firebase's rules checker (20
  cases: anyone sees, admins/editors upload, volunteers/attendees/signed-out
  can't, wrong folder / 3 MB / not a picture / SVG refused, no overwriting,
  admins delete, owners need a confirmed email; a wide-open rules file fails
  14 of them); the script's dry run against the live database; in a real
  phone-sized browser on the staff dev app: the picture shrinking on real
  posters (Which Way 1.2 MB → 216 KB at 720 × 1063; a small poster kept as
  it is; a see-through logo stays PNG, a plain PNG becomes JPEG; broken and
  non-picture files explained), the field itself (preview, "Upload a
  picture" / "Upload a new picture", "Uploading… 0%", link box locked, "Still
  trying…" after 15 s); staff typecheck; 102 automatic tests. FOUND: until
  Storage is switched on, a browser can't reach it at all, which looks like
  a lost connection, so an upload retries for 2 minutes and then says so,
  naming both causes. NOT TESTED: a real upload (no bucket yet), the Upload
  button inside the console with a real login.

### How to deploy (publish an update)
- HOSTING DECISION (user, 24 Oct): Option C. Michael hosts the app on
  HIS OWN Vercel account (new projects, one per app since the monorepo
  split, deployed from his clone; steps below). Reason: the owner's Vercel
  Hobby account is one person
  only and can't add him. Owner's to-dos: confirm his GitHub invite is
  accepted; add his new address to Firebase → Authentication → Settings →
  Authorized domains (else admin/door logins fail there); once his link
  works, share it with testers and delete the old afriff-app-mu project.
  Agreed to raise: transfer of the Vercel project to AFRIFF/owner after the
  festival (Vercel "Transfer project"), whether his plan allows commercial
  use, and a permanent address (ideally app.afriff.com) before printing QR
  codes. Firebase (database, logins, data) stays in the owner's project.
- SINCE 23 OCT: Michael deploys. Changes reach him as GitHub pull
  requests; he merges into main and deploys both apps to Vercel (see
  below; Vercel's automatic deploys from GitHub are switched off, so
  deploys are manual).
- Do NOT run `vercel deploy` from this laptop unless Michael agrees: it
  would publish whatever is on this laptop over his version.
- Two Vercel projects since 24 Oct: the attendee app (Root Directory
  `apps/pwa`) and the staff app (Root Directory `apps/admin`). Always run the
  commands from the MAIN folder, not inside apps/:
  `npx.cmd vercel link --repo` (once), then `npx.cmd vercel deploy --prod`
  deploys the linked project; `npx.cmd vercel link` switches to the other
  one, then deploy again. Full steps in DEVELOPER.md §5.
  (`npx.cmd`, not `npx`: Windows PowerShell blocks npx.ps1 scripts on
  this laptop. Don't change the execution policy; use .cmd instead.)
- `.vercelignore` keeps `reference/` and other local files out of the
  upload. Git auto-deploys are off (`apps/*/vercel.json`), so deploys are manual.
- Settings (24 Oct 2026): local files `apps/pwa/.env` and `apps/admin/.env`
  (not in Git, never uploaded), with sample values. The 6 Firebase settings
  are the SAME in both apps: on Vercel they go in ONCE as Shared Environment
  Variables (Team Settings → Environment Variables, linked to both projects).
  Attendee project only: `NUXT_PUBLIC_ADMIN_URL` (staff app's address).
  Staff project only: `NUXT_PUBLIC_ATTENDEE_URL` (attendee app's address).
  Change one on Vercel → redeploy both apps (values are baked in at build).
- After any deploy that adds data fields: Add missing festival data, then
  Publish to app (also creates the `published/version` marker).

### How to run it
- `npm install` once in the main folder (it installs both apps and the
  shared packages). Then, from the main folder:
  - `npm run dev:pwa`: attendee app at http://localhost:3000 (or
    http://<laptop Wi-Fi IP>:3000 on a phone on the same Wi-Fi).
  - `npm run dev:admin`: staff app at http://localhost:3001 (/admin, /door).
- To try offline, updates and install: `npm run build`, then
  `npm run preview:pwa` or `npm run preview:admin`.

### Next (as of 23 Oct 2026; festival opens 1 Nov)
1. Filmstrip is in main (pull request #3). Push dev (monorepo split,
   rebased on main), open a pull request dev → main; Michael reviews,
   merges, deploys both apps.
2. Decide and pay for: Firebase Blaze (+ budget alert) and hosting
   (Vercel Pro, or Firebase Hosting on Blaze). Payments/deposits message
   drafted 21 Oct.
3. Real-phone test day: admin logins, Team roles, a volunteer at /door,
   an alert end to end, Reports, install + airplane mode; then Clear counts.
4. Load AFRIFF's real schedule and content in the console; Publish to app.
5. Host posters / logos / jury photos ourselves; final address + QR codes.
6. Push notifications: add the two keys (see "Push notifications for
   announcements"), deploy rules, then on a real Android and iPhone turn
   alerts on, publish a ticked test item, check it arrives, then delete it.
7. afriff.com film sync: SWITCHED OFF 28 Oct (user decision). Only if it's
   wanted again: switch it back on (see "afriff.com film sync"), then on
   Blaze deploy rules + functions and check the card on Festival data after
   15 minutes.
8. Attendee accounts: get AFRIFF's written approval, then do "SETUP BEFORE
   IT WORKS" in "Attendee accounts", test sign-up / Forgot password / two
   phones on real phones, and delete the test accounts (console → Attendees).
9. Festival emails: set the sender up in Brevo (authenticate afriff.com), add
   the settings in "Festival emails from the console", send yourself a test,
   check it in Gmail and on a phone, then try its Unsubscribe link.
10. Continue with Google: on a real Android phone and an iPhone (Safari),
   sign up with a Google account, log out, log in again with Google, then
   delete the account from Profile. For the iPhone Home Screen app, do
   SETUP 3 in "Continue with Google" first.
11. Invitations (opening night: send 28–29 Oct): PM creates Brevo + picks
   the plan, afriff.app domain authenticated, invites@afriff.app sender,
   NUXT_INVITE_FROM_ADDRESS on the staff app, `npm run deploy:rules`, deploy
   both apps. Then: groups + VIP links on Contacts, the invite written in the
   console (artwork link optional), a "Test" group of 3 people, real send to "Test", check
   inbox / spam / Unsubscribe / Add to calendar / guest list, then the real
   send. Print the guest list for the door. See "VIP invitations, contacts
   and guest lists".
12. Push for changed screenings + invitations: deploy both apps, then the
   test in "Push: changed screenings at Publish + invitations by push".
13. Superadmin: `npm run deploy:rules`; Michael and the owner each sign in to
   the staff app, open Team, and confirm their email if asked. Then check an
   ordinary admin can't remove an admin. See "Superadmin".
14. Pushes for scheduled invitations: on Blaze, `npm run deploy:functions`
   and deploy both apps, check Invitations says "On", then the test in
   "Invitation pushes for scheduled sends + alerts on the VIP page".
