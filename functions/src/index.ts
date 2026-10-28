// AFRIFF Cloud Functions (Firebase project afriff-app, London region like the database).
//
// syncFromAfriff: every 15 minutes, checks afriff.com's film list and brings our
// films in Firestore up to date, never overwriting what the team edited (see
// sync/plan.ts). Changes reach phones after an admin presses "Publish to app".
// SWITCHED OFF (28 Oct 2026, user decision): not exported, so a deploy doesn't
// create it (and, had it been deployed, Firebase would offer to delete it).
// Its code and tests stay. To switch it back on, uncomment the block below and
// the three imports marked for it, then `npm run deploy:functions`.
//
// pushScheduledInvites: every minute, sends the push notifications of scheduled
// invitations whose time has come, to their guests' phones (see invites/push.ts).
// "Send now" invitations get theirs from the staff app straight away.
//
// Needs the Blaze (pay-as-you-go) plan: Firebase only runs scheduled functions
// there. Expected cost at this size: nothing (43,200 runs a month, well inside
// the 2 million free; 1 Cloud Scheduler job of the 3 free ones; about 1 database
// read per minute when no invite is due). Set a budget alert anyway.

import { initializeApp } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { getMessaging } from 'firebase-admin/messaging'
import { logger } from 'firebase-functions'
import { onSchedule } from 'firebase-functions/scheduler'
import { fcmSender, firestorePushStore } from './invites/firestore'
import { sendScheduledPushes } from './invites/push'
// for syncFromAfriff (switched off, see above):
// import { FieldValue } from 'firebase-admin/firestore'
// import { runSync } from './sync/run'
// import { firestoreStore } from './sync/store'

initializeApp()

// export const syncFromAfriff = onSchedule(
//   {
//     schedule: 'every 15 minutes',
//     timeZone: 'Africa/Lagos',
//     region: 'europe-west2',
//     memory: '512MiB',
//     timeoutSeconds: 120,
//     // the next check is 15 minutes away anyway, and one at a time is enough
//     retryCount: 0,
//     maxInstances: 1,
//   },
//   async () => {
//     const store = firestoreStore(getFirestore(), () => FieldValue.serverTimestamp())
//     const r = await runSync({ store })
//     logger.info(`afriff.com sync: ${r.message}`, r)
//   },
// )

export const pushScheduledInvites = onSchedule(
  {
    schedule: '* * * * *',
    timeZone: 'Africa/Lagos',
    region: 'europe-west2',
    memory: '256MiB',
    timeoutSeconds: 60,
    // the next run is a minute away, and it picks up anything this one missed
    retryCount: 0,
    maxInstances: 1,
  },
  async () => {
    const r = await sendScheduledPushes({ store: firestorePushStore(getFirestore()), send: fcmSender(getMessaging()) })
    for (const o of r) {
      if (o.error) logger.error(`invite ${o.id}: pushes failed (tried again next minute): ${o.error}`, o)
      else logger.info(o.skipped ? `invite ${o.id}: no pushes (${o.skipped})` : `invite ${o.id}: pushed to ${o.pushed} of ${o.guests} guests`, o)
    }
  },
)
