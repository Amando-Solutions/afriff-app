<template>
  <!-- The Home banner surface: navy with a warm gold glow and a blue pool, film grain on top. -->
  <section class="grain relative overflow-hidden rounded-card border border-white/10 bg-navy-950 text-white shadow-card">
    <div
      class="pointer-events-none absolute inset-0"
      style="
        background:
          radial-gradient(60% 80% at 85% 18%, rgb(217 164 65 / 0.2), transparent 60%),
          radial-gradient(55% 65% at 8% 100%, rgb(0 104 166 / 0.45), transparent 70%),
          linear-gradient(160deg, #0a1042 0%, #060a26 70%);
      "
      aria-hidden="true"
    />
    <div class="relative z-2 p-4">
      <slot />
    </div>
  </section>
</template>
