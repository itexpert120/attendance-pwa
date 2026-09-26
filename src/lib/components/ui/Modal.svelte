<script lang="ts">
  import { Dialog } from 'bits-ui'
  import X from 'phosphor-svelte/lib/X'
  import type { Snippet } from 'svelte'
  import { fade } from 'svelte/transition'
  import { registerBack } from '../../navigation'

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
    sm: 'md:max-w-md',
    md: 'md:max-w-xl',
    lg: 'md:max-w-3xl',
    xl: 'md:max-w-5xl',
  }

  let dragY = $state(0)
  let dragging = $state(false)
  let startY = 0
  let startTime = 0

  // The device back button closes the sheet instead of leaving the screen.
  $effect(() => {
    if (!open) return
    dragY = 0
    return registerBack(() => (open = false))
  })

  // Slides by the sheet's own height so tall sheets leave the screen completely.
  // Tablet dialogs fade and scale instead.
  function sheet(node: HTMLElement, { duration, easing }: { duration: number; easing: (t: number) => number }) {
    const phone = !window.matchMedia('(min-width: 768px)').matches
    const from = dragY
    return {
      duration,
      easing,
      css: (t: number) =>
        phone
          ? `transform: translateY(calc(${from * t}px + ${(1 - t) * 100}%))`
          : `opacity: ${t}; transform: scale(${0.94 + 0.06 * t})`,
    }
  }

  // Material emphasized decelerate / accelerate.
  const decelerate = (t: number) => 1 - Math.pow(1 - t, 4)
  const accelerate = (t: number) => t * t * t

  function close() {
    open = false
  }

  function onPointerDown(event: PointerEvent) {
    if (event.button !== 0 || (event.target as HTMLElement).closest('button')) return
    dragging = true
    startY = event.clientY
    startTime = performance.now()
    ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
  }

  function onPointerMove(event: PointerEvent) {
    if (!dragging) return
    dragY = Math.max(0, event.clientY - startY)
  }

  function onPointerUp() {
    if (!dragging) return
    dragging = false
    const velocity = dragY / Math.max(1, performance.now() - startTime)
    if (dragY > 110 || (dragY > 24 && velocity > 0.6)) close()
    else dragY = 0
  }
</script>

<Dialog.Root bind:open>
  <Dialog.Portal>
    <Dialog.Overlay forceMount>
      {#snippet child({ props, open: shown })}
        {#if shown}
          <div {...props} class="fixed inset-0 z-50 bg-scrim/32 print:hidden" role="presentation" onclick={close} transition:fade={{ duration: 250 }}></div>
        {/if}
      {/snippet}
    </Dialog.Overlay>
    <Dialog.Content forceMount interactOutsideBehavior="ignore">
      {#snippet child({ props, open: shown })}
        {#if shown}
          <!-- The layout wrapper spans the screen, so a tap on it (outside the panel) is a scrim tap. -->
          <div
            {...props}
            class="fixed inset-0 z-50 flex items-end justify-center pb-[var(--kb,0px)] print:hidden md:items-center md:p-6"
            onclick={(event) => {
              if (event.target === event.currentTarget) close()
            }}
          >
            <div
              data-sheet
              class={`flex max-h-[calc(100dvh-var(--safe-top)-var(--kb,0px)-3.5rem)] w-full flex-col overflow-hidden rounded-t-[28px] bg-surface-container-low shadow-[var(--shadow-e1)] md:max-h-[88dvh] md:rounded-[28px] ${widths[size]}`}
              style:transform={dragY ? `translateY(${dragY}px)` : undefined}
              style:transition={dragging ? 'none' : 'transform 260ms var(--ease-ios)'}
              in:sheet={{ duration: 400, easing: decelerate }}
              out:sheet={{ duration: 250, easing: accelerate }}
            >
              <div
                class="shrink-0 touch-none select-none"
                role="presentation"
                onpointerdown={onPointerDown}
                onpointermove={onPointerMove}
                onpointerup={onPointerUp}
                onpointercancel={onPointerUp}
              >
                <div class="mx-auto mt-4 h-1 w-8 rounded-full bg-on-surface-variant/40 md:hidden" aria-hidden="true"></div>
                <header class="flex items-start gap-2 pb-2 pl-6 pr-3 pt-4 md:pt-6">
                  <div class="min-w-0 flex-1">
                    <Dialog.Title class="type-title-large text-on-surface">{title}</Dialog.Title>
                    {#if description}<Dialog.Description class="type-body-medium mt-1 text-on-surface-variant">{description}</Dialog.Description>{/if}
                  </div>
                  <button
                    type="button"
                    class="state-layer -mt-1 grid size-10 shrink-0 place-items-center rounded-full text-on-surface-variant"
                    aria-label="Close"
                    onclick={close}
                  ><X size={22} /></button>
                </header>
              </div>
              <div class="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-[calc(var(--safe-bottom)+1.5rem)] pt-2 md:px-6 md:pb-6">
                {@render children()}
              </div>
              {#if footer}
                <footer class="flex flex-wrap justify-end gap-2 border-t border-outline-variant bg-surface-container-low px-5 py-3 pb-[calc(var(--safe-bottom)+0.75rem)]">
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
