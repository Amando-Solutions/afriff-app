#!/usr/bin/env node
// Loads AFRIFF's official 2026 screening schedule into Firestore.
//
//   node scripts/schedule/load-schedule.mjs                 dry run: shows everything, changes nothing
//   node scripts/schedule/load-schedule.mjs --write         backs up, then replaces the screenings
//   ... --write --add-missing                                also creates title-only films for titles
//                                                            the database doesn't have yet
//
// Run from the main folder. Uses the service account in apps/admin/.env
// (NUXT_FIREBASE_SERVICE_ACCOUNT). It never publishes: open the console,
// Publish to app, when you're happy.
//
// What --write does, in this order:
//   1. saves films, screenings, events, venues, news and the pending requests to
//      ~/Documents/afriff-backups/before-schedule-<time>.json
//   2. (with --add-missing) adds the missing films
//   3. fills in the running time of films that have none, from their slot in the sheet
//   4. writes the new screenings. Running it again with the same sheet changes
//      nothing; a screening already loaded only gets the sheet's fields (film,
//      day, time, screen), so seats, Q&A and status set in the console stay
//   5. turns down editors' requests about screenings still waiting in Approvals
//   6. rewords the "Times are samples" notice (n1) if it still has its original text
//   7. deletes the sample timetable and screenings from an earlier load that are
//      no longer in the sheet. Screenings added in the console are kept (listed)
//
// Safe to run again: same sheet → same IDs, nothing added twice.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { ALIASES, buildPlan, norm, titleCase, slug, slotMinutes, NEW_FILM_SECTION } from './plan.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');
// firebase-admin is installed for the staff app (apps/admin), not in the main
// folder, so load it from there
const requireAdmin = createRequire(path.join(root, 'apps/admin/package.json'));
const { initializeApp, cert } = requireAdmin('firebase-admin/app');
const { getFirestore } = requireAdmin('firebase-admin/firestore');

const args = new Set(process.argv.slice(2));
const WRITE = args.has('--write');
const ADD_MISSING = args.has('--add-missing');

const sheet = JSON.parse(fs.readFileSync(path.join(here, 'afriff-2026-schedule.json'), 'utf8'));

function serviceAccount() {
  const env = fs.readFileSync(path.join(root, 'apps/admin/.env'), 'utf8');
  const m = env.match(/^NUXT_FIREBASE_SERVICE_ACCOUNT=(.*)$/m);
  if (!m || !m[1].trim()) throw new Error('NUXT_FIREBASE_SERVICE_ACCOUNT is missing from apps/admin/.env');
  let v = m[1].trim().replace(/^['"]|['"]$/g, '');
  if (!v.startsWith('{')) v = Buffer.from(v, 'base64').toString('utf8');
  return JSON.parse(v);
}

const db = getFirestore(initializeApp({ credential: cert(serviceAccount()) }));
const all = async (name) => (await db.collection(name).get()).docs.map((d) => ({ id: d.id, ...d.data() }));

const [films, screenings, events, venues, news, plans] = await Promise.all(['films', 'screenings', 'events', 'venues', 'news', 'attendeePlans'].map(all));
// Editors' requests still waiting in Approvals: approving one about a screening
// would write that old screening back, so those are turned down with --write.
const pending = (await db.collection('changes').where('status', '==', 'pending').get()).docs.map((d) => ({ id: d.id, ...d.data() }));
const pendingScreenings = pending.filter((c) => c.collection === 'screenings');
// Door volunteers whose venue now has no screenings
const volunteers = (await db.collection('users').where('role', '==', 'volunteer').get()).docs.map((d) => d.data());
if (!venues.some((v) => v.id === sheet.venue)) throw new Error(`Venue "${sheet.venue}" isn't in the database`);

// Titles the database doesn't have become new films (only used with --add-missing).
// Not the ones that look like a film already there: that would give it a second page.
let plan = buildPlan(sheet, films);
const newFilms = [];
if (plan.unmatched.length && ADD_MISSING) {
  const taken = new Set(films.map((f) => f.id));
  for (const [title, m] of plan.unmatched) {
    if (m.likely || newFilms.some((f) => norm(f.sheetTitle) === norm(title))) continue;
    const nice = titleCase(title);
    const base = slug(nice);
    if (!base) throw new Error(`Can't make a film ID from "${title}": add the film in the console, then run again`);
    let id = base;
    for (let i = 2; taken.has(id); i++) id = `${base}-${i}`;
    taken.add(id);
    newFilms.push({
      // sheetTitle: so a later run finds this film even after the team renames it
      id, title: nice, sheetTitle: title, section: NEW_FILM_SECTION, country: '', runtime: slotMinutes(sheet, title), year: null,
      director: '', language: '', genre: '', trailer: '', synopsis: '', image: '',
    });
  }
  plan = buildPlan(sheet, [...films, ...newFilms]);
}

// Films with no running time (most Out of Competition ones) would show screenings
// ending as they start: fill it in from their slot, only where it's empty
const runtimeFills = [];
for (const [title, m] of plan.matches) {
  if (!m.film || m.film.runtime || newFilms.some((f) => f.id === m.film.id) || runtimeFills.some((r) => r.id === m.film.id)) continue;
  const mins = slotMinutes(sheet, title);
  if (mins) runtimeFills.push({ id: m.film.id, title: m.film.title, runtime: mins });
}

// Which existing screenings go: the sample timetable (s1, s2…) and anything from an
// earlier load of a sheet (sch-…) that this sheet no longer has. Screenings the team
// added in the console have other IDs and are kept.
const newIds = new Set(plan.screenings.map((s) => s.id));
const fromUs = (id) => /^s\d+$/.test(id) || id.startsWith('sch-');
const removed = screenings.filter((s) => !newIds.has(s.id) && fromUs(s.id));
const removedIds = new Set(removed.map((s) => s.id));
const keptOthers = screenings.filter((s) => !newIds.has(s.id) && !fromUs(s.id));
const existing = new Map(screenings.map((s) => [s.id, s]));
// the sheet's fields; everything else (seats, Q&A, status, Public/Industry) belongs to the team once loaded
const SHEET_FIELDS = ['film', 'venue', 'screen', 'date', 'time', 'invitationOnly'];
const updates = [];
const creates = [];
for (const s of plan.screenings) {
  const before = existing.get(s.id);
  if (!before) { creates.push(s); continue; }
  const changed = Object.fromEntries(SHEET_FIELDS.filter((k) => (before[k] ?? '') !== (s[k] ?? '')).map((k) => [k, s[k]]));
  if (Object.keys(changed).length) updates.push({ id: s.id, data: changed });
}

// ---------- Report ----------
const line = (s = '') => console.log(s);
line(`AFRIFF schedule: ${sheet.screenings.length} rows in the sheet, ${films.length} films in the database\n`);
const filmIds = new Set(films.map((f) => f.id));
for (const [k, id] of Object.entries(ALIASES)) if (!filmIds.has(id)) line(`ALIASES: "${k}" points at ${id}, which isn't in the database (fix the line in plan.mjs)`);
line('TITLES');
for (const [title, m] of plan.matches) {
  if (!m.film) continue;
  const isNew = newFilms.some((f) => f.id === m.film.id);
  const how = isNew ? `NEW FILM (running time ${m.film.runtime} min = its slot in the sheet)` : m.how === 'exact' ? '' : `(${m.how} match, check)`;
  line(`  ${title.padEnd(40)} → ${m.film.title} [${m.film.id}] ${how}`);
}
const lookalikes = plan.unmatched.filter(([, m]) => m.likely);
const missing = plan.unmatched.filter(([, m]) => !m.likely);
if (lookalikes.length) {
  line(`\nLOOKS LIKE A FILM ALREADY IN THE DATABASE (${lookalikes.length}): never created automatically, so no film gets a second page.`);
  line('Same film → add a line to ALIASES in plan.mjs. A different film → add its title to DIFFERENT_FILMS there.');
  for (const [title, m] of lookalikes) line(`  ${title.padEnd(40)} looks like: ${m.suggestions.map((f) => `${f.title} [${f.id}]`).join(' / ')}${m.why === 'several films have this title' ? ' (several films have this title)' : ''}`);
}
if (missing.length) {
  line(`\nNOT IN THE DATABASE (${missing.length})${ADD_MISSING ? '' : ': nothing will be written until these are sorted'}.`);
  line('Either add a line to ALIASES in plan.mjs (if it is one of these films under another name),');
  line('or run again with --add-missing to create a title-only film for each.');
  for (const [title, m] of missing) line(`  ${title.padEnd(40)} nearest: ${m.suggestions.map((f) => `${f.title} [${f.id}]`).join(' / ')}`);
}

const byDay = {};
for (const s of plan.screenings) byDay[s.date] = (byDay[s.date] || 0) + 1;
line(`\nSCREENINGS: ${plan.screenings.length} (${Object.entries(byDay).map(([d, n]) => `${d.slice(5)}: ${n}`).join(', ')}), all at ${sheet.venue}`);
line(`  ${plan.merged} of them play on several screens at once: one screening each (one row, one + button, one queue), seats added up`);
line(`  ${creates.length} new, ${updates.length} already loaded but changed in the sheet, ${plan.screenings.length - creates.length - updates.length} already loaded and unchanged`);
line(`  ${removed.length} existing screenings will be deleted (${removed.filter((s) => /^s\d+$/.test(s.id)).length} from the sample timetable, ${removed.filter((s) => s.id.startsWith('sch-')).length} from an earlier load no longer in the sheet)`);
if (keptOthers.length) {
  line(`\nADDED IN THE CONSOLE, KEPT (${keptOthers.length}): delete them in the console if the sheet replaces them`);
  const filmTitle = (id) => films.find((f) => f.id === id)?.title || id;
  for (const s of keptOthers) {
    const twin = plan.screenings.find((p) => p.film === s.film && p.date === s.date && p.time === s.time);
    line(`  ${s.id}: ${filmTitle(s.film)} ${s.date} ${s.time} ${s.venue} ${s.screen || ''}${twin ? `  ← SAME AS THE SHEET'S ${twin.id}: attendees would see it twice` : ''}`);
  }
}

if (runtimeFills.length) {
  line(`\nFILMS WITH NO RUNNING TIME (${runtimeFills.length}): filled in from their slot in the sheet, so their screenings show an end time`);
  for (const r of runtimeFills) line(`  ${r.title} [${r.id}]: ${r.runtime} min`);
}

if (plan.invitationOnly.length) {
  line(`\nINVITATION ONLY IN THE SHEET (${plan.invitationOnly.length}): saved as invitationOnly on the screening, but the app doesn't show it yet.`);
  line('Attendees will see these like any other screening, with a + button. Say so in an event or news item if needed.');
  for (const s of plan.invitationOnly) line(`  ${s}`);
}

const scheduled = new Set(plan.screenings.map((s) => s.film));
const unscheduled = films.filter((f) => !scheduled.has(f.id));
line(`\nFILMS WITH NO SCREENING IN THE NEW SCHEDULE (${unscheduled.length}): their pages will show no showtimes`);
for (const f of unscheduled) line(`  ${f.title} [${f.id}]${f.section ? ` · ${f.section}` : ''}`);

if (plan.warnings.length) {
  line('\nCHECK WITH AFRIFF (runs past its slot, or overlaps the next film on that screen):');
  for (const w of plan.warnings) line(`  ${w}`);
}
line('\nNOTES FROM THE SHEET');
for (const n of sheet.notes) line(`  ${n}`);

const linked = news.filter((n) => n.screening && removedIds.has(n.screening));
if (linked.length) {
  line('\nNEWS LINKED TO A SCREENING THAT WILL BE DELETED (the link will be dropped):');
  for (const n of linked) line(`  news "${n.title}" → ${n.screening}`);
}

if (pendingScreenings.length) {
  line(`\nWAITING IN APPROVALS ABOUT SCREENINGS (${pendingScreenings.length}): --write turns these down, so approving one can't bring an old screening back`);
  for (const c of pendingScreenings) line(`  ${c.action} ${c.docId}: ${c.summary || ''} (from ${c.submittedByName || 'an editor'})`);
}
const filmDeletes = pending.filter((c) => c.collection === 'films' && c.action === 'delete' && scheduled.has(c.docId));
if (filmDeletes.length) {
  line(`\nWAITING IN APPROVALS: DELETE A FILM THE SCHEDULE USES (${filmDeletes.length}): approving it would hide its screenings from attendees. Turn it down in Approvals.`);
  for (const c of filmDeletes) line(`  ${c.docId} (from ${c.submittedByName || 'an editor'})`);
}
const elsewhere = volunteers.filter((v) => v.venue && v.venue !== sheet.venue);
if (elsewhere.length) {
  line(`\nDOOR VOLUNTEERS AT A VENUE WITH NO SCREENINGS NOW (${elsewhere.length}): move them to ${sheet.venue} on the Team page`);
  for (const v of elsewhere) line(`  ${v.name || v.email || '(no name)'} · ${v.venue}`);
}
const lostPlans = plans.filter((p) => (p.scheduled || []).some((id) => removedIds.has(id)));
if (lostPlans.length) {
  line(`\nATTENDEE ACCOUNTS WITH A DELETED SCREENING IN MY FESTIVAL (${lostPlans.length}): those picks disappear from their plan (sample times, so expected)`);
}

const n1 = news.find((n) => n.id === 'n1');
const n1Original = n1 && /^Times are samples/i.test(n1.title || '');

if (!WRITE) {
  line('\nDRY RUN: nothing was changed. Run again with --write to load it.');
  process.exit(0);
}
if (plan.unmatched.length) {
  console.error('\nStopped: some titles are not in the database (see above). Nothing was changed.');
  process.exit(1);
}

// ---------- Write ----------
const backupDir = path.join(os.homedir(), 'Documents', 'afriff-backups');
fs.mkdirSync(backupDir, { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const backupFile = path.join(backupDir, `before-schedule-${stamp}.json`);
fs.writeFileSync(backupFile, JSON.stringify({ films, screenings, events, venues, news, changes: pending }, null, 1));
line(`\nBackup saved: ${backupFile}`);

// Additions first and deletions last, so if the connection drops between two
// batches the database still has a timetable (running again finishes the job)
const ops = [];
for (const f of newFilms) { const { id, ...data } = f; ops.push((b) => b.set(db.doc(`films/${id}`), data)); }
for (const r of runtimeFills) ops.push((b) => b.update(db.doc(`films/${r.id}`), { runtime: r.runtime }));
for (const s of creates) { const { id, ...data } = s; ops.push((b) => b.set(db.doc(`screenings/${id}`), data)); }
for (const u of updates) ops.push((b) => b.update(db.doc(`screenings/${u.id}`), u.data));
for (const c of pendingScreenings) {
  ops.push((b) => b.update(db.doc(`changes/${c.id}`), {
    status: 'rejected', note: 'Replaced by AFRIFF\'s official schedule (28 Oct 2026).',
    reviewedBy: 'schedule-script', reviewedByName: 'Official schedule load', reviewedAt: new Date(),
  }));
}
for (const n of linked) ops.push((b) => b.update(db.doc(`news/${n.id}`), { screening: '' }));
if (n1Original) {
  ops.push((b) => b.update(db.doc('news/n1'), {
    title: 'Event times are samples for now',
    body: 'Screening times are AFRIFF\'s official schedule, all at Filmhouse Landmark. Masterclass and event times are still placeholders until AFRIFF confirms them.',
  }));
}
for (const s of removed) ops.push((b) => b.delete(db.doc(`screenings/${s.id}`)));
// up to 500 writes go in one all-or-nothing batch (this sheet needs about 230)
for (let i = 0; i < ops.length; i += 500) {
  const batch = db.batch();
  for (const op of ops.slice(i, i + 500)) op(batch);
  await batch.commit();
}
line(`Done: ${newFilms.length} films added, ${runtimeFills.length} running times filled in, ${creates.length} screenings added, ${updates.length} updated, ${removed.length} old screenings deleted, ${pendingScreenings.length} pending screening requests turned down${n1Original ? ', notice n1 reworded' : ''}.`);
line('Attendees see none of this until an admin presses Publish to app in the console.');
line('(New and deleted screenings aren\'t offered as alerts there. On a later run, any screening whose time or screen changed is: tick the ones attendees should hear about.)');
line('Don\'t press "Add missing festival data" in a staff app deployed before this load: it would add the sample timetable back.');
process.exit(0);
