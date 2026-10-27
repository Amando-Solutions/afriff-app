// Contacts, groups and VIP sign-up links (console → Contacts), for admins and
// editors (firestore.rules agree). Who a contact is and who may be emailed:
// shared/contacts.ts. Written straight to the database from here: AFRIFF's
// own lists aren't something attendees see, so no approval step.
//   groups/{id}      { name }
//   contacts/{key}   AFRIFF's record of someone (key = email, lower case)
//   vipLinks/{code}  a private sign-up link for one group (admins only)
import {
  addDoc, arrayRemove, arrayUnion, collection, deleteDoc, doc, getDocs, onSnapshot, serverTimestamp, setDoc, updateDoc,
  writeBatch, type DocumentReference, type Timestamp, type Unsubscribe,
} from 'firebase/firestore'
import { cleanName, emailProblem, nameProblem } from '@afriff/core/accounts/rules'
import { contactFrom, contactKey, keyUsable, mergePeople, type AttendeeFacts, type Person } from '#shared/contacts'
import { auth, db } from './firebase'
import { useAdminAuth } from './useAdminAuth'

export interface Group { id: string; name: string }

const by = () => ({ updatedAt: serverTimestamp(), updatedBy: auth.currentUser?.uid ?? null })
const myName = () => useAdminAuth().profile?.name || auth.currentUser?.email || ''
const contactRef = (key: string) => doc(db, 'contacts', key)
const ms = (v: unknown) => (v as Timestamp | null)?.toMillis?.() ?? 0

/** Everyone: app sign-ups and AFRIFF's own records, one person per email. Reads one record per person. */
export async function loadPeople(): Promise<Person[]> {
  const [attendees, contacts] = await Promise.all([getDocs(collection(db, 'attendees')), getDocs(collection(db, 'contacts'))])
  const a: AttendeeFacts[] = attendees.docs.map((d) => {
    const x = d.data()
    return { uid: d.id, firstName: String(x.firstName ?? ''), lastName: String(x.lastName ?? ''), email: String(x.email ?? ''), marketing: x.marketing === true, createdAt: ms(x.createdAt) }
  })
  return mergePeople(a, contacts.docs.map((d) => contactFrom(d.id, d.data())))
}

// ---------- Groups ----------

export function watchGroups(onList: (g: Group[]) => void, onError: (e: Error) => void): Unsubscribe {
  return onSnapshot(collection(db, 'groups'), (snap) => {
    onList(snap.docs.map((d) => ({ id: d.id, name: String(d.get('name') ?? d.id) })).sort((x, y) => x.name.localeCompare(y.name, 'en-GB')))
  }, onError)
}

export const GROUP_NAME_MAX = 60

export function groupNameProblem(name: string, groups: Group[], except = ''): string | null {
  const n = cleanName(name)
  if (!n) return 'Name the group, e.g. Gala VIPs.'
  if (n.length > GROUP_NAME_MAX) return `Too long (${GROUP_NAME_MAX} characters at most).`
  if (groups.some((g) => g.id !== except && g.name.toLowerCase() === n.toLowerCase())) return 'There\'s already a group with that name.'
  return null
}

export async function createGroup(name: string): Promise<string> {
  const ref = await addDoc(collection(db, 'groups'), { name: cleanName(name), createdAt: serverTimestamp(), createdBy: auth.currentUser?.uid ?? null, ...by() })
  return ref.id
}

export const renameGroup = (id: string, name: string) => updateDoc(doc(db, 'groups', id), { name: cleanName(name), ...by() })

/** Admins: the group goes, everyone in it is taken out of it, and its VIP links are deleted. */
export async function deleteGroup(id: string, members: Person[], links: VipLink[]) {
  const refs: [DocumentReference, Record<string, unknown> | null][] = [
    ...members.filter((p) => p.contact).map((p) => [contactRef(p.key), { groups: arrayRemove(id), removedFrom: arrayRemove(id), ...by() }] as [DocumentReference, Record<string, unknown>]),
    ...links.filter((l) => l.group === id).map((l) => [doc(db, 'vipLinks', l.code), null] as [DocumentReference, null]),
  ]
  await commitAll(refs)
  await deleteDoc(doc(db, 'groups', id))
}

/** Many writes, 400 at a time (a batch takes 500). null = delete. */
async function commitAll(writes: [DocumentReference, Record<string, unknown> | null][]) {
  for (let i = 0; i < writes.length; i += 400) {
    const b = writeBatch(db)
    for (const [ref, data] of writes.slice(i, i + 400)) {
      if (data) b.set(ref, data, { merge: true })
      else b.delete(ref)
    }
    await b.commit()
  }
}

/**
 * Tick people into a group, or out of it. Taken out = recorded in
 * removedFrom, so a VIP link can't put them back by itself; ticked in again
 * by staff clears that.
 */
export async function setMembership(people: Person[], groupId: string, add: boolean) {
  const writes = people
    .filter((p) => add || p.groups.includes(groupId))
    .map((p) => [contactRef(p.key), add
      ? { groups: arrayUnion(groupId), removedFrom: arrayRemove(groupId), ...(p.uid ? { uid: p.uid } : {}), ...by() }
      : { groups: arrayRemove(groupId), removedFrom: arrayUnion(groupId), ...by() }] as [DocumentReference, Record<string, unknown>])
  await commitAll(writes)
}

// ---------- Guests added by hand ----------

// the app's own checks (@afriff/core/accounts/rules), about someone else
const theirs = (m: string | null) => m && m.replace(/\byour\b/g, 'their').replace(/\bYour\b/g, 'Their')
export const guestNameProblem = (n: string, label: 'first name' | 'last name') => theirs(nameProblem(n, label))
export const guestEmailProblem = (e: string) => theirs(emailProblem(e))
export const NOTES_MAX = 500

export interface HandAdded {
  firstName: string
  lastName: string
  email: string
  groups: string[]
  vip: boolean
  /** "This guest agreed to receive AFRIFF invitations" */
  agreed: boolean
  notes: string
}

/**
 * "Add a VIP by hand". Someone already on the list (signed up in the app, or
 * added before) isn't added twice: they get the groups and VIP mark, and
 * keep their own details.
 */
export async function addByHand(f: HandAdded, existing: Person | undefined): Promise<'added' | 'merged'> {
  const key = contactKey(f.email)
  if (!keyUsable(key)) throw new Error('That email can\'t be used here (it has a "/" in it).')
  const groups = f.groups.length ? { groups: arrayUnion(...f.groups), removedFrom: arrayRemove(...f.groups) } : {}
  const agreed = f.agreed ? { agreed: true, agreedBy: auth.currentUser?.uid ?? null, agreedByName: myName(), agreedAt: serverTimestamp() } : {}
  if (existing) {
    await setDoc(contactRef(key), {
      ...groups, ...(f.vip ? { vip: true } : {}), ...(f.notes ? { notes: f.notes } : {}),
      // their own details stay theirs; a hand-added guest's agreement can be recorded again unless they unsubscribed
      ...(!existing.hasApp && existing.consent !== 'unsubscribed' ? agreed : {}),
      ...(existing.uid ? { uid: existing.uid } : {}), ...by(),
    }, { merge: true })
    return 'merged'
  }
  await setDoc(contactRef(key), {
    firstName: cleanName(f.firstName), lastName: cleanName(f.lastName), email: f.email.trim(), source: 'afriff',
    vip: f.vip, groups: f.groups, removedFrom: [], agreed: false, ...agreed, notes: f.notes,
    addedBy: auth.currentUser?.uid ?? null, addedByName: myName(), createdAt: serverTimestamp(), ...by(),
  })
  return 'added'
}

export interface ContactChanges {
  firstName: string
  lastName: string
  email: string
  vip: boolean
  groups: string[]
  agreed: boolean
  notes: string
}

/** Saves the edit sheet. Name, email and agreement only change for guests with no app account (the rest is theirs). */
export async function saveContact(p: Person, c: ContactChanges, everyone: Person[]) {
  const added = c.groups.filter((g) => !p.groups.includes(g))
  const removed = p.groups.filter((g) => !c.groups.includes(g))
  const removedFrom = [...new Set([...p.removedFrom, ...removed])].filter((g) => !added.includes(g))
  const handAdded = !p.hasApp
  const agreedNow = handAdded && c.agreed && !p.contact?.agreed && p.consent !== 'unsubscribed'
  const data: Record<string, unknown> = {
    vip: c.vip, groups: c.groups, removedFrom, notes: c.notes.trim(), ...by(),
    ...(handAdded ? { firstName: cleanName(c.firstName), lastName: cleanName(c.lastName) } : {}),
    ...(handAdded && p.consent !== 'unsubscribed' ? { agreed: c.agreed } : {}),
    ...(agreedNow ? { agreedBy: auth.currentUser?.uid ?? null, agreedByName: myName(), agreedAt: serverTimestamp() } : {}),
    ...(p.uid ? { uid: p.uid } : {}),
  }
  const newKey = contactKey(c.email)
  if (!handAdded || newKey === p.key) {
    await setDoc(contactRef(p.key), data, { merge: true })
    return
  }
  // a new email for a hand-added guest: their record moves to it
  if (!keyUsable(newKey)) throw new Error('That email can\'t be used here (it has a "/" in it).')
  if (everyone.some((x) => x.key === newKey)) throw new Error('Someone with that email is already a contact. Edit them instead, and remove this one.')
  const was = p.contact
  const b = writeBatch(db)
  b.set(contactRef(newKey), {
    source: was?.source ?? 'afriff', agreedByName: was?.agreedByName ?? '', addedByName: was?.addedByName ?? myName(),
    ...(was?.agreedAt ? { agreedAt: new Date(was.agreedAt) } : {}),
    ...(was?.unsubscribedAt ? { unsubscribedAt: was.unsubscribedAt } : {}),
    ...(was?.lastLink ? { lastLink: was.lastLink } : {}),
    createdAt: was?.createdAt ? new Date(was.createdAt) : serverTimestamp(),
    ...data, email: c.email.trim(), previousEmails: arrayUnion(p.key),
  })
  b.delete(contactRef(p.key))
  await b.commit()
}

/** Takes AFRIFF's record of them away: a hand-added guest is gone; an app user keeps their account (Attendees page deletes that). */
export const removeContact = (p: Person) => deleteDoc(contactRef(p.key))

// ---------- VIP sign-up links (admins) ----------

export interface VipLink {
  code: string
  group: string
  label: string
  active: boolean
  createdByName: string
  createdAt: Timestamp | null
}

const ALPHABET = 'abcdefghijkmnpqrstuvwxyz23456789'

/** 24 random characters (about 120 bits): can't be guessed. */
function newCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(24))
  return [...bytes].map((b) => ALPHABET[b % ALPHABET.length]).join('')
}

export const vipLinkUrl = (code: string) => `${String(useRuntimeConfig().public.attendeeUrl || '').replace(/\/$/, '')}/vip/${code}`

export function watchVipLinks(onList: (l: VipLink[]) => void, onError: (e: Error) => void): Unsubscribe {
  return onSnapshot(collection(db, 'vipLinks'), (snap) => {
    onList(snap.docs.map((d) => {
      const x = d.data()
      return { code: d.id, group: String(x.group ?? ''), label: String(x.label ?? ''), active: x.active === true, createdByName: String(x.createdByName ?? ''), createdAt: (x.createdAt as Timestamp | null) ?? null }
    }).sort((a, b) => (b.createdAt?.toMillis() ?? Infinity) - (a.createdAt?.toMillis() ?? Infinity)))
  }, onError)
}

export const LINK_LABEL_MAX = 80

export async function createVipLink(group: Group, label: string): Promise<string> {
  const code = newCode()
  await setDoc(doc(db, 'vipLinks', code), {
    group: group.id, label: cleanName(label) || group.name, active: true,
    createdAt: serverTimestamp(), createdBy: auth.currentUser?.uid ?? null, createdByName: myName(),
  })
  return code
}

export const setVipLinkActive = (code: string, active: boolean) => updateDoc(doc(db, 'vipLinks', code), { active, ...by() })
export const deleteVipLink = (code: string) => deleteDoc(doc(db, 'vipLinks', code))
