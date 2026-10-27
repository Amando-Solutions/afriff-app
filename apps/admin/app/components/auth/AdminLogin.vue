<script setup lang="ts">
import { ref } from 'vue'
import { createUserWithEmailAndPassword, sendPasswordResetEmail, signInWithEmailAndPassword, updateProfile } from 'firebase/auth'
import { createProfile } from '~/lib/useAdminAuth'
import { auth } from '~/lib/firebase'

// the attendee app is its own app and address (apps/pwa)
const attendeeUrl = useRuntimeConfig().public.attendeeUrl as string

// Plain-language versions of Firebase's error codes
const MESSAGES: Record<string, string> = {
  'auth/invalid-credential': 'That email and password don\'t match. Check them and try again.',
  'auth/invalid-email': 'That doesn\'t look like an email address.',
  'auth/email-already-in-use': 'There\'s already an account with this email. Log in instead.',
  'auth/weak-password': 'Use a password of at least 6 characters.',
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

async function submit() {
  busy.value = true
  error.value = ''
  note.value = ''
  try {
    if (mode.value === 'login') {
      await signInWithEmailAndPassword(auth, email.value.trim(), password.value)
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

      <form class="flex flex-col gap-3.5" @submit.prevent="submit">
        <label v-if="mode === 'signup'" class="flex flex-col gap-1.5 text-meta font-medium text-muted">Your name
          <input v-model="name" class="field-input" required autocomplete="name" />
        </label>
        <label class="flex flex-col gap-1.5 text-meta font-medium text-muted">Email
          <input v-model="email" class="field-input" type="email" required autocomplete="email" />
        </label>
        <label class="flex flex-col gap-1.5 text-meta font-medium text-muted">Password
          <input v-model="password" class="field-input" type="password" required minlength="6" :autocomplete="mode === 'login' ? 'current-password' : 'new-password'" />
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
