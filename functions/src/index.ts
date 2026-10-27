// AFRIFF Cloud Functions (Firebase project afriff-app, London region like the database).
//
// syncFromAfriff: every 15 minutes, checks afriff.com's film list and brings our
// films in Firestore up to date, never overwriting what the team edited (see
// sync/plan.ts). Changes reach phones after an admin presses "Publish to app".
//
// Needs the Blaze (pay-as-you-go) plan: Firebase only runs scheduled functions
// there. Expected cost at this size: nothing (2,880 runs a month, a few seconds
// each, well inside Google's free allowances; 1 Cloud Scheduler job of the 3
// free ones). Set a budget alert anyway.

import { initializeApp } from 'firebase-admin/app'
import { FieldValue, getFirestore } from 'firebase-admin/firestore'
import { logger } from 'firebase-functions'
import { onSchedule } from 'firebase-functions/scheduler'
import { runSync } from './sync/run'
import { firestoreStore } from './sync/store'

initializeApp()

export const syncFromAfriff = onSchedule(
  {
    schedule: 'every 15 minutes',
    timeZone: 'Africa/Lagos',
    region: 'europe-west2',
    memory: '512MiB',
    timeoutSeconds: 120,
    // the next check is 15 minutes away anyway, and one at a time is enough
    retryCount: 0,
    maxInstances: 1,
  },
  async () => {
    const store = firestoreStore(getFirestore(), () => FieldValue.serverTimestamp())
    const r = await runSync({ store })
    logger.info(`afriff.com sync: ${r.message}`, r)
  },
)
