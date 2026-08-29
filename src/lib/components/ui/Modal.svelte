<script lang="ts">
  import { X } from 'phosphor-svelte'
  import type { Snippet } from 'svelte'
  import Button from './Button.svelte'

  let {
    open = $bindable(false),
    title,
    description,
    children,
    footer,
    size = 'md',
  }: {
    open: boolean
    title: string
    description?: string
    children: Snippet
    footer?: Snippet
    size?: 'sm' | 'md' | 'lg' | 'xl'
  } = $props()

  const widths = {
    sm: 'max-w-md',
    md: 'max-w-xl',
    lg: 'max-w-3xl',
    xl: 'max-w-5xl',
  }

  function close() {
    open = false
  }

  function handleKeydown(event: KeyboardEvent) {
    if (open && event.key === 'Escape') close()
  }
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open}
  <div class="fixed inset-0 z-50 grid items-end bg-ink-950/55 p-0 backdrop-blur-[3px] sm:place-items-center sm:p-5" role="presentation" onclick={(event) => event.target === event.currentTarget && close()}>
    <div
      class={`max-h-[92svh] w-full overflow-hidden rounded-t-3xl border border-paper-200 bg-paper-50 shadow-lifted sm:rounded-3xl ${widths[size]}`}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <header class="flex items-start justify-between gap-4 border-b border-paper-200 bg-white px-5 py-4 sm:px-6 sm:py-5">
        <div>
          <h2 class="font-display text-2xl font-semibold leading-none tracking-[-0.025em] text-ink-950">{title}</h2>
          {#if description}<p class="mt-2 text-xs leading-5 text-ink-600">{description}</p>{/if}
        </div>
        <Button variant="ghost" size="icon" title="Close" onclick={close}><X size={19} /></Button>
      </header>
      <div class="max-h-[calc(92svh-9rem)] overflow-y-auto px-5 py-5 sm:px-6">
        {@render children()}
      </div>
      {#if footer}
        <footer class="flex flex-wrap justify-end gap-2 border-t border-paper-200 bg-white px-5 py-3">
          {@render footer()}
        </footer>
      {/if}
    </div>
  </div>
{/if}
