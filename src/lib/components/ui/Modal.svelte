<script lang="ts">
  import { Dialog } from 'bits-ui'
  import { X } from 'phosphor-svelte'
  import type { Snippet } from 'svelte'
  import { fade, fly } from 'svelte/transition'
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
</script>

<Dialog.Root bind:open>
  <Dialog.Portal>
    <Dialog.Overlay forceMount>
      {#snippet child({ props, open: shown })}
        {#if shown}
          <div {...props} class="fixed inset-0 z-50 bg-ink-950/55 backdrop-blur-[3px]" transition:fade={{ duration: 140 }}></div>
        {/if}
      {/snippet}
    </Dialog.Overlay>
    <Dialog.Content forceMount>
      {#snippet child({ props, open: shown })}
        {#if shown}
          <div {...props} class="pointer-events-none fixed inset-0 z-50 grid items-end sm:place-items-center sm:p-5">
            <div
              class={`pointer-events-auto max-h-[94svh] w-full overflow-hidden rounded-t-3xl border border-paper-200 bg-paper-50 shadow-lifted sm:max-h-[92svh] sm:rounded-3xl ${widths[size]}`}
              in:fly={{ y: 28, duration: 190 }}
              out:fly={{ y: 18, duration: 140 }}
            >
              <header class="flex items-start justify-between gap-4 border-b border-paper-200 bg-white px-5 py-4 sm:px-6 sm:py-5">
                <div>
                  <Dialog.Title class="font-display text-xl font-semibold leading-none tracking-[-0.025em] text-ink-950 sm:text-2xl">{title}</Dialog.Title>
                  {#if description}<Dialog.Description class="mt-2 text-xs leading-5 text-ink-600">{description}</Dialog.Description>{/if}
                </div>
                <Button variant="ghost" size="icon" title="Close" onclick={close}><X size={19} weight="bold" /></Button>
              </header>
              <div class="max-h-[calc(94svh-8rem)] overflow-y-auto px-4 py-4 sm:max-h-[calc(92svh-9rem)] sm:px-6 sm:py-5">
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
      {/snippet}
    </Dialog.Content>
  </Dialog.Portal>
</Dialog.Root>
