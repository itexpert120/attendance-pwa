<script lang="ts">
  import Exam from 'phosphor-svelte/lib/Exam'
  import Gear from 'phosphor-svelte/lib/Gear'
  import House from 'phosphor-svelte/lib/House'
  import Notebook from 'phosphor-svelte/lib/Notebook'
  import type { Tab } from '../ui-state.svelte'

  let {
    active,
    visible,
    onselect,
  }: {
    active: Tab
    /** Phone bar only shows on tab root screens; the rail always shows. */
    visible: boolean
    onselect: (tab: Tab) => void
  } = $props()

  const tabs = [
    { id: 'home' as const, label: 'Registers', icon: House },
    { id: 'tests' as const, label: 'Tests', icon: Exam },
    { id: 'homework' as const, label: 'Homework', icon: Notebook },
    { id: 'settings' as const, label: 'Settings', icon: Gear },
  ]
</script>

<!-- Material 3 navigation bar (phones). Hidden on pushed screens and while typing. -->
<nav
  aria-label="Primary"
  class={`kb-hide fixed inset-x-0 bottom-0 z-40 border-t border-outline-variant bg-surface-container-lowest pb-[var(--safe-bottom)] print:hidden md:hidden ${visible ? '' : 'hidden'}`}
>
  <div class="mx-auto grid h-[var(--tab-bar-height)] max-w-xl grid-cols-4">
    {#each tabs as tab (tab.id)}
      {@const selected = active === tab.id}
      <button
        type="button"
        class="group flex flex-col items-center justify-center gap-1 pb-1"
        aria-current={selected ? 'page' : undefined}
        onclick={() => onselect(tab.id)}
      >
        <span class={`state-layer grid h-8 w-16 place-items-center rounded-full transition-colors duration-200 ${selected ? 'bg-secondary-container text-on-secondary-container' : 'text-on-surface-variant'}`}>
          <tab.icon size={24} weight={selected ? 'fill' : 'regular'} />
        </span>
        <span class={`type-label-medium ${selected ? 'text-on-surface' : 'text-on-surface-variant'}`}>{tab.label}</span>
      </button>
    {/each}
  </div>
</nav>

<!-- Material 3 navigation rail (tablets and desktop). -->
<nav aria-label="Primary" class="fixed inset-y-0 left-0 z-40 hidden w-22 flex-col items-center gap-3 border-r border-outline-variant bg-surface-container-lowest pt-[calc(var(--safe-top)+2.75rem)] print:hidden md:flex">
  {#each tabs as tab (tab.id)}
    {@const selected = active === tab.id}
    <button
      type="button"
      class="flex w-full flex-col items-center gap-1"
      aria-current={selected ? 'page' : undefined}
      onclick={() => onselect(tab.id)}
    >
      <span class={`state-layer grid h-8 w-14 place-items-center rounded-full transition-colors ${selected ? 'bg-secondary-container text-on-secondary-container' : 'text-on-surface-variant'}`}>
        <tab.icon size={24} weight={selected ? 'fill' : 'regular'} />
      </span>
      <span class={`type-label-medium ${selected ? 'text-on-surface' : 'text-on-surface-variant'}`}>{tab.label}</span>
    </button>
  {/each}
</nav>
