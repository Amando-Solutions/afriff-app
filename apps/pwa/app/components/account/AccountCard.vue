<script setup lang="ts">
import { computed, ref } from 'vue'
import { CircleUserRoundIcon, LogOutIcon, Trash2Icon } from 'lucide-vue-next'
import { account, AccountProblem, deleteAccount, logOut, planSaved, setMarketing } from '~/lib/account'
import { syncState } from '~/lib/planSync'

// My Festival → "Your account": who's signed in, whether the plan has reached
// the account, the festival emails switch, log out, delete the account.
// Not signed in (let in with "Continue for now"): an invitation to sign up.
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
  void router.replace('/auth')
}
async function doDelete() {
  busy.value = true
  error.value = ''
  try {
    await deleteAccount()
    sheet.value = null
    void router.replace('/auth')
  } catch (e) {
    error.value = e instanceof AccountProblem ? e.message : 'Couldn\'t delete it. Try again.'
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <section v-if="p" class="card flex flex-col p-4" aria-labelledby="account-title">
    <div class="flex items-center gap-3">
      <span class="grid size-11 shrink-0 place-items-center rounded-full bg-raised font-display text-body font-semibold text-ink" aria-hidden="true">
        {{ (p.firstName[0] || '') + (p.lastName[0] || '') }}
      </span>
      <span class="flex min-w-0 flex-col">
        <span id="account-title" class="truncate text-body font-semibold">{{ p.firstName }} {{ p.lastName }}</span>
        <span class="truncate text-meta text-muted">{{ p.email }}</span>
      </span>
    </div>
    <p v-if="syncText" class="mt-3 flex items-start gap-2 text-meta" :class="syncState.status === 'error' ? 'text-danger' : 'text-muted'" role="status">
      <span class="mt-1.5 size-2 shrink-0 rounded-full" :class="{ 'bg-success': syncState.status === 'saved', 'bg-accent': syncState.status === 'saving' || syncState.status === 'waiting', 'bg-danger': syncState.status === 'error' }" aria-hidden="true" />
      {{ syncText }}
    </p>

    <label class="mt-4 flex cursor-pointer items-center gap-4 border-t border-line pt-4">
      <span class="flex flex-1 flex-col gap-1">
        <span class="text-body font-semibold">Festival emails from AFRIFF</span>
        <span class="text-meta text-muted">News and updates by email. Change it any time.</span>
        <span v-if="emailBusy" class="text-meta text-muted" role="status">One moment…</span>
        <span v-else-if="emailError" class="text-meta text-danger" role="alert">{{ emailError }}</span>
      </span>
      <input type="checkbox" role="switch" class="peer sr-only" :checked="p.marketing" :disabled="emailBusy" @change="toggleEmails">
      <span
        class="relative h-7 w-12 shrink-0 rounded-full bg-raised transition-colors peer-checked:bg-accent peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent after:absolute after:top-1 after:left-1 after:size-5 after:rounded-full after:bg-ink after:shadow after:transition-transform after:content-[''] peer-checked:after:translate-x-5 peer-checked:after:bg-on-accent"
        aria-hidden="true"
      />
    </label>

    <div class="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-4">
      <UiButton size="sm" variant="secondary" :loading="busy && !sheet" @click="askLogOut"><LogOutIcon /> Log out</UiButton>
      <button type="button" class="pressable flex items-center gap-1.5 text-meta font-medium text-danger" @click="sheet = 'delete'; error = ''">
        <Trash2Icon class="size-4" /> Delete my account
      </button>
    </div>

    <UiSheet v-model:open="sheetOpen" :title="sheet === 'delete' ? 'Delete your account?' : 'Log out now?'">
      <div class="flex flex-col gap-4 px-1 pb-2">
        <p v-if="sheet === 'delete'" class="text-body text-muted">
          This deletes your account, your festival plan and your watched list for good, on every phone, and takes you off AFRIFF's email list. It can't be undone.
        </p>
        <p v-else class="text-body text-muted">
          Some changes to your plan haven't reached your account yet (no signal?). If you log out now, they'll be lost. Log out when you're back online to keep them.
        </p>
        <p v-if="error" class="text-meta text-danger" role="alert">{{ error }}</p>
        <div class="flex flex-col gap-2">
          <UiButton v-if="sheet === 'delete'" variant="danger" block :loading="busy" @click="doDelete"><Trash2Icon /> Delete my account</UiButton>
          <UiButton v-else variant="danger" block :loading="busy" @click="doLogOut"><LogOutIcon /> Log out anyway</UiButton>
          <UiButton variant="ghost" block @click="sheet = null">Cancel</UiButton>
        </div>
      </div>
    </UiSheet>
  </section>

  <section v-else class="card flex items-center gap-3.5 p-4">
    <CircleUserRoundIcon class="size-8 shrink-0 text-accent-ink" :stroke-width="1.5" aria-hidden="true" />
    <span class="flex min-w-0 flex-1 flex-col gap-0.5">
      <span class="text-body font-semibold">Keep your plan on any phone</span>
      <span class="text-meta text-muted">Sign up or log in, and your plan and watched list come with you.</span>
    </span>
    <UiButton size="sm" to="/auth">Sign up</UiButton>
  </section>
</template>
