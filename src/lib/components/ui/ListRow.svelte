<script lang="ts">
  import CaretRight from 'phosphor-svelte/lib/CaretRight'
  import type { Component, Snippet } from 'svelte'

  let {
    label,
    detail,
    value,
    icon: Icon,
    tone,
    chevron,
    destructive = false,
    disabled = false,
    onclick,
    leading,
    trailing,
    class: className = '',
  }: {
    label: string
    detail?: string
    value?: string | number
    icon?: Component<{ size?: number; weight?: 'bold' | 'fill' | 'regular' | 'duotone'; class?: string }>
    /** Kept for call-site compatibility; only `red` changes the icon colour. */
    tone?: string
    chevron?: boolean
    destructive?: boolean
    disabled?: boolean
    onclick?: (event: MouseEvent) => void
    leading?: Snippet
    trailing?: Snippet
    class?: string
  } = $props()

  let danger = $derived(destructive || tone === 'red')
</script>

{#snippet body()}
  {#if Icon}
    <span class={`grid size-10 shrink-0 place-items-center rounded-full ${danger ? 'bg-error-container text-on-error-container' : 'bg-secondary-container text-on-secondary-container'}`}><Icon size={20} /></span>
  {/if}
  {@render leading?.()}
  <span class="min-w-0 flex-1 py-3">
    <span class={`type-body-large block truncate ${danger ? 'text-error' : 'text-on-surface'}`}>{label}</span>
    {#if detail}<span class="type-body-medium block truncate text-on-surface-variant">{detail}</span>{/if}
  </span>
  {#if value !== undefined}<span class="type-body-medium max-w-[45%] shrink-0 truncate text-right text-on-surface-variant">{value}</span>{/if}
  {@render trailing?.()}
  {#if chevron}<CaretRight size={18} class="shrink-0 text-on-surface-variant" />{/if}
{/snippet}

<!-- Material 3 list item: 56dp one-line, 72dp two-line. -->
{#if onclick}
  <button type="button" {disabled} {onclick} class={`state-layer flex min-h-14 w-full items-center gap-4 px-4 text-left disabled:opacity-40 ${detail ? 'min-h-[4.5rem]' : ''} ${className}`}>
    {@render body()}
  </button>
{:else}
  <div class={`flex min-h-14 w-full items-center gap-4 px-4 ${detail ? 'min-h-[4.5rem]' : ''} ${className}`}>
    {@render body()}
  </div>
{/if}
