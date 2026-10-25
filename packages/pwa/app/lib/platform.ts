// What kind of device and launch this is, for the install prompts.
// Ported from DP Fitness (apps/pwa/app/lib/platform.ts).

export const isIosDevice = (): boolean => {
  if (import.meta.server) return false
  const ua = navigator.userAgent
  // iPadOS 13+ reports itself as a Mac; only the touch points give it away.
  return /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)
}

/** Launched from the home screen rather than opened in a browser tab. */
export const isStandalone = (): boolean => {
  if (import.meta.server) return false
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: minimal-ui)').matches ||
    // Safari's own flag, which iOS still sets.
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}
