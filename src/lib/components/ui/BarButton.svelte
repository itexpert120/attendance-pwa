<script lang="ts">
  import type { Snippet } from 'svelte'

  let {
    children,
    label,
    onclick,
    disabled = false,
    tone = 'neutral',
    class: className = '',
  }: {
    children: Snippet
    label: string
    onclick?: (event: MouseEvent) => void
    disabled?: boolean
    /** accent = filled icon button; neutral = standard icon button. */
    tone?: 'neutral' | 'accent'
    class?: string
  } = $props()
</script>

<!-- Material 3 icon button (48dp touch target, 40dp container). -->
<button
  type="button"
  aria-label={label}
  title={label}
  {disabled}
  {onclick}
  class={`state-layer inline-flex size-10 shrink-0 items-center justify-center rounded-full disabled:opacity-38 [&_svg]:size-6 ${tone === 'accent' ? 'bg-primary text-on-primary' : 'text-on-surface-variant'} ${className}`}
>
  {@render children()}
</button>
