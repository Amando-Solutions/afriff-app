<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, reactive, ref, watch } from 'vue'
import { useOnline } from '@vueuse/core'
import { ArrowLeftIcon, MailCheckIcon, WifiOffIcon, XIcon } from 'lucide-vue-next'
import { FESTIVAL, FILMS } from '@afriff/core/data/programme'
import { MARKETING_CONSENT, emailProblem, nameProblem, passwordProblem } from '@afriff/core/accounts/rules'
import { now as clockNow } from '@afriff/core/utils/now'
import {
  AccountProblem, cancelDetails, dropPendingSave, finishDetails, logIn, pendingSave, safeRedirect, sendResetLink, signUp,
} from '~/lib/account'

// SIGN UP OR LOG IN, with Firebase's own email + password sign-in
// (lib/account.ts). Opened when someone with no account saves something to
// My Festival (+ or "Seen it": plugins/account.client.ts), or from My
// Festival's "Sign up" button. What they tapped is saved once they're in, and
// they go back to the page they were on. "Not now" goes back without saving.
// "Forgot password?" = Firebase's reset email with a link. One screen, big
// fields, the festival behind it. Most mistakes show at once, without waiting
// on slow data (@afriff/core/accounts/rules).
definePageMeta({ layout: false })
useHead({ title: 'Sign up · AFRIFF 2026' })

const route = useRoute()
const router = useRouter()
const privacyEmail = String(useRuntimeConfig().public.privacyEmail || '')

/** details = signed in, but no name saved yet (a staff login, or a sign-up whose details didn't save) */
type Mode = 'signup' | 'login' | 'forgot' | 'sent' | 'details'
const mode = ref<Mode>(route.query.mode === 'login' ? 'login' : 'signup')
const signedOutBySelf = route.query.again === '1'

const form = reactive({ firstName: '', lastName: '', email: '', password: '', marketing: false })
const errors = reactive<Record<string, string>>({})
const problem = ref<AccountProblem | null>(null)
const busy = ref(false)
const note = ref(signedOutBySelf ? 'Please log in again on this phone.' : '')
// a field's problem goes away as soon as they change it
for (const key of ['firstName', 'lastName', 'email', 'password'] as const) watch(() => form[key], () => { delete errors[key] })

// why they're here: saving a screening / event, or marking a film seen
const saving = pendingSave()
const why = computed(() => {
  if (saving?.kind === 'plan') return 'Sign up or log in to save it to My Festival. Your plan then comes with you to any phone.'
  if (saving?.kind === 'seen') return 'Sign up or log in to keep your watched list. It then comes with you to any phone.'
  return ''
})

function go(next: Mode) {
  mode.value = next
  clearProblems()
  form.password = ''
}
function clearProblems() {
  for (const k of Object.keys(errors)) delete errors[k]
  problem.value = null
  note.value = ''
}

// ---------- No internet: signing up and logging in wait until it's back ----------
// (the bar at the top already says the phone is offline; this says what it means here)
const online = useOnline()

const destination = () => safeRedirect(route.query.redirect) || '/'
/** Back to the page they were on: a real Back when they came from it, so it isn't in the history twice */
function leave() {
  const back = (window.history.state as { back?: unknown } | null)?.back
  if (back === destination()) router.back()
  else void router.replace(destination())
}
/** Not now: back where they were, nothing saved */
function close() {
  dropPendingSave()
  if (mode.value === 'details') void cancelDetails()
  leave()
}
// leaving any other way (the phone's Back) saves nothing either; after
// signing up the save has already happened, so there's nothing left to drop
onBeforeUnmount(dropPendingSave)

// ---------- Sending ----------
async function run(task: () => Promise<void>) {
  busy.value = true
  try {
    await task()
  } catch (e) {
    const p = e instanceof AccountProblem ? e : new AccountProblem('Something went wrong. Try again.')
    if (p.reason === 'details') {
      // signed in, but no name saved yet: one more step
      mode.value = 'details'
      clearProblems()
      note.value = p.message
      return
    }
    // a problem with one field shows under it; the rest show above the button
    if (p.field && p.reason !== 'exists') errors[p.field] = p.message
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

function submitSignUp() {
  if (!checked({
    firstName: nameProblem(form.firstName, 'first name'),
    lastName: nameProblem(form.lastName, 'last name'),
    email: emailProblem(form.email),
    password: passwordProblem(form.password),
  })) return
  void run(async () => {
    await signUp({ firstName: form.firstName, lastName: form.lastName, email: form.email.trim(), password: form.password, marketing: form.marketing })
    leave()
  })
}

function submitLogIn() {
  if (!checked({ email: emailProblem(form.email), password: form.password ? null : 'Type your password.' })) return
  void run(async () => {
    await logIn(form.email.trim(), form.password)
    leave()
  })
}

function submitDetails() {
  if (!checked({ firstName: nameProblem(form.firstName, 'first name'), lastName: nameProblem(form.lastName, 'last name') })) return
  void run(async () => {
    await finishDetails({ firstName: form.firstName, lastName: form.lastName, marketing: form.marketing })
    leave()
  })
}

function submitForgot() {
  if (!checked({ email: emailProblem(form.email) })) return
  void run(async () => {
    await sendResetLink(form.email.trim())
    go('sent')
  })
}

function resend() {
  clearProblems()
  void run(async () => {
    await sendResetLink(form.email.trim())
    note.value = 'Sent again. Use the newest email.'
  })
}

const action = computed(() => {
  switch (problem.value?.reason) {
    case 'exists': return { label: 'Log in instead', to: 'login' as const }
    case 'paused': return { label: 'Forgot password?', to: 'forgot' as const }
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
      <header class="flex h-14 items-center justify-between">
        <AppLogo />
        <button type="button" class="pressable -mr-2 flex h-10 items-center gap-1 rounded-full px-3 text-meta font-semibold text-muted hover:bg-hover hover:text-ink" aria-label="Close, not now" @click="close">
          Not now <XIcon class="size-4" aria-hidden="true" />
        </button>
      </header>

      <!-- posters + countdown: it should feel like the festival, not a form -->
      <!-- the posters fade out at the bottom into whatever is behind them -->
      <div class="relative flex h-36 items-end justify-center [mask-image:linear-gradient(to_bottom,black_40%,transparent_96%)]" aria-hidden="true">
        <FilmPoster v-for="(f, i) in posters" :key="f.id" :film="f" class="-mx-1.5 aspect-[2/3] rounded-thumb shadow-pop" :class="FAN[i]" />
      </div>
      <section class="relative z-5 -mt-3 text-center">
        <p class="eyebrow text-gold-300">1–7 Nov 2026 · Lagos</p>
        <h1 class="mx-auto mt-1.5 max-w-[22ch] font-display text-2xl leading-7 font-semibold tracking-tight">{{ saving ? 'Save your festival' : 'Seven days of African stories on the big screen' }}</h1>
        <p v-if="why" class="mx-auto mt-2 max-w-[34ch] text-meta text-white/75">{{ why }}</p>
        <p v-if="!countdown.done" class="mt-3 inline-flex items-center gap-2 rounded-full bg-white/6 px-3.5 py-1.5 text-meta text-white/75" role="timer">
          Opening night in
          <strong class="font-semibold text-ink tabular-nums">{{ countdown.d }}d {{ countdown.h }}h {{ countdown.m }}m</strong>
        </p>
        <p v-else class="mt-3 text-meta text-white/75">The festival is on. Welcome!</p>
      </section>


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
        <button v-else-if="mode === 'forgot'" type="button" class="pressable -ml-1 flex items-center gap-1.5 rounded-full px-1 py-1 text-meta font-medium text-muted hover:text-ink" @click="go('login')">
          <ArrowLeftIcon class="size-4" /> Back to log in
        </button>

        <p v-if="!online" class="mt-4 flex items-start gap-2.5 rounded-tile bg-raised px-3 py-2.5 text-meta text-ink" role="status">
          <WifiOffIcon class="mt-px size-4 shrink-0 text-muted" aria-hidden="true" />
          <span>You’re offline. Connect to the internet to {{ mode === 'forgot' || mode === 'sent' ? 'get a reset link' : mode === 'details' ? 'finish setting up' : 'sign up or log in' }}.</span>
        </p>
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
          <AuthField field-id="password" label="Choose a password" :error="errors.password" hint="At least 8 characters. You'll use it to log in on another phone.">
            <PasswordInput id="password" v-model="form.password" autocomplete="new-password" :invalid="!!errors.password" />
          </AuthField>

          <!-- separate, unticked: only for festival news; sign-up works without it -->
          <label class="flex cursor-pointer items-start gap-3 rounded-tile border border-line bg-canvas/50 p-3.5">
            <input v-model="form.marketing" type="checkbox" class="mt-0.5 size-5 shrink-0 cursor-pointer accent-accent">
            <span class="text-body text-ink">{{ MARKETING_CONSENT }} <span class="text-muted">(optional)</span></span>
          </label>

          <p class="text-label leading-4.5 text-muted">
            We keep your name, email and festival plan so you can use the app on any phone. Your password is stored scrambled, so no one can read it.
            AFRIFF owns this information and only AFRIFF admins can see it. Unless you tick the box, we only email you about your account, like password resets.
            To delete your account, use My Festival{{ privacyEmail ? ` or email ${privacyEmail}` : '' }}.
            <NuxtLink to="/privacy" class="font-medium text-accent-ink underline underline-offset-2">Privacy notice</NuxtLink>
          </p>

          <AuthProblem :problem="problem" :action="action" @action="go" />
          <UiButton type="submit" size="lg" block :loading="busy" :disabled="!online">{{ busy ? 'Creating your account…' : 'Create my account' }}</UiButton>
        </form>

        <!-- ---------- Log in ---------- -->
        <form v-else-if="mode === 'login'" class="mt-4 flex flex-col gap-4" novalidate @submit.prevent="submitLogIn">
          <p class="text-meta text-muted">Already signed up? Log in to bring your festival plan and watched list to this phone.</p>
          <AuthField field-id="login-email" label="Email" :error="errors.email">
            <input id="login-email" v-model="form.email" class="field-input h-12" type="email" inputmode="email" autocomplete="username" autocapitalize="off" spellcheck="false" maxlength="254" :aria-invalid="!!errors.email || undefined">
          </AuthField>
          <AuthField field-id="login-password" label="Password" :error="errors.password">
            <PasswordInput id="login-password" v-model="form.password" autocomplete="current-password" :invalid="!!errors.password" />
          </AuthField>
          <button type="button" class="pressable -mt-2 self-start text-meta font-medium text-accent-ink" @click="go('forgot')">Forgot password?</button>
          <AuthProblem :problem="problem" :action="action" @action="go" />
          <UiButton type="submit" size="lg" block :loading="busy" :disabled="!online">{{ busy ? 'Logging in…' : 'Log in' }}</UiButton>
        </form>

        <!-- ---------- Signed in, name not saved yet ---------- -->
        <form v-else-if="mode === 'details'" class="mt-4 flex flex-col gap-4" novalidate @submit.prevent="submitDetails">
          <div>
            <h2 class="font-display text-h2 font-semibold">One more step</h2>
            <p class="mt-1 text-meta text-muted">Tell us your name to finish setting up your festival account.</p>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <AuthField field-id="details-first" label="First name" :error="errors.firstName">
              <input id="details-first" v-model="form.firstName" class="field-input h-12" autocomplete="given-name" autocapitalize="words" maxlength="60" :aria-invalid="!!errors.firstName || undefined">
            </AuthField>
            <AuthField field-id="details-last" label="Last name" :error="errors.lastName">
              <input id="details-last" v-model="form.lastName" class="field-input h-12" autocomplete="family-name" autocapitalize="words" maxlength="60" :aria-invalid="!!errors.lastName || undefined">
            </AuthField>
          </div>
          <label class="flex cursor-pointer items-start gap-3 rounded-tile border border-line bg-canvas/50 p-3.5">
            <input v-model="form.marketing" type="checkbox" class="mt-0.5 size-5 shrink-0 cursor-pointer accent-accent">
            <span class="text-body text-ink">{{ MARKETING_CONSENT }} <span class="text-muted">(optional)</span></span>
          </label>
          <p class="text-label leading-4.5 text-muted">
            AFRIFF owns this information and only AFRIFF admins can see it.
            <NuxtLink to="/privacy" class="font-medium text-accent-ink underline underline-offset-2">Privacy notice</NuxtLink>
          </p>
          <AuthProblem :problem="problem" :action="action" @action="go" />
          <UiButton type="submit" size="lg" block :loading="busy" :disabled="!online">{{ busy ? 'Saving…' : 'Save and continue' }}</UiButton>
        </form>

        <!-- ---------- Forgot password: email ---------- -->
        <form v-else-if="mode === 'forgot'" class="mt-3 flex flex-col gap-4" novalidate @submit.prevent="submitForgot">
          <div>
            <h2 class="font-display text-h2 font-semibold">Forgot your password?</h2>
            <p class="mt-1 text-meta text-muted">We'll email you a link to choose a new one.</p>
          </div>
          <AuthField field-id="forgot-email" label="Email you signed up with" :error="errors.email">
            <input id="forgot-email" v-model="form.email" class="field-input h-12" type="email" inputmode="email" autocomplete="email" autocapitalize="off" spellcheck="false" maxlength="254" :aria-invalid="!!errors.email || undefined">
          </AuthField>
          <AuthProblem :problem="problem" :action="action" @action="go" />
          <UiButton type="submit" size="lg" block :loading="busy" :disabled="!online">{{ busy ? 'Sending…' : 'Email me a reset link' }}</UiButton>
        </form>

        <!-- ---------- Forgot password: sent ---------- -->
        <div v-else class="mt-3 flex flex-col gap-4">
          <div class="flex items-start gap-3">
            <MailCheckIcon class="mt-0.5 size-6 shrink-0 text-accent-ink" aria-hidden="true" />
            <div>
              <h2 class="font-display text-h2 font-semibold">Check your email</h2>
              <p class="mt-1 text-meta text-muted">
                If an account uses <strong class="font-semibold text-ink">{{ form.email.trim() }}</strong>, we've sent it a link.
                Open it, choose a new password, then come back here and log in. Not there? Check spam.
              </p>
            </div>
          </div>
          <AuthProblem :problem="problem" :action="action" @action="go" />
          <UiButton size="lg" block @click="go('login')">Back to log in</UiButton>
          <button type="button" class="pressable self-center text-meta font-medium text-accent-ink" :disabled="busy" @click="resend">Send it again</button>
        </div>
      </main>

    </div>
  </div>
</template>
