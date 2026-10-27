<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { CircleUserRoundIcon, LogOutIcon, Trash2Icon } from 'lucide-vue-next'
import { account, AccountProblem, deleteAccount, loadGoogle, logOut, planSaved, setMarketing } from '~/lib/account'
import { syncState } from '~/lib/planSync'

// Profile → "Your account": avatar, who's signed in, whether the plan has
// reached the account, the festival emails switch, log out, delete the account.
// Not signed in: an invitation to sign up (then back to the page it's on;
// also shown on My Festival).
const props = withDefaults(defineProps<{ back?: string }>(), { back: '/profile' })
const p = computed(() => account.profile)
const router = useRouter()

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

// ---------- Log out / delete ----------
const sheet = ref<'logout' | 'delete' | null>(null)
const sheetOpen = computed({ get: () => sheet.value !== null, set: (v) => { if (!v) sheet.value = null } })
const busy = ref(false)
const error = ref('')
// Firebase asks for the password again before deleting an account, or (for
// someone who signs in with Google) a fresh Google sign-in
const password = ref('')
watch(password, () => { error.value = '' }) // the problem goes once they retype it
const withGoogle = computed(() => p.value?.signIn === 'google')

function askDelete() {
  sheet.value = 'delete'
  error.value = ''
  password.value = ''
  if (withGoogle.value) void loadGoogle().catch(() => {}) // so the tap doesn't wait for a download before the Google window
}

function askLogOut() {
  error.value = ''
  if (planSaved()) void doLogOut()
  else sheet.value = 'logout' // changes made with no signal haven't reached the account yet
}
async function doLogOut() {
  busy.value = true
  await logOut()
  busy.value = false
  sheet.value = null
}
async function doDelete() {
  if (!withGoogle.value && !password.value) {
    error.value = 'Type your password to confirm.'
    return
  }
  busy.value = true
  error.value = ''
  try {
    await deleteAccount(withGoogle.value ? null : password.value)
    password.value = ''
    sheet.value = null
    void router.replace('/')
  } catch (e) {
    if (e instanceof AccountProblem && e.reason === 'cancelled') return // closed the Google window
    error.value = e instanceof AccountProblem ? e.message : 'Couldn\'t delete it. Try again.'
  } finally {
    busy.value = false
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

    <div class="account-line">
      <button type="button" class="btn btn-outline btn-small" :disabled="busy && !sheet" @click="askLogOut"><LogOutIcon :size="16" /> Log out</button>
      <button type="button" class="account-delete" @click="askDelete">
        <Trash2Icon :size="16" /> Delete my account
      </button>
    </div>

    <BottomSheet v-model:open="sheetOpen" :title="sheet === 'delete' ? 'Delete your account?' : 'Log out now?'">
      <template v-if="sheet === 'delete'">
        <p class="hta-body">
          This deletes your account, your festival plan and your watched list for good, on every phone, and takes you off AFRIFF's email list. It can't be undone.
        </p>
        <template v-if="withGoogle">
          <p class="hta-body" style="margin-top: 12px">To confirm it's you, choose your Google account when it asks.</p>
          <p v-if="error" class="small tone-alert" role="alert" style="margin-top: 12px">{{ error }}</p>
        </template>
        <div v-else style="margin-top: 16px">
          <AuthField field-id="delete-password" label="Type your password to confirm" :error="error">
            <PasswordInput id="delete-password" v-model="password" autocomplete="current-password" :invalid="!!error" />
          </AuthField>
        </div>
      </template>
      <p v-else class="hta-body">
        Some changes to your plan haven't reached your account yet (no signal?). If you log out now, they'll be lost. Log out when you're back online to keep them.
      </p>
      <p v-if="error && sheet !== 'delete'" class="small tone-alert" role="alert" style="margin-top: 12px">{{ error }}</p>
      <div class="stack" style="margin-top: 20px">
        <button v-if="sheet === 'delete'" type="button" class="btn btn-danger" :disabled="busy" @click="doDelete"><Trash2Icon :size="18" /> {{ busy ? 'Deleting…' : withGoogle ? 'Confirm with Google and delete' : 'Delete my account' }}</button>
        <button v-else type="button" class="btn btn-danger" :disabled="busy" @click="doLogOut"><LogOutIcon :size="18" /> {{ busy ? 'Logging out…' : 'Log out anyway' }}</button>
        <button type="button" class="btn btn-outline" @click="sheet = null">Cancel</button>
      </div>
    </BottomSheet>
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
