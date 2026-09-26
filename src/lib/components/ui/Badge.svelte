<script lang="ts">
  import type { Snippet } from 'svelte'

  let {
    children,
    tone = 'neutral',
    class: className = '',
  }: {
    children: Snippet
    tone?: 'neutral' | 'success' | 'warning' | 'danger' | 'info'
    class?: string
  } = $props()

  const tones = {
    neutral: 'bg-surface-container-highest text-on-surface-variant',
    success: 'bg-primary-container text-on-primary-container',
    warning: 'bg-warning-container text-on-warning-container',
    danger: 'bg-error-container text-on-error-container',
    info: 'bg-tertiary-container text-on-tertiary-container',
  }
</script>

<span class={`type-label-small inline-flex h-6 items-center gap-1 whitespace-nowrap rounded-lg px-2 ${tones[tone]} ${className}`}>
  {@render children()}
</span>
