#!/usr/bin/env node
// Uploads film posters to Firebase Storage and points each film at its copy,
// so the app stops linking posters from afriff.com and IMDb.
//
//   node scripts/posters/upload-posters.mjs                     dry run: matches files to films, changes nothing
//   node scripts/posters/upload-posters.mjs --write             uploads, then sets each film's poster
//   ... --folder <path>                                          another folder (default: AFRIFF-posters)
//   ... --replace-team-links                                     also replace poster links the team set in the console
//
// Run from the main folder. Uses the service account and bucket in
// apps/admin/.env (NUXT_FIREBASE_SERVICE_ACCOUNT, NUXT_PUBLIC_FIREBASE_STORAGE_BUCKET).
// Firebase Storage must be switched on (Firebase console → Storage → Get started).
// It never publishes: Publish to app in the console when you're happy.
//
// THE FOLDER: one picture per film (jpg, png or webp), named after the film's ID
// (lady.jpg), or listed in the folder's _poster_list.csv (Film,File,...).
// Files starting with _ or . are skipped. Each file is matched to a film by:
// its name = the film's ID → its title in the CSV → its name read as a title
// (the same matching as the schedule loader, so "Colors & Curves" finds
// colors-curves and the schedule's ALIASES apply).
//
// EACH PICTURE is made smaller first, the same as the console's Upload button:
// fits 720 × 1080 as a JPEG (macOS's built-in `sips`; elsewhere the original is
// uploaded). Stored at images/films/<film id>.<fingerprint>.jpg with
// a link that never changes, so phones keep it offline and a new picture gets a
// new link. Running it again with the same files uploads nothing new.
//
// WHICH FILMS CHANGE: no poster, a poster linked from another site (afriff.com,
// its lovable.app copy, IMDb), or an earlier upload by this script. A poster the
// team set in the console (an upload, or a link to anywhere else) is kept and
// listed; --replace-team-links replaces those too. Films are never added or
// deleted, and nothing else about them changes.
//
// THE SCHEDULE: the Programme, Home and My Festival show each screening's film
// poster, so the films are all that need a poster. The report lists the films
// on the schedule that still have none.
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { matchTitle } from '../schedule/plan.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');
// firebase-admin is installed for the staff app (apps/admin), not in the main folder
const requireAdmin = createRequire(path.join(root, 'apps/admin/package.json'));
const { initializeApp, cert } = requireAdmin('firebase-admin/app');
const { getFirestore } = requireAdmin('firebase-admin/firestore');
const { getStorage } = requireAdmin('firebase-admin/storage');

const argv = process.argv.slice(2);
const args = new Set(argv);
const WRITE = args.has('--write');
const REPLACE_TEAM = args.has('--replace-team-links');
const folderArg = argv.indexOf('--folder');
const folder = path.resolve(root, folderArg >= 0 && argv[folderArg + 1] ? argv[folderArg + 1] : 'AFRIFF-posters');

// Same box as apps/admin/app/lib/upload.ts. sips's quality scale isn't the
// browser's: 65 here gives files about the size of the console's 0.72.
// (Tried on these 87 posters, 29 Oct: 28 MB → 11.5 MB, still sharp on a phone.)
const MAX_WIDTH = 720;
const MAX_HEIGHT = 1080;
const QUALITY = 65;
// a picture already small enough is still re-saved when its file is heavier than this
const HEAVY = 200 * 1024;
const PICTURE = /\.(jpe?g|png|webp)$/i;
// where the posters came from before (25 Oct sync): replaced by our copy
const OUTSIDE = /^https:\/\/([\w-]+\.)*(afriff\.com|lovable\.app|media-amazon\.com|imdb\.com)\//i;

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

// ---------- The folder ----------
if (!fs.existsSync(folder)) throw new Error(`No folder ${folder}`);

// "A Tray of Locust Beans (AKA ""ATOLB"")",a-tray-….jpg,OK,https://…
function parseCsv(text) {
  const rows = [];
  let row = [], cell = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(cell); rows.push(row); row = []; cell = '';
    } else cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows.filter((r) => r.some((x) => x.trim()));
}
const csvFile = path.join(folder, '_poster_list.csv');
const listed = new Map(); // file name → { title, source }
if (fs.existsSync(csvFile)) {
  const [head, ...rows] = parseCsv(fs.readFileSync(csvFile, 'utf8'));
  const col = (name) => head.findIndex((h) => h.trim().toLowerCase() === name);
  const [cTitle, cFile, cSource] = [col('film'), col('file'), col('source url')];
  for (const r of rows) if (r[cFile]) listed.set(r[cFile].trim(), { title: (r[cTitle] || '').trim(), source: (r[cSource] || '').trim() });
}
const names = fs.readdirSync(folder).filter((n) => !n.startsWith('_') && !n.startsWith('.')).sort();
const notPictures = names.filter((n) => !PICTURE.test(n));
const files = names.filter((n) => PICTURE.test(n));

const films = (await db.collection('films').get()).docs.map((d) => ({ id: d.id, ...d.data() }));
const screenings = (await db.collection('screenings').get()).docs.map((d) => d.data());
const onSchedule = new Set(screenings.map((s) => s.film));
const byId = new Map(films.map((f) => [f.id, f]));

// ---------- Match each file to a film ----------
const matched = []; // { file, film, how, source }
const noFilm = [];
for (const file of files) {
  const base = file.replace(PICTURE, '');
  const row = listed.get(file);
  let film = byId.get(base), how = 'file name';
  if (!film && row?.title) { const m = matchTitle(row.title, films); if (m.film) { film = m.film; how = `title in the list (${m.how})`; } }
  if (!film) { const m = matchTitle(base.replace(/[-_]+/g, ' '), films); if (m.film) { film = m.film; how = `file name as a title (${m.how})`; } }
  if (film) matched.push({ file, film, how, source: row?.source || '' });
  else noFilm.push({ file, title: row?.title || '' });
}
// two files for one film: the one named after its ID wins, else the first
const chosen = new Map();
const extra = [];
for (const m of matched) {
  const prev = chosen.get(m.film.id);
  if (!prev) chosen.set(m.film.id, m);
  else if (m.how === 'file name' && prev.how !== 'file name') { extra.push({ ...prev, instead: m.file }); chosen.set(m.film.id, m); }
  else extra.push({ ...m, instead: prev.file });
}

// ---------- Make each picture smaller ----------
const work = fs.mkdtempSync(path.join(os.tmpdir(), 'afriff-posters-'));
let hasSips = true;
try { execFileSync('sips', ['--help'], { stdio: 'ignore' }); } catch { hasSips = false; }
function dimensions(file) {
  const out = execFileSync('sips', ['-g', 'pixelWidth', '-g', 'pixelHeight', file], { encoding: 'utf8' });
  return { width: Number(out.match(/pixelWidth: (\d+)/)?.[1]), height: Number(out.match(/pixelHeight: (\d+)/)?.[1]) };
}
function prepare(m) {
  const src = path.join(folder, m.file);
  const original = fs.readFileSync(src);
  if (!hasSips) return { bytes: original, before: original.length, type: /\.png$/i.test(m.file) ? 'image/png' : /\.webp$/i.test(m.file) ? 'image/webp' : 'image/jpeg', ext: path.extname(m.file).slice(1).toLowerCase().replace('jpeg', 'jpg'), size: '' };
  const { width, height } = dimensions(src);
  const scale = Math.min(1, MAX_WIDTH / width, MAX_HEIGHT / height);
  const w = Math.max(1, Math.round(width * scale)), h = Math.max(1, Math.round(height * scale));
  const isJpeg = /\.jpe?g$/i.test(m.file);
  if (isJpeg && scale === 1 && original.length <= HEAVY) return { bytes: original, before: original.length, type: 'image/jpeg', ext: 'jpg', size: `${w}×${h}` };
  const out = path.join(work, `${m.film.id}.jpg`);
  execFileSync('sips', ['-s', 'format', 'jpeg', '-s', 'formatOptions', String(QUALITY), ...(scale < 1 ? ['-z', String(h), String(w)] : []), src, '--out', out], { stdio: 'ignore' });
  let bytes = fs.readFileSync(out);
  // re-saving made it heavier (already well compressed): keep the original
  if (isJpeg && scale === 1 && bytes.length >= original.length) bytes = original;
  return { bytes, before: original.length, type: 'image/jpeg', ext: 'jpg', size: `${w}×${h}` };
}

const ourPrefix = `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/`;
const objectPath = (filmId, bytes, ext) => `images/films/${filmId}.${crypto.createHash('sha256').update(bytes).digest('hex').slice(0, 12)}.${ext}`;
// an earlier run of this script for this film (the console's uploads are named differently)
const ourEarlier = (film) => (film.image || '').startsWith(`${ourPrefix}${encodeURIComponent(`images/films/${film.id}.`)}`);
// same afriff.com picture as the app shows now? (both links carry its asset ID)
const asset = (u) => (u || '').match(/assets-v1\/([0-9a-f-]{36})\//i)?.[1] || u || '';

const plan = [];
for (const m of chosen.values()) {
  const p = prepare(m);
  const current = m.film.image || '';
  const target = objectPath(m.film.id, p.bytes, p.ext);
  const kind = !current ? 'none' : OUTSIDE.test(current) ? 'outside' : ourEarlier(m.film) ? 'ours' : 'team';
  const already = current.startsWith(ourPrefix + encodeURIComponent(target));
  const replace = !already && (kind !== 'team' || REPLACE_TEAM);
  plan.push({ ...m, ...p, target, kind, already, replace, samePicture: kind === 'outside' && m.source && asset(m.source) === asset(current) });
}

// ---------- Report ----------
const line = (s = '') => console.log(s);
const kb = (n) => `${Math.round(n / 1024)} KB`;
let bucketReady = false;
try { [bucketReady] = await bucket.exists(); } catch (e) { line(`(Couldn't check the storage bucket: ${e.message})`); }

line(`POSTERS: ${files.length} pictures in ${path.relative(root, folder) || folder}, ${films.length} films in the database`);
line(`Storage bucket ${bucketName}: ${bucketReady ? 'ready' : 'NOT SWITCHED ON YET (Firebase console → Storage → Get started)'}`);
if (!hasSips) line('macOS sips not found: pictures are uploaded as they are, not made smaller.');

line('\nFILES → FILMS');
for (const p of plan.sort((a, b) => a.film.title.localeCompare(b.film.title))) {
  const what = p.already ? 'already uploaded, nothing to do'
    : !p.replace ? `KEPT: the team set its own poster (${p.film.image.slice(0, 60)}…)`
    : p.kind === 'none' ? 'gets its first poster'
    : p.kind === 'ours' ? 'replaces the earlier upload'
    : p.samePicture ? 'same picture, now hosted by us' : 'replaces the afriff.com / IMDb link (a different picture)';
  const how = p.how === 'file name' ? '' : ` [matched by ${p.how}]`;
  line(`  ${p.file.padEnd(46)} → ${p.film.title} [${p.film.id}]${how}: ${what} · ${kb(p.before)} → ${kb(p.bytes.length)}${p.size ? ` (${p.size})` : ''}`);
}
if (extra.length) {
  line(`\nSECOND FILE FOR THE SAME FILM (${extra.length}): not used`);
  for (const e of extra) {
    const same = fs.readFileSync(path.join(folder, e.file)).equals(fs.readFileSync(path.join(folder, e.instead)));
    line(`  ${e.file} → ${e.film.title} [${e.film.id}]: using ${e.instead}${same ? ' (the same picture)' : ' (a DIFFERENT picture: rename the one you want to the film ID)'}`);
  }
}
if (noFilm.length) {
  line(`\nNO FILM FOR THESE FILES (${noFilm.length}): rename each to its film's ID (shown in the console's address bar on the film) and run again`);
  for (const n of noFilm) line(`  ${n.file}${n.title ? ` (list says: ${n.title})` : ''}`);
}
if (notPictures.length) line(`\nNOT PICTURES, SKIPPED: ${notPictures.join(', ')}`);

const replaced = plan.filter((p) => p.replace);
const kept = plan.filter((p) => !p.replace && !p.already);
const gotOne = new Set(plan.filter((p) => p.replace || p.already).map((p) => p.film.id));
const stillOutside = films.filter((f) => !gotOne.has(f.id) && OUTSIDE.test(f.image || ''));
const none = films.filter((f) => !gotOne.has(f.id) && !f.image);
line(`\nCHANGES: ${replaced.length} films get a poster hosted by us (${replaced.filter((p) => p.kind === 'none').length} had none, ${replaced.filter((p) => p.kind === 'outside').length} were linked from afriff.com / IMDb${replaced.some((p) => p.kind === 'ours') ? `, ${replaced.filter((p) => p.kind === 'ours').length} replace an earlier upload` : ''}${replaced.some((p) => p.kind === 'team') ? `, ${replaced.filter((p) => p.kind === 'team').length} replace a team link` : ''})`);
line(`  ${plan.filter((p) => p.already).length} already done, ${kept.length} kept as the team set them`);
line(`  Upload: ${kb(replaced.reduce((s, p) => s + p.bytes.length, 0))} (the originals were ${kb(replaced.reduce((s, p) => s + p.before, 0))})`);
if (stillOutside.length) {
  line(`\nSTILL LINKED FROM ANOTHER SITE, NO FILE HERE (${stillOutside.length}): add a picture named <film id>.jpg to the folder and run again`);
  for (const f of stillOutside) line(`  ${f.title} [${f.id}]`);
}
const noneScheduled = none.filter((f) => onSchedule.has(f.id));
line(`\nON THE SCHEDULE WITH NO POSTER (${noneScheduled.length}): a colour card shows instead (Programme, Home, My Festival, film page)`);
for (const f of noneScheduled) line(`  ${f.title} [${f.id}]${f.section ? ` · ${f.section}` : ''}`);
const noneElse = none.filter((f) => !onSchedule.has(f.id));
if (noneElse.length) line(`\nNOT ON THE SCHEDULE, NO POSTER (${noneElse.length}): ${noneElse.map((f) => f.title).join(', ')}`);

if (!WRITE) {
  line('\nDRY RUN: nothing was uploaded or changed. Run again with --write.');
  fs.rmSync(work, { recursive: true, force: true });
  process.exit(0);
}
if (!bucketReady) {
  console.error('\nStopped: Firebase Storage isn\'t switched on yet (Firebase console → Storage → Get started). Nothing was changed.');
  fs.rmSync(work, { recursive: true, force: true });
  process.exit(1);
}

// ---------- Write ----------
const backupDir = path.join(os.homedir(), 'Documents', 'afriff-backups');
fs.mkdirSync(backupDir, { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const backupFile = path.join(backupDir, `before-posters-${stamp}.json`);
fs.writeFileSync(backupFile, JSON.stringify(films.map((f) => ({ id: f.id, title: f.title, image: f.image ?? null })), null, 1));
line(`\nBackup of the poster links saved: ${backupFile}`);

// the link Firebase gives out for a file: works for anyone, never changes
async function upload(p) {
  const file = bucket.file(p.target);
  const [exists] = await file.exists();
  let token;
  if (exists) {
    const [meta] = await file.getMetadata();
    token = String(meta.metadata?.firebaseStorageDownloadTokens || '').split(',')[0];
    if (!token) { token = crypto.randomUUID(); await file.setMetadata({ metadata: { firebaseStorageDownloadTokens: token } }); }
  } else {
    token = crypto.randomUUID();
    await file.save(p.bytes, {
      resumable: false,
      metadata: {
        contentType: p.type,
        cacheControl: 'public, max-age=31536000, immutable',
        metadata: { firebaseStorageDownloadTokens: token, film: p.film.id, original: p.file },
      },
    });
  }
  return `${ourPrefix}${encodeURIComponent(p.target)}?alt=media&token=${token}`;
}

const links = new Map();
let done = 0;
const queue = [...replaced];
await Promise.all(Array.from({ length: 4 }, async () => {
  for (let p = queue.shift(); p; p = queue.shift()) {
    links.set(p.film.id, await upload(p));
    done++;
    if (done % 10 === 0 || done === replaced.length) line(`  uploaded ${done} of ${replaced.length}`);
  }
}));

// all uploads first, then the films in one go (up to 500 per batch)
const ids = [...links.keys()];
for (let i = 0; i < ids.length; i += 500) {
  const batch = db.batch();
  for (const id of ids.slice(i, i + 500)) batch.update(db.doc(`films/${id}`), { image: links.get(id) });
  await batch.commit();
}
fs.rmSync(work, { recursive: true, force: true });
line(`Done: ${links.size} posters uploaded and linked to their films.`);
line('Attendees see them after an admin presses Publish to app in the console.');
process.exit(0);
