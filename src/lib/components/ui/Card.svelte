<script lang="ts">
  import type { Snippet } from 'svelte'

  let {
    children,
    class: className = '',
  }: {
    children: Snippet
    class?: string
  } = $props()
</script>

<section class={`rounded-2xl border border-paper-200/90 bg-white shadow-soft ${className}`}>
  {@render children()}
</section>
