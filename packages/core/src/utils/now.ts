// The app's clock.
// TEST CLOCK: add ?now=2026-11-01T17:15 to the address
// (e.g. http://localhost:3000/programme?now=2026-11-01T17:15) to make
// the app behave as if it's that time in Lagos. The clock keeps ticking
// from there. Without ?now= it uses the real time.
import { tryUseNuxtApp } from '#app';

// Testing switches (?now=, ?queues=sample, ?welcome=1, ?share=1, ?install=ios)
// are read from the address when the app opens and remembered for this browser
// tab, so they keep working after you move between pages or reload. Close the
// tab to clear.
// ONLY where NUXT_PUBLIC_TEST_SWITCHES=true (runtimeConfig.public.testSwitches,
// packages/core/nuxt.config.ts). Otherwise, e.g. in production, they're ignored
// and the app runs on the real clock and real data.
type WithNuxt = Window & { __NUXT__?: { config?: { public?: { testSwitches?: unknown } } } };

export function testSwitchesAllowed(): boolean {
  if (typeof window === 'undefined') return false;
  const value =
    tryUseNuxtApp()?.$config.public.testSwitches ??
    // Nuxt writes the public config into the page itself (index.html)
    (window as WithNuxt).__NUXT__?.config?.public?.testSwitches;
  return value === true || value === 'true';
}

export function testSwitch(name: string): string | null {
  if (!testSwitchesAllowed()) return null;
  try {
    const fromUrl = new URLSearchParams(window.location.search).get(name);
    if (fromUrl !== null) {
      sessionStorage.setItem(`afriff-test-${name}`, fromUrl);
      return fromUrl;
    }
    return sessionStorage.getItem(`afriff-test-${name}`);
  } catch {
    return null;
  }
}

function readOffset() {
  try {
    const p = testSwitch('now');
    if (!p) return 0;
    const hasZone = /([+-]\d\d:\d\d|Z)$/.test(p);
    const d = new Date(hasZone ? p : `${p}${p.length <= 16 ? ':00' : ''}+01:00`);
    return Number.isNaN(d.getTime()) ? 0 : d.getTime() - Date.now();
  } catch {
    return 0;
  }
}

// Worked out on the first call (not on import), once the app's config is there.
let offset: number | null = null;

export const now = () => {
  if (offset === null) offset = readOffset();
  return new Date(Date.now() + offset);
};

// 'YYYY-MM-DD' in Lagos
export const lagosDate = (d: Date = now()): string =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Lagos' }).format(d);

// minutes since midnight in Lagos
export function lagosMinutes(d: Date = now()): number {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Africa/Lagos', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(d);
  const h = Number(parts.find((x) => x.type === 'hour')?.value ?? 0);
  const m = Number(parts.find((x) => x.type === 'minute')?.value ?? 0);
  return h * 60 + m;
}
