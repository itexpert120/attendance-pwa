<script lang="ts" generics="T extends string | number">
  import Check from 'phosphor-svelte/lib/Check'
  import type { Component } from 'svelte'

  let {
    value = $bindable(),
    options,
    label,
    class: className = '',
  }: {
    value: T
    options: Array<{ value: T; label: string; icon?: Component<{ size?: number; weight?: 'bold' | 'fill' }> }>
    label: string
    class?: string
  } = $props()

  function choose(next: T) {
    if (next === value) return
    navigator.vibrate?.(6)
    value = next
  }
</script>

<!-- Material 3 segmented button (single select). -->
<div role="radiogroup" aria-label={label} class={`flex h-10 rounded-full border border-outline ${className}`}>
  {#each options as option, index (option.value)}
    {@const selected = option.value === value}
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      class={`state-layer type-label-large flex min-w-0 flex-1 items-center justify-center gap-2 px-3 ${index > 0 ? 'border-l border-outline' : ''} ${index === 0 ? 'rounded-l-full' : ''} ${index === options.length - 1 ? 'rounded-r-full' : ''} ${selected ? 'bg-secondary-container text-on-secondary-container' : 'text-on-surface'}`}
      onclick={() => choose(option.value)}
    >
      {#if selected}<Check size={18} weight="bold" class="shrink-0" />{:else if option.icon}<option.icon size={18} />{/if}
      <span class="truncate">{option.label}</span>
    </button>
  {/each}
</div>
