<script setup lang="ts">
import { computed, ref } from 'vue'
import { CircleUserRoundIcon } from 'lucide-vue-next'
import { account, AccountProblem, setMarketing } from '~/lib/account'
import { syncState } from '~/lib/planSync'

// Profile → "Your account": avatar, who's signed in, whether the plan has
// reached the account, the festival emails switch. Log out and delete the
// account are at the very bottom of Profile (AccountActions).
// Not signed in: an invitation to sign up (then back to the page it's on;
// also shown on My Festival).
const props = withDefaults(defineProps<{ back?: string }>(), { back: '/profile' })
const p = computed(() => account.profile)

const SYNC = {
  off: '',
  saving: 'Saving to your account…',
  waiting: 'Saved on this phone. It goes to your account when you\'re back online.',
  saved: 'Saved to your account. Log in on any phone to see it.',
  error: 'Couldn\'t reach your account. Your plan is still saved on this phone.',
} as const
const syncText = computed(() => SYNC[syncState.status])

// ---------- Festival emails ----------
const emailBusy = ref(false)
const emailError = ref('')
async function toggleEmails(event: Event) {
  const input = event.target as HTMLInputElement
  emailBusy.value = true
  emailError.value = ''
  try {
    await setMarketing(input.checked)
  } catch (e) {
    emailError.value = e instanceof AccountProblem ? e.message : 'Couldn\'t change it. Try again.'
  } finally {
    input.checked = account.profile?.marketing ?? false
    emailBusy.value = false
  }
}
</script>

<template>
  <section v-if="p" class="account-card" aria-labelledby="account-title">
    <div class="account-who">
      <UserAvatar :seed="p.uid" :size="56" :initials="(p.firstName[0] || '') + (p.lastName[0] || '')" />
      <span class="share-text">
        <span id="account-title" class="share-title">{{ p.firstName }} {{ p.lastName }}</span>
        <span class="muted small">{{ p.email }}</span>
      </span>
    </div>
    <p v-if="syncText" class="account-sync small" :class="syncState.status === 'error' ? 'tone-alert' : 'muted'" role="status">
      <span class="dot" :class="`sync-${syncState.status}`" style="width: 8px; height: 8px" aria-hidden="true" />
      {{ syncText }}
    </p>

    <label class="account-line">
      <span class="share-text">
        <span class="share-title">Festival emails from AFRIFF</span>
        <span class="muted small">News and updates by email. Change it any time.</span>
        <span v-if="emailBusy" class="muted small" role="status">One moment…</span>
        <span v-else-if="emailError" class="small tone-alert" role="alert">{{ emailError }}</span>
      </span>
      <input type="checkbox" role="switch" class="switch" :checked="p.marketing" :disabled="emailBusy" @change="toggleEmails">
    </label>
  </section>

  <section v-else class="share-row">
    <CircleUserRoundIcon :size="32" :stroke-width="1.5" class="tone-gold" aria-hidden="true" style="flex: none" />
    <span class="share-text">
      <span class="share-title">Keep your plan on any phone</span>
      <span class="muted small">Sign up or log in, and your plan and watched list come with you.</span>
    </span>
    <NuxtLink :to="`/auth?redirect=${props.back}`" class="btn btn-gold btn-small" style="align-self: center">Sign up</NuxtLink>
  </section>
</template>
