<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, reactive, ref } from 'vue'
import { useOnline } from '@vueuse/core'
import { ArrowLeftIcon, EyeIcon, EyeOffIcon } from 'lucide-vue-next'
import { FESTIVAL, FILMS } from '@afriff/core/data/programme'
import { MARKETING_CONSENT, emailProblem, nameProblem, pinProblem } from '@afriff/core/accounts/rules'
import { now as clockNow } from '@afriff/core/utils/now'
import {
  AccountProblem, fetchAccountStatus, logIn, resetPin, safeRedirect, sendCode, signUp, skipForNow, type AccountStatus,
} from '~/lib/account'

// THE FIRST SCREEN: sign up or log in (middleware/account.global.ts sends
// everyone here until they have). One screen, big fields, the festival behind
// it. Forgot PIN emails a 6-digit code. The checks here are the same as the
// server's (@afriff/core/accounts/rules), so most mistakes show at once,
// without waiting on slow data.
definePageMeta({ layout: false })
useHead({ title: 'Welcome · AFRIFF 2026' })

const route = useRoute()
const router = useRouter()
const privacyEmail = String(useRuntimeConfig().public.privacyEmail || '')

type Mode = 'signup' | 'login' | 'forgot' | 'code'
const mode = ref<Mode>(route.query.mode === 'login' ? 'login' : 'signup')
const signedOutBySelf = route.query.again === '1'

const form = reactive({ firstName: '', lastName: '', email: '', pin: '', pin2: '', code: '', marketing: false })
const showPin = ref(false)
const errors = reactive<Record<string, string>>({})
const problem = ref<AccountProblem | null>(null)
const busy = ref(false)
const sentTo = ref('')
const note = ref(signedOutBySelf ? 'Please log in again on this phone.' : '')

function go(next: Mode | 'continue') {
  if (next === 'continue') return enter()
  mode.value = next
  clearProblems()
  form.pin = ''
  form.pin2 = ''
  form.code = ''
}
function clearProblems() {
  for (const k of Object.keys(errors)) delete errors[k]
  problem.value = null
  note.value = ''
}

// ---------- Never lock people out (no signal, server down, not set up, not required) ----------
const status = ref<AccountStatus | null | undefined>(undefined) // undefined = still asking
const online = useOnline()
void fetchAccountStatus().then((s) => { status.value = s })

const unreachable = computed(() => status.value === null || problem.value?.reason === 'unreachable')
const letIn = computed<'continue' | 'skip' | null>(() => {
  if (unreachable.value || status.value?.accounts === false) return 'continue'
  if (status.value?.requireSignUp === false) return 'skip'
  return null
})
const letInNote = computed(() => {
  if (letIn.value !== 'continue') return ''
  if (status.value?.accounts === false) return 'Sign-up isn\'t open yet. You can use the app now.'
  return online.value
    ? 'We can\'t reach AFRIFF right now. You can use the app now and sign up next time.'
    : 'You\'re offline. Signing up needs a connection, so you can use the app now and sign up next time.'
})

const destination = () => safeRedirect(route.query.redirect) || '/'
function enter() {
  skipForNow()
  void router.replace(destination())
}

// ---------- Sending ----------
async function run(task: () => Promise<void>) {
  busy.value = true
  try {
    await task()
  } catch (e) {
    const p = e instanceof AccountProblem ? e : new AccountProblem('Something went wrong. Try again.', 0)
    // a problem with one field shows under it; the rest show above the button
    if (p.field && !['exists', 'unknown'].includes(p.reason || '')) errors[p.field] = p.message
    else problem.value = p
    void focusProblem()
  } finally {
    busy.value = false
  }
}
async function focusProblem() {
  await nextTick()
  document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
}
function checked(found: Record<string, string | null>) {
  clearProblems()
  for (const [k, v] of Object.entries(found)) if (v) errors[k] = v
  if (Object.keys(errors).length) {
    void focusProblem()
    return false
  }
  return true
}
const samePin = (a: string, b: string) => (a === b ? null : 'The two PINs don\'t match.')

function submitSignUp() {
  if (!checked({
    firstName: nameProblem(form.firstName, 'first name'),
    lastName: nameProblem(form.lastName, 'last name'),
    email: emailProblem(form.email),
    pin: pinProblem(form.pin),
    pin2: pinProblem(form.pin) ? null : samePin(form.pin, form.pin2),
  })) return
  void run(async () => {
    await signUp({ firstName: form.firstName, lastName: form.lastName, email: form.email.trim(), pin: form.pin, marketing: form.marketing })
    await router.replace(destination())
  })
}

function submitLogIn() {
  if (!checked({ email: emailProblem(form.email), pin: /^\d{4}$/.test(form.pin) ? null : 'Your PIN is 4 digits.' })) return
  void run(async () => {
    await logIn(form.email.trim(), form.pin)
    await router.replace(destination())
  })
}

function submitForgot() {
  if (!checked({ email: emailProblem(form.email) })) return
  void run(async () => {
    sentTo.value = await sendCode(form.email.trim())
    go('code')
  })
}

function resend() {
  clearProblems()
  void run(async () => {
    sentTo.value = await sendCode(form.email.trim())
    note.value = 'We sent a new code. Use the newest one.'
  })
}

function submitCode() {
  if (!checked({
    code: /^\d{6}$/.test(form.code) ? null : 'The code is the 6 digits in the email.',
    pin: pinProblem(form.pin),
    pin2: pinProblem(form.pin) ? null : samePin(form.pin, form.pin2),
  })) return
  void run(async () => {
    await resetPin(form.email.trim(), form.code, form.pin)
    await router.replace(destination())
  })
}

const action = computed(() => {
  switch (problem.value?.reason) {
    case 'exists': return { label: 'Log in instead', to: 'login' as Mode }
    case 'unknown': return { label: 'Sign up instead', to: 'signup' as Mode }
    case 'paused':
    case 'reset': return { label: 'Forgot PIN?', to: 'forgot' as Mode }
    case 'unreachable': return { label: 'Continue for now', to: 'continue' as const }
    default: return null
  }
})

// ---------- The festival behind it ----------
const nowMs = ref(clockNow().getTime())
const tick = setInterval(() => { nowMs.value = clockNow().getTime() }, 30_000)
onBeforeUnmount(() => clearInterval(tick))
const countdown = computed(() => {
  const diff = Math.max(0, new Date(FESTIVAL.openingNight).getTime() - nowMs.value)
  const min = Math.floor(diff / 60_000)
  return { d: Math.floor(min / 1440), h: Math.floor((min % 1440) / 60), m: min % 60, done: diff === 0 }
})
// the opening film in the middle, festival posters fanned out around it
const posters = computed(() => {
  const withImage = FILMS.filter((f) => f.image)
  const opening = withImage.find((f) => f.section === 'Opening Movie')
  const others = withImage.filter((f) => f !== opening).slice(0, opening ? 4 : 5)
  return opening ? [...others.slice(0, 2), opening, ...others.slice(2)] : others
})
const FAN = [
  'z-1 w-[4.25rem] -rotate-[11deg] translate-y-4 translate-x-3 opacity-60',
  'z-2 w-[4.75rem] -rotate-[5deg] translate-y-1 translate-x-1 opacity-80',
  'z-3 w-[5.75rem]',
  'z-2 w-[4.75rem] rotate-[5deg] translate-y-1 -translate-x-1 opacity-80',
  'z-1 w-[4.25rem] rotate-[11deg] translate-y-4 -translate-x-3 opacity-60',
]
</script>

<template>
  <div class="relative min-h-dvh overflow-x-hidden bg-canvas">
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
    <AppOfflineBanner message="You’re offline. Signing up needs a connection." />

    <div class="pt-safe relative mx-auto flex w-full max-w-md flex-col px-4 pb-[calc(2rem+env(safe-area-inset-bottom,0px))]">
      <header class="flex h-14 items-center">
        <AppLogo />
      </header>

      <!-- posters + countdown: it should feel like the festival, not a form -->
      <!-- the posters fade out at the bottom into whatever is behind them -->
      <div class="relative flex h-36 items-end justify-center [mask-image:linear-gradient(to_bottom,black_40%,transparent_96%)]" aria-hidden="true">
        <FilmPoster v-for="(f, i) in posters" :key="f.id" :film="f" class="-mx-1.5 aspect-[2/3] rounded-thumb shadow-pop" :class="FAN[i]" />
      </div>
      <section class="relative z-5 -mt-3 text-center">
        <p class="eyebrow text-gold-300">1–7 Nov 2026 · Lagos</p>
        <h1 class="mx-auto mt-1.5 max-w-[22ch] font-display text-2xl leading-7 font-semibold tracking-tight">Seven days of African stories on the big screen</h1>
        <p v-if="!countdown.done" class="mt-3 inline-flex items-center gap-2 rounded-full bg-white/6 px-3.5 py-1.5 text-meta text-white/75" role="timer">
          Opening night in
          <strong class="font-semibold text-ink tabular-nums">{{ countdown.d }}d {{ countdown.h }}h {{ countdown.m }}m</strong>
        </p>
        <p v-else class="mt-3 text-meta text-white/75">The festival is on. Welcome!</p>
      </section>

      <!-- signing up can't work right now: say so first, with the way in -->
      <div v-if="letIn === 'continue'" class="relative z-5 mt-5 flex flex-col gap-3 rounded-card border border-accent/40 bg-surface p-4" role="status">
        <p class="text-body text-ink">{{ letInNote }}</p>
        <UiButton block @click="enter">Continue for now</UiButton>
      </div>

      <main class="card relative z-5 mt-5 p-4">
        <!-- Sign up | Log in -->
        <div v-if="mode === 'signup' || mode === 'login'" role="tablist" aria-label="Sign up or log in" class="flex rounded-full bg-raised p-1">
          <button
            v-for="m in ([['signup', 'Sign up'], ['login', 'Log in']] as const)"
            :key="m[0]"
            type="button"
            role="tab"
            :aria-selected="mode === m[0]"
            class="h-10 flex-1 rounded-full text-body font-semibold transition-[background-color,color,box-shadow] duration-200"
            :class="mode === m[0] ? 'bg-surface text-ink shadow-[0_1px_2px_rgb(2_4_20/0.2),0_0_0_1px_var(--c-line)]' : 'text-muted'"
            @click="go(m[0])"
          >{{ m[1] }}</button>
        </div>
        <button v-else type="button" class="pressable -ml-1 flex items-center gap-1.5 rounded-full px-1 py-1 text-meta font-medium text-muted hover:text-ink" @click="go('login')">
          <ArrowLeftIcon class="size-4" /> Back to log in
        </button>

        <p v-if="note" class="mt-4 rounded-tile bg-accent-soft px-3 py-2 text-meta text-ink" role="status">{{ note }}</p>

        <!-- ---------- Sign up ---------- -->
        <form v-if="mode === 'signup'" class="mt-4 flex flex-col gap-4" novalidate @submit.prevent="submitSignUp">
          <div class="grid grid-cols-2 gap-3">
            <AuthField field-id="first-name" label="First name" :error="errors.firstName">
              <input id="first-name" v-model="form.firstName" class="field-input h-12" autocomplete="given-name" autocapitalize="words" maxlength="60" :aria-invalid="!!errors.firstName || undefined">
            </AuthField>
            <AuthField field-id="last-name" label="Last name" :error="errors.lastName">
              <input id="last-name" v-model="form.lastName" class="field-input h-12" autocomplete="family-name" autocapitalize="words" maxlength="60" :aria-invalid="!!errors.lastName || undefined">
            </AuthField>
          </div>
          <AuthField field-id="email" label="Email" :error="errors.email">
            <input id="email" v-model="form.email" class="field-input h-12" type="email" inputmode="email" autocomplete="email" autocapitalize="off" spellcheck="false" maxlength="254" :aria-invalid="!!errors.email || undefined">
          </AuthField>
          <div class="grid grid-cols-2 gap-3">
            <AuthField field-id="pin" label="Choose a 4-digit PIN" :error="errors.pin">
              <PinInput id="pin" v-model="form.pin" autocomplete="new-password" :show="showPin" :invalid="!!errors.pin" />
            </AuthField>
            <AuthField field-id="pin2" label="PIN again" :error="errors.pin2">
              <PinInput id="pin2" v-model="form.pin2" autocomplete="new-password" :show="showPin" :invalid="!!errors.pin2" />
            </AuthField>
          </div>
          <div class="-mt-2 flex items-start justify-between gap-3">
            <p class="text-label text-subtle">To log in on another phone. Not 1234, repeats or a year.</p>
            <button type="button" class="pressable flex shrink-0 items-center gap-1 text-label font-medium text-muted hover:text-ink" :aria-pressed="showPin" @click="showPin = !showPin">
              <component :is="showPin ? EyeOffIcon : EyeIcon" class="size-4" /> {{ showPin ? 'Hide' : 'Show' }} PIN
            </button>
          </div>

          <!-- separate, unticked: only for festival news; sign-up works without it -->
          <label class="flex cursor-pointer items-start gap-3 rounded-tile border border-line bg-canvas/50 p-3.5">
            <input v-model="form.marketing" type="checkbox" class="mt-0.5 size-5 shrink-0 cursor-pointer accent-accent">
            <span class="text-body text-ink">{{ MARKETING_CONSENT }} <span class="text-muted">(optional)</span></span>
          </label>

          <p class="text-label leading-4.5 text-muted">
            We keep your name, email, PIN (scrambled, so no one can read it) and your festival plan, so you can use the app on any phone.
            AFRIFF owns this information and only AFRIFF admins can see it. Unless you tick the box, we only email you about your account, like PIN codes.
            To delete your account, use My Festival{{ privacyEmail ? ` or email ${privacyEmail}` : '' }}.
            <NuxtLink to="/privacy" class="font-medium text-accent-ink underline underline-offset-2">Privacy notice</NuxtLink>
          </p>

          <AuthProblem :problem="problem" :action="action" @action="go" />
          <UiButton type="submit" size="lg" block :loading="busy">{{ busy ? 'Creating your account…' : 'Create my account' }}</UiButton>
        </form>

        <!-- ---------- Log in ---------- -->
        <form v-else-if="mode === 'login'" class="mt-4 flex flex-col gap-4" novalidate @submit.prevent="submitLogIn">
          <p class="text-meta text-muted">Already signed up? Log in to bring your festival plan and watched list to this phone.</p>
          <AuthField field-id="login-email" label="Email" :error="errors.email">
            <input id="login-email" v-model="form.email" class="field-input h-12" type="email" inputmode="email" autocomplete="username" autocapitalize="off" spellcheck="false" maxlength="254" :aria-invalid="!!errors.email || undefined">
          </AuthField>
          <AuthField field-id="login-pin" label="PIN" :error="errors.pin">
            <PinInput id="login-pin" v-model="form.pin" autocomplete="current-password" :show="showPin" :invalid="!!errors.pin" />
          </AuthField>
          <div class="-mt-2 flex items-center justify-between gap-3">
            <button type="button" class="pressable text-meta font-medium text-accent-ink" @click="go('forgot')">Forgot PIN?</button>
            <button type="button" class="pressable flex items-center gap-1 text-label font-medium text-muted hover:text-ink" :aria-pressed="showPin" @click="showPin = !showPin">
              <component :is="showPin ? EyeOffIcon : EyeIcon" class="size-4" /> {{ showPin ? 'Hide' : 'Show' }} PIN
            </button>
          </div>
          <AuthProblem :problem="problem" :action="action" @action="go" />
          <UiButton type="submit" size="lg" block :loading="busy">{{ busy ? 'Logging in…' : 'Log in' }}</UiButton>
        </form>

        <!-- ---------- Forgot PIN: email ---------- -->
        <form v-else-if="mode === 'forgot'" class="mt-3 flex flex-col gap-4" novalidate @submit.prevent="submitForgot">
          <div>
            <h2 class="font-display text-h2 font-semibold">Forgot your PIN?</h2>
            <p class="mt-1 text-meta text-muted">We'll email you a 6-digit code. Type it here to choose a new PIN.</p>
          </div>
          <AuthField field-id="forgot-email" label="Email you signed up with" :error="errors.email">
            <input id="forgot-email" v-model="form.email" class="field-input h-12" type="email" inputmode="email" autocomplete="email" autocapitalize="off" spellcheck="false" maxlength="254" :aria-invalid="!!errors.email || undefined">
          </AuthField>
          <AuthProblem :problem="problem" :action="action" @action="go" />
          <UiButton type="submit" size="lg" block :loading="busy">{{ busy ? 'Sending…' : 'Email me a code' }}</UiButton>
        </form>

        <!-- ---------- Forgot PIN: code + new PIN ---------- -->
        <form v-else class="mt-3 flex flex-col gap-4" novalidate @submit.prevent="submitCode">
          <div>
            <h2 class="font-display text-h2 font-semibold">Check your email</h2>
            <p class="mt-1 text-meta text-muted">We sent a 6-digit code to <strong class="font-semibold text-ink">{{ sentTo }}</strong>. It works for 15 minutes. Not there? Check spam.</p>
          </div>
          <AuthField field-id="code" label="Code from the email" :error="errors.code">
            <PinInput id="code" v-model="form.code" :length="6" show autocomplete="one-time-code" :invalid="!!errors.code" />
          </AuthField>
          <div class="grid grid-cols-2 gap-3">
            <AuthField field-id="new-pin" label="New 4-digit PIN" :error="errors.pin">
              <PinInput id="new-pin" v-model="form.pin" autocomplete="new-password" :show="showPin" :invalid="!!errors.pin" />
            </AuthField>
            <AuthField field-id="new-pin2" label="New PIN again" :error="errors.pin2">
              <PinInput id="new-pin2" v-model="form.pin2" autocomplete="new-password" :show="showPin" :invalid="!!errors.pin2" />
            </AuthField>
          </div>
          <div class="-mt-2 flex items-center justify-between gap-3">
            <button type="button" class="pressable text-meta font-medium text-accent-ink" :disabled="busy" @click="resend">Send a new code</button>
            <button type="button" class="pressable flex items-center gap-1 text-label font-medium text-muted hover:text-ink" :aria-pressed="showPin" @click="showPin = !showPin">
              <component :is="showPin ? EyeOffIcon : EyeIcon" class="size-4" /> {{ showPin ? 'Hide' : 'Show' }} PIN
            </button>
          </div>
          <AuthProblem :problem="problem" :action="action" @action="go" />
          <UiButton type="submit" size="lg" block :loading="busy">{{ busy ? 'Saving…' : 'Save new PIN and log in' }}</UiButton>
        </form>
      </main>

      <!-- "Require sign-up" switched off in the console -->
      <div v-if="letIn === 'skip'" class="mt-4 flex justify-center">
        <UiButton variant="ghost" @click="enter">Skip for now</UiButton>
      </div>
    </div>
  </div>
</template>
