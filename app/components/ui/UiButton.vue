<script setup lang="ts">
import { computed } from 'vue'

/** Pill button. `to` makes it a link (internal path, or an external https link). */
type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size = 'sm' | 'md' | 'lg'

const props = withDefaults(
  defineProps<{
    variant?: Variant
    size?: Size
    /** internal page: renders a NuxtLink */
    to?: string
    /** external link: opens in a new tab */
    href?: string
    type?: 'button' | 'submit' | 'reset'
    block?: boolean
    loading?: boolean
    disabled?: boolean
  }>(),
  { variant: 'primary', size: 'md', to: undefined, href: undefined, type: 'button' },
)

const variants: Record<Variant, string> = {
  primary: 'bg-accent text-on-accent hover:bg-accent-hover shadow-[inset_0_1px_0_rgb(255_255_255/0.28),0_1px_2px_rgb(2_4_20/0.22)]',
  secondary: 'border border-line bg-surface text-ink shadow-card hover:border-line-strong hover:bg-hover',
  ghost: 'text-ink hover:bg-hover',
  danger: 'bg-danger-soft text-danger hover:bg-danger hover:text-canvas',
}
const sizes: Record<Size, string> = {
  sm: 'h-8 px-3 text-meta gap-1.5 [&_svg]:size-4',
  md: 'h-10 px-4 text-body gap-2 [&_svg]:size-[1.125rem]',
  lg: 'h-12 px-5 text-prose gap-2 [&_svg]:size-5',
}

const classes = computed(() => [
  'inline-flex shrink-0 items-center justify-center rounded-full font-semibold tracking-[-0.005em] whitespace-nowrap select-none',
  'transition-[background-color,border-color,color,box-shadow,scale] duration-160 ease-out active:scale-[0.97]',
  'disabled:pointer-events-none disabled:opacity-45 aria-disabled:pointer-events-none aria-disabled:opacity-45',
  variants[props.variant],
  sizes[props.size],
  props.block && 'w-full',
])
</script>

<template>
  <NuxtLink v-if="to" :to="to" :class="classes" :aria-disabled="disabled || undefined">
    <slot />
  </NuxtLink>
  <a v-else-if="href" :href="href" target="_blank" rel="noopener noreferrer" :class="classes">
    <slot />
  </a>
  <button v-else :type="type" :class="classes" :disabled="disabled || loading" :aria-busy="loading || undefined">
    <span v-if="loading" class="size-4 animate-spin rounded-full border-2 border-current border-r-transparent" aria-hidden="true" />
    <slot />
  </button>
</template>
