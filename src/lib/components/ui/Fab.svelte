<script lang="ts">
  import type { Component } from 'svelte'

  let {
    icon: Icon,
    text,
    label = text,
    onclick,
    tabbed = true,
  }: {
    icon: Component<{ size?: number; weight?: 'bold' | 'regular' }>
    text: string
    label?: string
    onclick: () => void
    /** Sits above the phone navigation bar when true. */
    tabbed?: boolean
  } = $props()

  // Extended FAB shrinks to an icon while scrolling down, like Material lists.
  let extended = $state(true)

  $effect(() => {
    let last = window.scrollY
    const onScroll = () => {
      const y = window.scrollY
      if (Math.abs(y - last) < 8) return
      extended = y < last || y < 24
      last = y
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  })
</script>

<button
  type="button"
  aria-label={label}
  class={`kb-hide state-layer type-label-large fixed right-4 z-30 inline-flex h-14 min-w-14 items-center justify-center rounded-2xl bg-primary-container text-on-primary-container shadow-[var(--shadow-e3)] transition-[padding] duration-200 print:hidden md:bottom-6 md:right-6 [&_svg]:size-6 [&_svg]:shrink-0 ${extended ? 'gap-3 pl-4 pr-5' : 'px-4'} ${tabbed ? 'bottom-[calc(var(--tab-bar-height)+var(--safe-bottom)+1rem)]' : 'bottom-[calc(var(--safe-bottom)+1rem)]'}`}
  {onclick}
>
  <Icon size={24} />
  {#if extended}<span class="whitespace-nowrap">{text}</span>{/if}
</button>
