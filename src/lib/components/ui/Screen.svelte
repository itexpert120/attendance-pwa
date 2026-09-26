<script lang="ts">
  import ArrowLeft from 'phosphor-svelte/lib/ArrowLeft'
  import type { Snippet } from 'svelte'
  import { goBack } from '../../navigation'
  import BarButton from './BarButton.svelte'

  let {
    title,
    subtitle,
    back,
    backLabel = 'Back',
    large = !back,
    tabbed = !back,
    width = 'md',
    leading,
    actions,
    toolbar,
    children,
  }: {
    title: string
    subtitle?: string
    /** Parent route of a pushed screen: shows a back button, used when there is no history to pop. */
    back?: string
    backLabel?: string
    /** Big title that scrolls away and hands over to the bar title. */
    large?: boolean
    tabbed?: boolean
    width?: 'md' | 'lg' | 'full'
    leading?: Snippet
    actions?: Snippet
    /** Sticky content under the bar, e.g. tabs. */
    toolbar?: Snippet
    children: Snippet
  } = $props()

  const widths = {
    md: 'max-w-3xl',
    lg: 'max-w-6xl',
    full: 'max-w-[100rem]',
  }

  let titleEl = $state<HTMLElement>()
  let collapsed = $state(false)
  let scrolled = $state(false)

  $effect(() => {
    if (!large || !titleEl) return
    const observer = new IntersectionObserver(([entry]) => (collapsed = !entry.isIntersecting), {
      rootMargin: '-64px 0px 0px 0px',
    })
    observer.observe(titleEl)
    return () => observer.disconnect()
  })

  $effect(() => {
    const onScroll = () => (scrolled = window.scrollY > 4)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  })

  let showBarTitle = $derived(!large || collapsed)
</script>

<main class="min-h-svh bg-surface-container text-on-surface print:hidden">
  <!-- Material 3 top app bar: small for pushed screens, large (collapsing) for tab roots. -->
  <header class={`sticky top-0 z-30 pt-[var(--safe-top)] transition-colors duration-200 ${scrolled ? 'bg-surface-container-high' : 'bg-surface-container'}`}>
    <div class={`mx-auto flex h-16 items-center gap-1 px-1 md:px-4 ${widths[width]}`}>
      {#if back}
        <BarButton label={backLabel} class="mx-1" onclick={() => goBack(back!)}><ArrowLeft /></BarButton>
      {/if}
      {@render leading?.()}
      <div class={`min-w-0 flex-1 transition-opacity duration-200 ${back ? 'pl-1' : 'pl-3'} ${showBarTitle ? 'opacity-100' : 'opacity-0'}`} aria-hidden={!showBarTitle}>
        <p class="type-title-large truncate text-on-surface">{title}</p>
        {#if subtitle && !large}<p class="type-label-medium -mt-0.5 truncate font-normal text-on-surface-variant">{subtitle}</p>{/if}
      </div>
      {#if actions}<div class="flex shrink-0 items-center gap-0.5 pr-1">{@render actions()}</div>{/if}
    </div>
    {#if toolbar}
      <div class={`mx-auto ${widths[width]}`}>{@render toolbar()}</div>
    {/if}
  </header>

  <div class={`mx-auto px-4 md:px-6 ${widths[width]} ${tabbed ? 'pb-tabbar' : 'pb-screen'}`}>
    {#if large}
      <div bind:this={titleEl} class="px-1 pb-6 pt-2">
        <h1 class="type-headline-medium text-on-surface">{title}</h1>
        {#if subtitle}<p class="type-body-medium mt-0.5 text-on-surface-variant">{subtitle}</p>{/if}
      </div>
    {:else}
      <div class="h-3"></div>
    {/if}
    {@render children()}
  </div>
</main>
