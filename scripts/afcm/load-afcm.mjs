#!/usr/bin/env node
// Loads the AFCM market's sessions (panels and fireside chats, Mon 2 – Fri 6 Nov
// at Twinwaters) into Firestore as events, with their posters in Firebase
// Storage. The app has no AFCM sessions of its own: Home's AFCM tab and the
// Schedule's AFCM filter show what's in the database, once published.
//
//   node scripts/afcm/load-afcm.mjs             dry run: shows what it would do, changes nothing
//   node scripts/afcm/load-afcm.mjs --write     backs up the events, uploads the posters, adds the sessions
//   ... --folder <path>                          posters from another folder (default: AFCM-posters)
//
// Run from the main folder. Uses the service account and bucket in
// apps/admin/.env (NUXT_FIREBASE_SERVICE_ACCOUNT, NUXT_PUBLIC_FIREBASE_STORAGE_BUCKET).
// It never publishes: Publish to app in the console when you're happy.
//
// THE INPUT: scripts/afcm/afcm-2026-sessions.json (titles, days, times,
// speakers, moderators, poster file names, and what all sessions share: venue,
// access, badge link, about) and one poster per session in AFCM-posters/ (kept
// out of Git, like AFRIFF-posters/). Each session becomes an event of type
// 'afcm-panel' or 'afcm-fireside', speakers listed with commas.
//
// POSTERS: made smaller first if they're big (fits 720 × 1080 as a JPEG, like
// the console's Upload button and the film posters script), stored at
// images/events/<session id>.<fingerprint>.jpg with a link that never changes.
//
// SAFE TO RUN AGAIN: a session already in the database is never changed (the
// database is the master copy: edit it in the console), except that one with
// no poster gets its poster. The report lists sessions whose details differ
// from the file. Nothing is ever deleted.
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');
// firebase-admin is installed for the staff app (apps/admin), not in the main folder
const requireAdmin = createRequire(path.join(root, 'apps/admin/package.json'));
const { initializeApp, cert } = requireAdmin('firebase-admin/app');
const { getFirestore } = requireAdmin('firebase-admin/firestore');
const { getStorage } = requireAdmin('firebase-admin/storage');

const argv = process.argv.slice(2);
const WRITE = argv.includes('--write');
const folderArg = argv.indexOf('--folder');
const folder = path.resolve(root, folderArg >= 0 && argv[folderArg + 1] ? argv[folderArg + 1] : 'AFCM-posters');

// same box and quality as scripts/posters/upload-posters.mjs
const MAX_WIDTH = 720;
const MAX_HEIGHT = 1080;
const QUALITY = 65;
const HEAVY = 200 * 1024; // a JPEG already small enough is uploaded as it is unless heavier than this

function env(name) {
  const file = fs.readFileSync(path.join(root, 'apps/admin/.env'), 'utf8');
  const m = file.match(new RegExp(`^${name}=(.*)$`, 'm'));
  return m ? m[1].trim().replace(/^['"]|['"]$/g, '') : '';
}
function serviceAccount() {
  let v = env('NUXT_FIREBASE_SERVICE_ACCOUNT');
  if (!v) throw new Error('NUXT_FIREBASE_SERVICE_ACCOUNT is missing from apps/admin/.env');
  if (!v.startsWith('{')) v = Buffer.from(v, 'base64').toString('utf8');
  return JSON.parse(v);
}
const bucketName = env('NUXT_PUBLIC_FIREBASE_STORAGE_BUCKET') || 'afriff-app.firebasestorage.app';
const app = initializeApp({ credential: cert(serviceAccount()), storageBucket: bucketName });
const db = getFirestore(app);
const bucket = getStorage(app).bucket();

// ---------- The sessions, as event records ----------
const input = JSON.parse(fs.readFileSync(path.join(here, 'afcm-2026-sessions.json'), 'utf8'));
const { shared } = input;
const records = input.sessions.map((s) => ({
  id: s.id,
  poster: s.poster,
  data: {
    type: s.kind === 'fireside' ? 'afcm-fireside' : 'afcm-panel',
    title: s.title,
    date: s.day, time: s.start, end: s.end,
    venue: shared.venue, place: shared.place, tag: shared.tag,
    speaker: s.speakers.join(', '),
    speakerRole: s.moderator ? `Moderated by ${s.moderator}` : s.kind === 'fireside' ? 'In conversation' : '',
    about: shared.about[s.kind],
    access: shared.access,
    link: shared.link,
  },
}));

const events = (await db.collection('events').get()).docs.map((d) => ({ id: d.id, ...d.data() }));
const byId = new Map(events.map((e) => [e.id, e]));
const venues = new Set((await db.collection('venues').get()).docs.map((d) => d.id));

// ---------- Posters ----------
const work = fs.mkdtempSync(path.join(os.tmpdir(), 'afriff-afcm-'));
let hasSips = true;
try { execFileSync('sips', ['--help'], { stdio: 'ignore' }); } catch { hasSips = false; }
function prepare(file) {
  const src = path.join(folder, file);
  const original = fs.readFileSync(src);
  if (!hasSips) return { bytes: original, before: original.length, size: '' };
  const out = execFileSync('sips', ['-g', 'pixelWidth', '-g', 'pixelHeight', src], { encoding: 'utf8' });
  const width = Number(out.match(/pixelWidth: (\d+)/)?.[1]), height = Number(out.match(/pixelHeight: (\d+)/)?.[1]);
  const scale = Math.min(1, MAX_WIDTH / width, MAX_HEIGHT / height);
  const w = Math.round(width * scale), h = Math.round(height * scale);
  if (/\.jpe?g$/i.test(file) && scale === 1 && original.length <= HEAVY) return { bytes: original, before: original.length, size: `${w}×${h}` };
  const dest = path.join(work, `${path.basename(file, path.extname(file))}.jpg`);
  execFileSync('sips', ['-s', 'format', 'jpeg', '-s', 'formatOptions', String(QUALITY), ...(scale < 1 ? ['-z', String(h), String(w)] : []), src, '--out', dest], { stdio: 'ignore' });
  return { bytes: fs.readFileSync(dest), before: original.length, size: `${w}×${h}` };
}
const ourPrefix = `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/`;
const objectPath = (id, bytes) => `images/events/${id}.${crypto.createHash('sha256').update(bytes).digest('hex').slice(0, 12)}.jpg`;

const noPoster = records.filter((r) => !fs.existsSync(path.join(folder, r.poster)));
const plan = records.map((r) => {
  const current = byId.get(r.id);
  const p = noPoster.includes(r) ? null : prepare(r.poster);
  return {
    ...r, current, p,
    target: p && objectPath(r.id, p.bytes),
    add: !current,
    // already there: only a missing poster is filled in
    posterOnly: Boolean(current && p && !current.image),
  };
});

// ---------- Report ----------
const line = (s = '') => console.log(s);
const kb = (n) => `${Math.round(n / 1024)} KB`;
let bucketReady = false;
try { [bucketReady] = await bucket.exists(); } catch (e) { line(`(Couldn't check the storage bucket: ${e.message})`); }

line(`AFCM SESSIONS: ${records.length} in afcm-2026-sessions.json, ${events.length} events in the database`);
line(`Posters: ${path.relative(root, folder) || folder}, ${records.length - noPoster.length} of ${records.length} found · Storage bucket ${bucketName}: ${bucketReady ? 'ready' : 'NOT SWITCHED ON'}`);
if (!hasSips) line('macOS sips not found: posters are uploaded as they are.');
if (!venues.has(shared.venue)) line(`WARNING: no "${shared.venue}" venue in the database: the app would show these sessions without a venue.`);
if (noPoster.length) line(`WARNING: no poster file for ${noPoster.map((r) => `${r.id} (${r.poster})`).join(', ')}: added without one`);

const toAdd = plan.filter((x) => x.add);
line(`\nTO ADD (${toAdd.length})`);
for (const x of toAdd) line(`  ${x.data.date} ${x.data.time}–${x.data.end}  ${x.data.type === 'afcm-fireside' ? 'fireside' : 'panel   '}  ${x.data.title} [${x.id}]${x.p ? ` · poster ${kb(x.p.before)} → ${kb(x.p.bytes.length)}${x.p.size ? ` (${x.p.size})` : ''}` : ''}`);
const posterOnly = plan.filter((x) => x.posterOnly);
if (posterOnly.length) {
  line(`\nALREADY IN THE DATABASE, GET THEIR POSTER (${posterOnly.length})`);
  for (const x of posterOnly) line(`  ${x.data.title} [${x.id}]`);
}
const same = (a, b) => JSON.stringify(a ?? '') === JSON.stringify(b ?? '');
const differs = plan.filter((x) => x.current).map((x) => ({ x, fields: Object.keys(x.data).filter((k) => !same(x.data[k], x.current[k])) })).filter((d) => d.fields.length);
const kept = plan.filter((x) => x.current && !x.posterOnly);
if (kept.length) line(`\nALREADY IN THE DATABASE, LEFT AS THEY ARE (${kept.length})`);
for (const { x, fields } of differs) line(`  ${x.data.title} [${x.id}]: ${fields.join(', ')} differ from the file (edit in the console if the file is right)`);
const listed = new Set(records.map((r) => r.id));
const others = events.filter((e) => (e.type === 'afcm-panel' || e.type === 'afcm-fireside') && !listed.has(e.id));
if (others.length) {
  line(`\nAFCM SESSIONS ADDED IN THE CONSOLE, NOT IN THE FILE (${others.length}): kept`);
  for (const e of others) line(`  ${e.date} ${e.time}  ${e.title} [${e.id}]`);
}

const finish = (code) => { fs.rmSync(work, { recursive: true, force: true }); process.exit(code); };
if (!WRITE) {
  line('\nDRY RUN: nothing was uploaded or changed. Run again with --write.');
  finish(0);
}
const todo = toAdd.length + posterOnly.length;
if (!todo) {
  line('\nNothing to do.');
  finish(0);
}
if (!bucketReady) {
  console.error('\nStopped: Firebase Storage isn\'t switched on (Firebase console → Storage → Get started). Nothing was changed.');
  finish(1);
}

// ---------- Write ----------
const backupDir = path.join(os.homedir(), 'Documents', 'afriff-backups');
fs.mkdirSync(backupDir, { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const backupFile = path.join(backupDir, `before-afcm-${stamp}.json`);
fs.writeFileSync(backupFile, JSON.stringify({ events }, null, 1));
line(`\nBackup of the events saved: ${backupFile}`);

// the link Firebase gives out for a file: works for anyone, never changes
async function upload(x) {
  const file = bucket.file(x.target);
  const [exists] = await file.exists();
  let token;
  if (exists) {
    const [meta] = await file.getMetadata();
    token = String(meta.metadata?.firebaseStorageDownloadTokens || '').split(',')[0];
    if (!token) { token = crypto.randomUUID(); await file.setMetadata({ metadata: { firebaseStorageDownloadTokens: token } }); }
  } else {
    token = crypto.randomUUID();
    await file.save(x.p.bytes, {
      resumable: false,
      metadata: {
        contentType: 'image/jpeg',
        cacheControl: 'public, max-age=31536000, immutable',
        metadata: { firebaseStorageDownloadTokens: token, event: x.id, original: x.poster },
      },
    });
  }
  return `${ourPrefix}${encodeURIComponent(x.target)}?alt=media&token=${token}`;
}

const links = new Map();
const queue = [...toAdd, ...posterOnly].filter((x) => x.p);
let done = 0;
await Promise.all(Array.from({ length: 4 }, async () => {
  for (let x = queue.shift(); x; x = queue.shift()) {
    links.set(x.id, await upload(x));
    done++;
    if (done % 10 === 0 || queue.length === 0) line(`  posters uploaded: ${done}`);
  }
}));

// all posters first, then the records in one go. create(), not set(): if a
// session appeared in the meantime the whole batch stops and nothing is saved
const batch = db.batch();
for (const x of toAdd) batch.create(db.doc(`events/${x.id}`), { ...x.data, ...(links.has(x.id) ? { image: links.get(x.id) } : {}) });
for (const x of posterOnly) if (links.has(x.id)) batch.update(db.doc(`events/${x.id}`), { image: links.get(x.id) });
await batch.commit();
line(`Done: ${toAdd.length} AFCM sessions added${posterOnly.length ? `, ${posterOnly.length} got their poster` : ''}, ${links.size} posters in Storage.`);
line('Attendees see them after an admin presses Publish to app in the console.');
finish(0);
