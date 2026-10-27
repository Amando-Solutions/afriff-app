<script setup lang="ts">
import { ArrowLeftIcon } from 'lucide-vue-next'

// The full privacy notice, linked from the sign-up page. Open to everyone
// (no account needed to read it).
//
// AFRIFF MUST APPROVE THIS TEXT before launch (their lawyer: Nigeria Data
// Protection Act 2023), and CONFIRM: how long accounts are kept after the
// festival, and the contact address (NUXT_PUBLIC_PRIVACY_EMAIL). Everything
// below describes what the app really does; keep it that way if the app changes.
definePageMeta({ layout: false })
useHead({ title: 'Privacy notice · AFRIFF 2026' })

const privacyEmail = String(useRuntimeConfig().public.privacyEmail || '')
const router = useRouter()
function back() {
  if (window.history.length > 1) router.back()
  else void router.replace('/')
}
</script>

<template>
  <div class="with-status min-h-dvh bg-canvas">
    <header class="pt-safe sticky top-(--offline-bar,0px) z-40 border-b border-line bg-chrome backdrop-blur-xl">
      <div class="mx-auto flex h-14 w-full max-w-xl items-center gap-3 px-4">
        <button type="button" class="pressable -ml-2 grid size-10 place-items-center rounded-full text-ink hover:bg-hover" aria-label="Back" @click="back">
          <ArrowLeftIcon class="size-5" />
        </button>
        <AppLogo />
      </div>
    </header>

    <main class="mx-auto w-full max-w-xl px-4 pt-6 pb-[calc(3rem+env(safe-area-inset-bottom,0px))]">
      <h1 class="font-display text-h1 font-semibold">Privacy notice</h1>
      <p class="mt-1 text-meta text-muted">AFRIFF festival app · Last updated 26 October 2026</p>

      <div class="prose-notice mt-6 flex flex-col gap-6 text-prose text-ink/90">
        <section>
          <h2>Who is responsible</h2>
          <p>The Africa International Film Festival (AFRIFF) runs this app and is responsible for the information in it. AFRIFF owns the information you give us here.</p>
        </section>

        <section>
          <h2>What we collect when you sign up</h2>
          <ul>
            <li>Your first name, last name and email.</li>
            <li>Your password, stored scrambled by Google Firebase (the login service), so nobody (AFRIFF included) can read it.</li>
            <li>If you use "Continue with Google": the name and email on your Google account, instead of a password. Google also passes on a link to your profile picture, which the app doesn't use. We never see your Google password.</li>
            <li>Your festival plan: the screenings and events you add, the films you mark "Seen it", your star ratings and the queues you've checked.</li>
            <li>When you signed up and last logged in, and whether you said yes to festival emails (with the exact wording you agreed to).</li>
            <li>If you turn on "Alerts on this phone" while logged in: that phone's notification address, linked to your account so an invitation sent to you also arrives as a notification. Logging out, turning alerts off or deleting your account removes the link.</li>
          </ul>
          <p>We don't collect your phone number, your location or any payment details.</p>
        </section>

        <section>
          <h2>Why</h2>
          <ul>
            <li>To keep your festival plan in your account, so you can log in on any phone and find it there.</li>
            <li>To email you a link to choose a new password if you forget yours.</li>
            <li>Only if you tick "AFRIFF may email me invitations and festival updates": to send you invitations and festival updates. Every email has an unsubscribe link.</li>
          </ul>
        </section>

        <section>
          <h2>Anonymous counts</h2>
          <p>Separately, unless you switch it off in Profile, the app shares counts with no name or email attached: which screenings are planned, how films are rated and which days the app was used. They help AFRIFF plan the festival.</p>
        </section>

        <section>
          <h2>Who can see it</h2>
          <p>AFRIFF's festival team (admins and editors) can see attendees' names and emails, to prepare invitations and guest lists. Only admins can export them, send emails or delete accounts. Door volunteers can't see them.</p>
          <p>These services run parts of the app for AFRIFF: Google Firebase (the database, log-in, password-reset emails and notifications; data stored in London, UK), Vercel (hosts the app) and Brevo (invitations and festival emails, only if you said yes). We don't sell your information.</p>
        </section>

        <section>
          <h2>How long we keep it</h2>
          <p>Until you delete your account, or until AFRIFF closes the app's accounts after the festival.</p>
        </section>

        <section>
          <h2>Your choices</h2>
          <ul>
            <li>Change your mind about festival emails at any time: use the switch in Profile (your picture at the top of the screen), or the unsubscribe link in any festival email.</li>
            <li>Delete your account and everything in it: Profile → Delete my account.</li>
            <li>Logging out removes your plan from that phone. It stays in your account for next time.</li>
            <li>
              To ask for a copy of your information, a correction, or deletion,
              <template v-if="privacyEmail">email <a :href="`mailto:${privacyEmail}`">{{ privacyEmail }}</a>.</template>
              <template v-else>contact AFRIFF through <a href="https://afriff.com" target="_blank" rel="noopener">afriff.com</a>.</template>
            </li>
          </ul>
        </section>
      </div>
    </main>
  </div>
</template>

<style scoped>
.prose-notice :deep(h2) {
  font-family: var(--font-display);
  font-size: var(--text-h3);
  line-height: var(--text-h3--line-height);
  font-weight: 600;
  color: var(--c-ink);
  margin-bottom: 0.5rem;
}
.prose-notice :deep(p + p) {
  margin-top: 0.5rem;
}
.prose-notice :deep(ul) {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
  padding-left: 1.125rem;
  list-style: disc;
}
.prose-notice :deep(ul + p) {
  margin-top: 0.5rem;
}
.prose-notice :deep(a) {
  color: var(--c-accent-ink);
  text-decoration: underline;
  text-underline-offset: 2px;
}
</style>
