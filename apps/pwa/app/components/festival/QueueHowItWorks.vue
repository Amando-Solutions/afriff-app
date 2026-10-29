<script setup lang="ts">
// How queue counts work, and what the three colours mean. On the Queues
// screen when no line is open, and in its "How are lines counted?" sheet.
const LEGEND = [
  { tone: 'good', text: 'Good chance of a seat', means: 'plenty of room' },
  { tone: 'warn', text: 'Filling up', means: 'go now if you want in' },
  { tone: 'alert', text: 'Likely full', means: 'more people than seats' },
]
</script>

<template>
  <div class="q-how">
    <ol class="q-how-steps">
      <li><span class="q-how-n">1</span>A volunteer at the cinema door counts the people waiting in line.</li>
      <li><span class="q-how-n">2</span>We compare that count with the number of seats left in the screen.</li>
      <li><span class="q-how-n">3</span>You see your chance of getting in, before you travel.</li>
    </ol>
    <div class="q-how-legend">
      <span v-for="l in LEGEND" :key="l.tone"><i class="q-dot" :class="`tone-bg-${l.tone}`" /><strong>{{ l.text }}</strong> · {{ l.means }}</span>
    </div>
  </div>
</template>
