<script lang="ts">
  import type { Snippet } from 'svelte'
  import SchoolMark from '../SchoolMark.svelte'

  let {
    logoDataUrl = '',
    schoolName,
    eyebrow,
    title,
    subtitle = '',
    children,
  }: {
    logoDataUrl?: string
    schoolName: string
    eyebrow: string
    title: string
    subtitle?: string
    children?: Snippet
  } = $props()
</script>

<header class="print-banner">
  <SchoolMark {logoDataUrl} alt={`${schoolName} logo`} />
  <div class="min-w-0 flex-1">
    <p class="print-eyebrow">{eyebrow}</p>
    <h1 class="print-title mt-0.5">{title}</h1>
    <p class="print-subtitle mt-0.5">{schoolName}{subtitle ? ` · ${subtitle}` : ''}</p>
  </div>
  {#if children}
    <div class="shrink-0">{@render children()}</div>
  {/if}
</header>
