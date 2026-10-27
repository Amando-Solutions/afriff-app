<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useOnline } from '@vueuse/core'
import { CheckCircle2Icon, CrownIcon, LinkIcon, WifiOffIcon } from 'lucide-vue-next'
import { MARKETING_CONSENT } from '@afriff/core/accounts/rules'
import { AccountProblem, account, setMarketing } from '~/lib/account'
import type { VipLink } from '~/lib/firebase/vip'

// A VIP sign-up link (/vip/<code>), made by an AFRIFF admin for one group
// (e.g. "Opening night"). Signed out: the app's normal sign-up or log-in, then
// back here, which adds them to the group, marked VIP (lib/firebase/vip.ts).
// Signed in: one tap. Their invitation comes by EMAIL, so if they haven't
// agreed to emails, the box is offered here (unticked, as on the sign-up page).
definePageMeta({ layout: false })
useHead({ title: 'You’re invited · AFRIFF 2026', meta: [{ name: 'robots', content: 'noindex' }] })

const route = useRoute()
const code = computed(() => String(route.params.code ?? '').trim().toLowerCase())
const here = computed(() => `/vip/${code.value}`)
/** sessionStorage: they went to sign up from this link; finish when they're back */
const PENDING = 'afriff-vip-join'
const online = useOnline()

type Stage = 'loading' | 'missing' | 'off' | 'invite' | 'done' | 'error'
const stage = ref<Stage>('loading')
const link = ref<VipLink | null>(null)
const problem = ref('')
const busy = ref(false)
const wantsEmails = ref(false)

const session = () => {
  try {
    return window.sessionStorage
  } catch {
    return null
  }
}

async function open() {
  stage.value = 'loading'
  problem.value = ''
  try {
    const { readVipLink } = await import('~/lib/firebase/vip')
    const l = await readVipLink(code.value)
    link.value = l
    stage.value = !l ? 'missing' : !l.active ? 'off' : 'invite'
    // back from signing up or logging in through this link: finish by itself
    if (stage.value === 'invite' && account.profile && session()?.getItem(PENDING) === code.value) await join()
  } catch {
    problem.value = online.value ? 'We couldn’t open your invitation just now. Try again in a minute.' : 'You’re offline. Connect to the internet to open your invitation.'
    stage.value = 'error'
  }
}
onMounted(open)

function signUp(mode: 'signup' | 'login') {
  session()?.setItem(PENDING, code.value)
  void navigateTo({ path: '/auth', query: { redirect: here.value, ...(mode === 'login' ? { mode: 'login' } : {}) } })
}

async function join() {
  if (!link.value) return
  busy.value = true
  problem.value = ''
  try {
    const { joinVipGroup } = await import('~/lib/firebase/vip')
    await joinVipGroup(code.value, link.value)
    session()?.removeItem(PENDING)
    if (wantsEmails.value && !account.profile?.marketing) await setMarketing(true)
    stage.value = 'done'
  } catch (e) {
    const c = (e as { code?: string }).code
    problem.value = e instanceof AccountProblem ? e.message
      : c === 'permission-denied' ? 'We couldn’t put you on this list. The link may have just been switched off, or AFRIFF took you off this list. Please contact AFRIFF.'
      : (e as Error).message === 'signed-out' ? 'Log in again, then open this link again.'
      : 'Something went wrong. Check your connection and try again.'
  } finally {
    busy.value = false
  }
}

async function saveEmails() {
  busy.value = true
  problem.value = ''
  try {
    await setMarketing(true)
  } catch (e) {
    problem.value = e instanceof AccountProblem ? e.message : 'We couldn’t save that. Check your connection and try again.'
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="with-status relative min-h-dvh overflow-x-hidden bg-canvas">
    <!-- the Home banner's festival glow, behind everything -->
    <div
      class="pointer-events-none absolute inset-x-0 top-0 h-136"
      style="
        background:
          radial-gradient(55% 45% at 85% 8%, rgb(217 164 65 / 0.22), transparent 70%),
          radial-gradient(60% 50% at 0% 45%, rgb(0 104 166 / 0.35), transparent 70%),
          linear-gradient(180deg, #0a1042 0%, #060a26 100%);
      "
      aria-hidden="true"
    />

    <div class="pt-safe relative mx-auto flex w-full max-w-md flex-col px-4 pb-[calc(2rem+env(safe-area-inset-bottom,0px))]">
      <header class="flex h-14 items-center">
        <NuxtLink to="/" aria-label="AFRIFF home"><AppLogo /></NuxtLink>
      </header>

      <main class="card relative mt-6 flex flex-col gap-4 p-5">
        <p v-if="stage === 'loading'" class="py-8 text-center text-muted" role="status">Opening your invitation…</p>

        <template v-else-if="stage === 'missing' || stage === 'off' || stage === 'error'">
          <span class="grid size-12 place-items-center rounded-full bg-raised text-muted" aria-hidden="true">
            <component :is="stage === 'error' && !online ? WifiOffIcon : LinkIcon" class="size-6" />
          </span>
          <h1 class="font-display text-h1 font-semibold">
            {{ stage === 'missing' ? 'This invitation link doesn’t work' : stage === 'off' ? 'This invitation link has been switched off' : 'Your invitation didn’t open' }}
          </h1>
          <p class="text-muted">
            {{ stage === 'missing' ? 'Check you have the whole link (it’s long), or ask the person who sent it to you.'
              : stage === 'off' ? 'Ask the person who sent it to you for a new one.'
              : problem }}
          </p>
          <UiButton v-if="stage === 'error'" size="lg" block :disabled="!online" @click="open">Try again</UiButton>
          <UiButton v-else size="lg" variant="secondary" block to="/">Open the AFRIFF app</UiButton>
        </template>

        <template v-else-if="link">
          <span class="grid size-12 place-items-center rounded-full bg-accent-soft text-accent-ink" aria-hidden="true">
            <component :is="stage === 'done' ? CheckCircle2Icon : CrownIcon" class="size-6" />
          </span>
          <div>
            <p class="eyebrow text-gold-300">AFRIFF 2026 · Lagos</p>
            <h1 class="mt-1 font-display text-h1 font-semibold">{{ stage === 'done' ? 'You’re on the guest list' : 'You’re invited' }}</h1>
            <p class="mt-0.5 font-display text-h2 font-semibold text-accent-ink">{{ link.label }}</p>
          </div>

          <!-- ---------- Not signed in: the app's own sign-up, then back here ---------- -->
          <template v-if="stage === 'invite' && !account.profile">
            <p class="text-ink/85">Sign up in the AFRIFF festival app to take your place on the guest list. Your invitation comes by email.</p>
            <p class="rounded-tile bg-raised px-3 py-2.5 text-meta text-ink">When you sign up, tick the box that lets AFRIFF email you, so we can send you your invitation.</p>
            <p v-if="!online" class="flex items-start gap-2 text-meta text-muted"><WifiOffIcon class="mt-0.5 size-4 shrink-0" /> You’re offline. Connect to the internet to sign up.</p>
            <UiButton size="lg" block :disabled="!online" @click="signUp('signup')">Sign up</UiButton>
            <UiButton size="lg" block variant="secondary" :disabled="!online" @click="signUp('login')">I have an account: log in</UiButton>
          </template>

          <!-- ---------- Signed in: one tap ---------- -->
          <template v-else-if="stage === 'invite'">
            <p class="text-ink/85">Signed in as <strong class="font-semibold">{{ account.profile?.email }}</strong>.</p>
            <label v-if="!account.profile?.marketing" class="flex cursor-pointer items-start gap-3 rounded-tile border border-line bg-canvas/50 p-3.5">
              <input v-model="wantsEmails" type="checkbox" class="mt-0.5 size-5 shrink-0 cursor-pointer accent-accent">
              <span class="text-body text-ink">{{ MARKETING_CONSENT }} <span class="block text-meta text-muted">Needed to get your invitation by email.</span></span>
            </label>
            <p v-if="problem" class="text-meta text-danger" role="alert">{{ problem }}</p>
            <UiButton size="lg" block :loading="busy" :disabled="!online" @click="join">{{ busy ? 'Adding you…' : 'Add me to the guest list' }}</UiButton>
          </template>

          <!-- ---------- Done ---------- -->
          <template v-else>
            <p v-if="account.profile?.marketing" class="text-ink/85">Your invitation will be emailed to <strong class="font-semibold">{{ account.profile.email }}</strong>. Check your spam folder too.</p>
            <template v-else>
              <p class="text-ink/85">To email you the invitation, we need your OK:</p>
              <label class="flex cursor-pointer items-start gap-3 rounded-tile border border-line bg-canvas/50 p-3.5">
                <input v-model="wantsEmails" type="checkbox" class="mt-0.5 size-5 shrink-0 cursor-pointer accent-accent">
                <span class="text-body text-ink">{{ MARKETING_CONSENT }}</span>
              </label>
              <UiButton size="lg" block :loading="busy" :disabled="!wantsEmails || !online" @click="saveEmails">Save</UiButton>
            </template>
            <p v-if="problem" class="text-meta text-danger" role="alert">{{ problem }}</p>
            <UiButton size="lg" block variant="secondary" to="/">Open the AFRIFF app</UiButton>
          </template>

          <p class="text-label text-muted">
            AFRIFF keeps your name and email to send your invitation and put you on the door list.
            <NuxtLink to="/privacy" class="font-medium text-accent-ink underline underline-offset-2">Privacy notice</NuxtLink>
          </p>
        </template>
      </main>
    </div>
  </div>
</template>
