// Keeps My Festival on this phone and in the signed-in person's account the
// same, so their plan and watched list follow them to another phone.
//
// The phone's own copy (lib/store.ts) stays what every screen uses, so taps
// show at once and everything works with no signal. This file:
//   - listens to the account's copy (attendeePlans/{uid}) live, so a change
//     made on another phone shows here within seconds,
//   - saves changes made here to the account a moment after the last tap.
//     With no signal, the Firebase SDK keeps the save on the phone (even if
//     the app is closed) and sends it by itself later.
//
// Who wins: we remember the last version both sides agreed on. If only one
// side changed since, that side wins (so removing a pick on one phone removes
// it everywhere). If both changed (two phones used offline at once), both
// are kept (mergePlans). Logging in on a phone that already has picks adds
// them to the account.
import { effectScope, reactive, watch, type EffectScope } from 'vue'
import { cleanPlan, isEmptyPlan, mergePlans, planFingerprint, type PlanData } from '@afriff/core/accounts/plans'
import { currentPlan, replacePlan } from './store'

const META_KEY = 'afriff-plan-sync'
const SAVE_DELAY = 1500

/** What the person sees in My Festival under their plan */
export const syncState = reactive({
  status: 'off' as 'off' | 'saving' | 'waiting' | 'saved' | 'error',
})

interface Meta {
  uid: string
  /** fingerprint of the last version the phone and the account agreed on ('' = never) */
  agreed: string
}

function readMeta(uid: string): Meta {
  try {
    const m = JSON.parse(localStorage.getItem(META_KEY) || 'null')
    if (m?.uid === uid && typeof m.agreed === 'string') return m
  } catch { /* fresh start */ }
  return { uid, agreed: '' }
}

let meta: Meta | null = null
function agree(fp: string) {
  if (!meta) return
  meta.agreed = fp
  try { localStorage.setItem(META_KEY, JSON.stringify(meta)) } catch { /* blocked: syncs again next start */ }
}

/** Everything in this plan has reached the account. */
export const planIsSaved = (p: PlanData) => !meta || planFingerprint(p) === meta.agreed

let uid = ''
let scope: EffectScope | null = null
let stopRemote: (() => void) | null = null
let timer: ReturnType<typeof setTimeout> | null = null
let ready = false // the account's copy has been seen at least once
let fb: typeof import('./firebase/account') | null = null

const EMPTY: PlanData = { scheduled: [], watched: {}, queuesChecked: [] }

export async function startPlanSync(forUid: string) {
  stopPlanSync(false)
  uid = forUid
  meta = readMeta(uid)
  ready = false
  syncState.status = 'saving'
  fb = await import('./firebase/account')
  if (uid !== forUid) return // signed out meanwhile

  stopRemote = fb.watchPlan(
    uid,
    ({ data, pending, fromCache }) => {
      if (pending) return // our own save, on its way
      if (data === null && fromCache) return // not known yet (offline): wait for the database
      ready = true
      reconcile(data === null ? null : cleanPlan(data))
    },
    (e) => {
      console.warn('[account] plan sync stopped', e)
      syncState.status = 'error'
    },
  )

  // a tap here: save it to the account shortly after
  scope = effectScope(true)
  scope.run(() => {
    watch(() => planFingerprint(currentPlan()), (fp) => {
      if (ready && fp !== meta?.agreed) schedule()
    })
  })
}

function reconcile(remote: PlanData | null) {
  if (!meta) return
  const mine = currentPlan()
  const theirs = remote ?? EMPTY
  const mineFp = planFingerprint(mine)
  const theirsFp = planFingerprint(theirs)
  if (mineFp === theirsFp) {
    agree(theirsFp)
    syncState.status = 'saved'
    return
  }
  const iChanged = meta.agreed ? mineFp !== meta.agreed : !isEmptyPlan(mine)
  const theyChanged = meta.agreed ? theirsFp !== meta.agreed : remote !== null && !isEmptyPlan(theirs)
  if (!iChanged) {
    agree(theirsFp) // first, so the watcher doesn't send it straight back
    replacePlan(theirs)
    syncState.status = 'saved'
  } else if (!theyChanged) {
    schedule(0)
  } else {
    replacePlan(mergePlans(mine, theirs))
    schedule(0)
  }
}

function schedule(delay = SAVE_DELAY) {
  if (timer) clearTimeout(timer)
  timer = setTimeout(() => void save(), delay)
}

async function save() {
  timer = null
  if (!fb || !meta) return
  const forUid = uid
  const plan = currentPlan()
  const fp = planFingerprint(plan)
  if (fp === meta.agreed) return
  syncState.status = navigator.onLine === false ? 'waiting' : 'saving'
  try {
    await fb.writePlan(forUid, plan) // resolves once the database has it (later, if offline)
    if (uid !== forUid) return
    agree(fp)
    syncState.status = planFingerprint(currentPlan()) === fp ? 'saved' : 'saving'
  } catch (e) {
    console.warn('[account] plan not saved', e)
    if (uid === forUid) syncState.status = 'error'
  }
}

/** Stop keeping in step (logging out: `forget` also drops what was agreed). */
export function stopPlanSync(forget: boolean) {
  stopRemote?.()
  stopRemote = null
  scope?.stop()
  scope = null
  if (timer) clearTimeout(timer)
  timer = null
  uid = ''
  ready = false
  syncState.status = 'off'
  if (forget) {
    meta = null
    try { localStorage.removeItem(META_KEY) } catch { /* blocked */ }
  }
}
