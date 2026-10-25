# @afriff/core

Shared code for both apps, imported as `@afriff/core/<path>`:

- `types/festival`: shapes of films, screenings, events, venues, news, jury, queue counts, the published bundle.
- `data/programme`, `data/events`, `data/jury`: built-in festival data (first-visit fallback, console import source).
- `utils/format`, `utils/now`: dates, times, queue labels; the Lagos clock and test switches (`?now=`, `?queues=sample`…).
- `firebase/config`, `firebase/app`: the Firebase app and Firestore with the offline cache on the device.
- `published`, `firebase/published`: the published-data feed (saved copy first, then live from `published/version` → `published/current`).

`nuxt.config.ts` is a tiny layer carrying `runtimeConfig.public.firebase` (the Firebase project both apps use).
