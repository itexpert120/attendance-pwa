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
    neutral: 'bg-paper-100 text-ink-600 ring-paper-200',
    success: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
    warning: 'bg-amber-50 text-amber-800 ring-amber-200',
    danger: 'bg-red-50 text-red-800 ring-red-200',
    info: 'bg-sky-50 text-sky-800 ring-sky-200',
  }
</script>

<span class={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-extrabold tracking-[0.02em] ring-1 ring-inset ${tones[tone]} ${className}`}>
  {@render children()}
</span>
