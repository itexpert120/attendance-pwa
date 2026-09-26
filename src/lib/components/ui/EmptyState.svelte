<script lang="ts">
  import type { Component, Snippet } from 'svelte'

  let {
    icon: Icon,
    title,
    text,
    children,
  }: {
    icon: Component<{ size?: number; weight?: 'duotone' | 'regular'; class?: string }>
    title: string
    text?: string
    children?: Snippet
  } = $props()
</script>

<div class="grid place-items-center px-6 py-12 text-center">
  <Icon size={48} class="text-on-surface-variant" />
  <p class="type-title-medium mt-4 text-on-surface">{title}</p>
  {#if text}<p class="type-body-medium mt-1 max-w-72 text-on-surface-variant">{text}</p>{/if}
  {#if children}<div class="mt-6">{@render children()}</div>{/if}
</div>
