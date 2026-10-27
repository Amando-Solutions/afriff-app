<script setup lang="ts">
import { ref, watch } from 'vue'
import { PASSWORD_HINT, cleanName, emailProblem, nameProblem, passwordProblem } from '@afriff/core/accounts/rules'
import { useFormChecks } from '@afriff/core/utils/formChecks'
import { createUserWithEmailAndPassword, sendPasswordResetEmail, signInWithEmailAndPassword, updateProfile } from 'firebase/auth'
import { createProfile, ensureProfile } from '~/lib/useAdminAuth'
import { auth } from '~/lib/firebase'

// the attendee app is its own app and address (apps/pwa)
const attendeeUrl = useRuntimeConfig().public.attendeeUrl as string

// Plain-language versions of Firebase's error codes
const MESSAGES: Record<string, string> = {
  'auth/invalid-credential': 'That email and password don\'t match. Check them and try again. Joined the festival app with Google? Tap “Forgot password?” to set a password for this login.',
  'auth/invalid-email': 'That doesn\'t look like an email address.',
  'auth/email-already-in-use': 'There\'s already an account with this email, maybe from the AFRIFF festival app. Log in with that password instead.',
  'auth/weak-password': 'Use a password of at least 8 characters.',
  'auth/too-many-requests': 'Too many tries. Wait a few minutes, then try again.',
  'auth/network-request-failed': 'No connection. Check your internet and try again.',
  'auth/missing-email': 'Type your email first.',
}
const friendly = (e: unknown) => {
  const { code = '', message = '' } = (e ?? {}) as { code?: string; message?: string }
  return MESSAGES[code] || `Something went wrong (${code || message}).`
}

const mode = ref<'login' | 'signup'>('login')
const name = ref('')
const email = ref('')
const password = ref('')
const busy = ref(false)
const error = ref('')
const note = ref('')

// Each field checked on this phone first (the same rules as attendee accounts):
// a problem shows when they leave the field, every field when they press the button.
const checks = useFormChecks(() => ({
  ...(mode.value === 'signup' ? { name: () => nameProblem(name.value, 'name') } : {}),
  email: () => emailProblem(email.value),
  // a NEW password follows the rules; logging in, any existing password is fine
  password: () => (mode.value === 'signup' ? passwordProblem(password.value) : password.value ? null : 'Type your password.'),
}), (key) => values[key as Field].value)
watch([name, email, password], checks.recheck)
watch(mode, () => {
  checks.clear()
  error.value = ''
  note.value = ''
})
type Field = 'name' | 'email' | 'password'
const values = { name, email, password }
function left(key: Field) {
  if (key === 'name') name.value = cleanName(name.value)
  if (key === 'email') email.value = email.value.trim()
  checks.left(key)
}
const aria = (key: Field) => ({ 'aria-invalid': checks.errors[key] ? true : undefined, 'aria-describedby': checks.errors[key] ? `login-${key}-error` : undefined })

async function submit() {
  error.value = ''
  note.value = ''
  name.value = cleanName(name.value)
  email.value = email.value.trim()
  if (!checks.checkAll()) return
  busy.value = true
  error.value = ''
  note.value = ''
  try {
    if (mode.value === 'login') {
      const { user } = await signInWithEmailAndPassword(auth, email.value.trim(), password.value)
      // if this fails, /pending offers "Finish setup" instead
      await ensureProfile(user).catch(() => {})
    } else {
      const { user } = await createUserWithEmailAndPassword(auth, email.value.trim(), password.value)
      await updateProfile(user, { displayName: name.value.trim() })
      await createProfile(user, name.value)
    }
  } catch (err) {
    error.value = friendly(err)
  } finally {
    busy.value = false
  }
}

async function reset() {
  error.value = ''
  note.value = ''
  email.value = email.value.trim()
  const problem = emailProblem(email.value)
  if (problem) {
    checks.flag('email', problem)
    return
  }
  try {
    await sendPasswordResetEmail(auth, email.value.trim())
    note.value = 'If that email has an account, a reset link is on its way. Check your inbox and spam.'
  } catch (err) {
    error.value = friendly(err)
  }
}
</script>

<template>
  <div class="flex min-h-dvh flex-col items-center justify-center gap-5 px-4 py-6">
    <div class="card flex w-full max-w-sm flex-col gap-3 p-6">
      <div class="flex items-center gap-2.5">
        <AppLogo :size="32" />
        <span class="font-display text-h3 font-semibold text-accent-ink">Admin</span>
      </div>
      <p class="text-meta text-muted">For the AFRIFF team and door volunteers.</p>

      <div role="tablist" class="mt-1 flex rounded-full bg-raised p-0.5">
        <button
          v-for="m in [['login', 'Log in'], ['signup', 'Create account']]"
          :key="m[0]"
          type="button"
          role="tab"
          :aria-selected="mode === m[0]"
          class="h-8 flex-1 rounded-full text-meta font-medium transition-colors"
          :class="mode === m[0] ? 'bg-surface text-ink shadow-[0_0_0_1px_var(--c-line)]' : 'text-muted'"
          @click="mode = m[0]"
        >{{ m[1] }}</button>
      </div>

      <form class="flex flex-col gap-3.5" novalidate @submit.prevent="submit">
        <label v-if="mode === 'signup'" class="flex flex-col gap-1.5 text-meta font-medium text-muted">Your name
          <input v-model="name" class="field-input" autocomplete="name" autocapitalize="words" autocorrect="off" spellcheck="false" maxlength="60" v-bind="aria('name')" @blur="left('name')" />
          <span v-if="checks.errors.name" id="login-name-error" class="font-normal text-danger" role="alert">{{ checks.errors.name }}</span>
        </label>
        <label class="flex flex-col gap-1.5 text-meta font-medium text-muted">Email
          <input v-model.trim="email" class="field-input" type="email" inputmode="email" autocomplete="email" autocapitalize="off" spellcheck="false" maxlength="254" v-bind="aria('email')" @blur="left('email')" />
          <span v-if="checks.errors.email" id="login-email-error" class="font-normal text-danger" role="alert">{{ checks.errors.email }}</span>
        </label>
        <label class="flex flex-col gap-1.5 text-meta font-medium text-muted">Password
          <input v-model="password" class="field-input" type="password" maxlength="128" :autocomplete="mode === 'login' ? 'current-password' : 'new-password'" v-bind="aria('password')" @blur="left('password')" />
          <span v-if="checks.errors.password" id="login-password-error" class="font-normal text-danger" role="alert">{{ checks.errors.password }}</span>
          <span v-if="mode === 'signup' && !checks.errors.password" class="text-label font-normal text-subtle">{{ PASSWORD_HINT }}</span>
        </label>
        <p v-if="error" class="text-meta text-danger" role="alert">{{ error }}</p>
        <p v-if="note" class="text-meta text-success">{{ note }}</p>
        <UiButton type="submit" size="lg" block :loading="busy">{{ busy ? 'Please wait…' : mode === 'login' ? 'Log in' : 'Create account' }}</UiButton>
      </form>

      <button v-if="mode === 'login'" type="button" class="self-start text-meta font-medium text-muted hover:text-ink" @click="reset">Forgot password?</button>
      <p v-else class="text-meta text-muted">New accounts start with no access. An AFRIFF admin will give you a role.</p>
    </div>
    <a :href="attendeeUrl" class="text-meta font-medium text-muted hover:text-ink">← Back to the festival app</a>
  </div>
</template>
