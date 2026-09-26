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

<!-- Material 3 card on the surface-container background. -->
<section class={`rounded-2xl bg-surface-container-lowest ${className}`}>
  {@render children()}
</section>
