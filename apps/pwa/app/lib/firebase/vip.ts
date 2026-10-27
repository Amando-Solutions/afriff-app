// VIP sign-up links (the /vip/<code> page): AFRIFF's admins make a private
// link per group in the staff console (Contacts → VIP sign-up links). Someone
// who opens it, then signs up or logs in, is added to that group, marked VIP:
//   vipLinks/{code}   { group, label, active }: anyone holding the link can read
//                     that one record (the code is the secret); nobody can list them
//   contacts/{email}  AFRIFF's record of them (email in lower case). This phone
//                     may only add its own signed-in email to the link's group;
//                     firestore.rules check the link is real and switched on.
// Their invitation then comes by email (only if they agreed to emails).
//
// Loaded with import() from the page only.
import { arrayUnion, doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore'
import { firebaseDb } from '@afriff/core/firebase/app'
import { signedInUser } from './account'

export interface VipLink {
  group: string
  /** what guests see, e.g. "Opening night" */
  label: string
  active: boolean
}

/** The link's record, or null if there's no such link. */
export async function readVipLink(code: string): Promise<VipLink | null> {
  if (!/^[a-z0-9]{16,64}$/.test(code)) return null
  const snap = await getDoc(doc(firebaseDb(), 'vipLinks', code))
  if (!snap.exists()) return null
  return { group: String(snap.get('group') ?? ''), label: String(snap.get('label') ?? ''), active: snap.get('active') === true }
}

/** Adds the signed-in person to the link's group, as a VIP. */
export async function joinVipGroup(code: string, link: VipLink) {
  const user = await signedInUser()
  if (!user?.email) throw new Error('signed-out')
  await setDoc(doc(firebaseDb(), 'contacts', user.email.trim().toLowerCase()), {
    groups: arrayUnion(link.group),
    vip: true,
    uid: user.uid,
    lastLink: code,
    joinedAt: serverTimestamp(),
  }, { merge: true })
}
