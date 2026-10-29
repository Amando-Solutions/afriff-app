// "Upload a picture" in the console: film posters, event graphics, sponsor
// logos and jury photos. The picture is made smaller on this device first
// (attendees on cheap phones and slow data download every poster they scroll
// past), then saved in Firebase Storage under images/<kind>/, and its link
// goes into the form's field exactly like a pasted link. Nothing reaches
// attendees until the item is saved (or approved) and an admin publishes.
//
// Who may upload: storage.rules (admins and editors). Each upload is a new
// file with its own link, so phones that kept the old picture offline fetch
// the new one. Same sizes as scripts/posters/upload-posters.mjs.
import { FirebaseError } from 'firebase/app'
import { app } from './firebase'
import { slugify, type UploadKind } from './schema'

/**
 * Biggest picture kept. Posters show at most about 270 points wide (400 for a
 * wide one), so this is sharp on a phone and about a third of a typical poster
 * file (every poster an attendee scrolls past is downloaded).
 */
export const MAX_WIDTH = 720
export const MAX_HEIGHT = 1080
const QUALITY = 0.72
const ACCEPT = ['image/jpeg', 'image/png', 'image/webp']
/** before shrinking (a phone photo is 3–12 MB) */
const MAX_FILE = 25 * 1024 * 1024
/** after shrinking; storage.rules refuses 3 MB and over */
const MAX_UPLOAD = 3 * 1024 * 1024 - 1

/** A problem worth showing as it is, in plain words */
export class UploadProblem extends Error {}

/** Width and height that fit inside the box, never bigger than the original */
export function fitWithin(width: number, height: number, maxWidth = MAX_WIDTH, maxHeight = MAX_HEIGHT) {
  const scale = Math.min(1, maxWidth / width, maxHeight / height)
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) }
}

function hasSeeThrough(ctx: CanvasRenderingContext2D, width: number, height: number) {
  const data = ctx.getImageData(0, 0, width, height).data
  for (let i = 3; i < data.length; i += 4) if (data[i]! < 255) return true
  return false
}

/** The picture to upload: shrunk to fit, a PNG if it has see-through parts (logos), else a JPEG */
export async function preparePicture(file: File): Promise<{ blob: Blob; type: string; ext: string }> {
  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file)
  } catch {
    throw new UploadProblem('That file can’t be opened as a picture. Use a JPEG or PNG.')
  }
  const { width, height } = fitWithin(bitmap.width, bitmap.height)
  const unchanged = width === bitmap.width && height === bitmap.height
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new UploadProblem('This browser can’t prepare the picture. Try Chrome or Safari.')
  ctx.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()
  const png = hasSeeThrough(ctx, width, height)
  const type = png ? 'image/png' : 'image/jpeg'
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, QUALITY))
  if (!blob) throw new UploadProblem('This browser can’t prepare the picture. Try Chrome or Safari.')
  // already small enough: the original is kept as it is
  if (unchanged && file.type === type && file.size <= blob.size) return { blob: file, type, ext: png ? 'png' : 'jpg' }
  return { blob, type, ext: png ? 'png' : 'jpg' }
}

function problemFrom(err: unknown): Error {
  if (err instanceof UploadProblem) return err
  if (typeof navigator !== 'undefined' && !navigator.onLine) return new UploadProblem('You’re offline. Connect to the internet and upload again.')
  const code = err instanceof FirebaseError ? err.code : ''
  if (code === 'storage/unauthorized' || code === 'storage/unauthenticated') {
    return new UploadProblem('The upload was refused. Only admins and editors can upload pictures. If you are one, ask the developer to deploy the picture rules (npm run deploy:storage).')
  }
  if (['storage/no-default-bucket', 'storage/bucket-not-found', 'storage/project-not-found', 'storage/unknown'].includes(code)) {
    return new UploadProblem('Picture uploads aren’t switched on yet (Firebase Storage). Paste a link instead, or ask the developer.')
  }
  // also what a browser sees while Storage isn't switched on: it can't reach the bucket at all
  if (code === 'storage/retry-limit-exceeded') {
    return new UploadProblem('The upload didn’t get through. Check your connection and try again. If your connection is fine, picture uploads may not be switched on yet (Firebase Storage): ask the developer, or paste a link instead.')
  }
  if (code === 'storage/canceled') return new UploadProblem('The upload was stopped.')
  return new UploadProblem(`The upload didn’t work (${code || (err instanceof Error ? err.message : 'unknown problem')}). Try again, or paste a link instead.`)
}

/**
 * Shrink the picture, upload it and give back its link.
 * `onProgress` gets 0–100 while it uploads.
 */
export async function uploadPicture(file: File, kind: UploadKind, onProgress?: (percent: number) => void): Promise<string> {
  if (!ACCEPT.includes(file.type)) throw new UploadProblem('Use a JPEG, PNG or WebP picture.')
  if (file.size > MAX_FILE) throw new UploadProblem('That file is over 25 MB. Use a smaller picture.')
  try {
    const { blob, type, ext } = await preparePicture(file)
    if (blob.size > MAX_UPLOAD) throw new UploadProblem('That picture is still over 3 MB after making it smaller. Use a simpler or smaller picture.')
    // only loaded when someone uploads, so the rest of the console stays light
    const { getStorage, ref, uploadBytesResumable, getDownloadURL } = await import('firebase/storage')
    const base = slugify(file.name.replace(/\.[^.]+$/, '')).slice(0, 40)
    const name = `${base}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}.${ext}`
    const storage = getStorage(app)
    // keep trying through a patchy signal for 2 minutes, then say so (Firebase's default is 10)
    storage.maxUploadRetryTime = 2 * 60 * 1000
    storage.maxOperationRetryTime = 60 * 1000
    const task = uploadBytesResumable(ref(storage, `images/${kind}/${name}`), blob, {
      contentType: type,
      // never changes at this address (a new picture is a new file)
      cacheControl: 'public, max-age=31536000, immutable',
    })
    await new Promise<void>((resolve, reject) => {
      task.on('state_changed', (s) => onProgress?.(s.totalBytes ? Math.round((100 * s.bytesTransferred) / s.totalBytes) : 0), reject, () => resolve())
    })
    return await getDownloadURL(task.snapshot.ref)
  } catch (err) {
    throw problemFrom(err)
  }
}
