<script lang="ts">
  import Check from 'phosphor-svelte/lib/Check'
  import type { Snippet } from 'svelte'

  let {
    selected = false,
    onclick,
    children,
  }: {
    selected?: boolean
    onclick: () => void
    children: Snippet
  } = $props()
</script>

<!-- Material 3 filter chip. -->
<button
  type="button"
  aria-pressed={selected}
  class={`state-layer type-label-large inline-flex h-8 shrink-0 items-center gap-2 rounded-lg px-4 ${selected ? 'bg-secondary-container pl-2 text-on-secondary-container' : 'border border-outline-variant text-on-surface-variant'}`}
  {onclick}
>
  {#if selected}<Check size={18} weight="bold" />{/if}
  {@render children()}
</button>
