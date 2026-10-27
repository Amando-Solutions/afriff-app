<script setup lang="ts">
import { ref } from 'vue'
import { recheckOwner, sendOwnerCheck, useAdminAuth } from '~/lib/useAdminAuth'
import { errMsg } from '~/lib/util'

// Only for the two superadmin emails (shared/team.ts), before Firebase has
// confirmed the address is theirs. Until then they're whatever their profile
// says, because anyone could create a login with an unconfirmed email.
const auth$ = useAdminAuth()
const sent = ref(false)
const busy = ref(false)
const message = ref('')

async function send() {
  busy.value = true
  message.value = ''
  try {
    await sendOwnerCheck()
    sent.value = true
  } catch (e) {
    message.value = (e as { code?: string }).code === 'auth/too-many-requests'
      ? 'Too many emails sent. Wait a few minutes, then try again.'
      : `Couldn't send it: ${errMsg(e)}`
  } finally {
    busy.value = false
  }
}

async function check() {
  busy.value = true
  message.value = ''
  try {
    if (!(await recheckOwner())) message.value = 'Not confirmed yet. Tap the link in the email first (check spam too).'
  } catch (e) {
    message.value = `Couldn't check: ${errMsg(e)}`
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div v-if="auth$.ownerCheck" class="card flex flex-col gap-2.5 border-accent/50 p-4">
    <h2 class="font-display text-h3 font-semibold">Confirm your email</h2>
    <p class="text-meta text-muted">
      <strong class="text-ink">{{ auth$.user?.email }}</strong> is a superadmin account. Confirm it's yours to be able to remove admins.
    </p>
    <p v-if="sent" class="text-meta">Email sent. Tap the link in it, then come back here and press "I've confirmed it".</p>
    <div class="flex flex-wrap gap-2">
      <UiButton size="sm" :variant="sent ? 'secondary' : 'primary'" :disabled="busy" @click="send">{{ sent ? 'Send it again' : 'Send me the link' }}</UiButton>
      <UiButton v-if="sent" size="sm" :loading="busy" @click="check">I've confirmed it</UiButton>
    </div>
    <p v-if="message" class="text-meta text-danger" role="alert">{{ message }}</p>
  </div>
</template>
