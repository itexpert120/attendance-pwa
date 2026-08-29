<script lang="ts">
  import type { Snippet } from 'svelte'

  type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'soft'
  type Size = 'sm' | 'md' | 'icon'

  let {
    children,
    variant = 'primary',
    size = 'md',
    type = 'button',
    disabled = false,
    title,
    class: className = '',
    onclick,
  }: {
    children: Snippet
    variant?: Variant
    size?: Size
    type?: 'button' | 'submit' | 'reset'
    disabled?: boolean
    title?: string
    class?: string
    onclick?: (event: MouseEvent) => void
  } = $props()

  const variants: Record<Variant, string> = {
    primary:
      'border-register-800 bg-register-800 text-white shadow-sm hover:border-register-900 hover:bg-register-900 hover:shadow-md',
    secondary: 'border-paper-200 bg-white text-ink-800 shadow-sm hover:border-register-100 hover:bg-register-50',
    ghost: 'border-transparent bg-transparent text-ink-600 hover:bg-paper-100 hover:text-ink-950',
    danger: 'border-red-700 bg-red-700 text-white shadow-sm hover:bg-red-800',
    soft: 'border-register-100 bg-register-50 text-register-800 hover:border-register-200 hover:bg-register-100',
  }

  const sizes: Record<Size, string> = {
    sm: 'min-h-10 px-3.5 text-xs',
    md: 'min-h-11 px-4 text-sm',
    icon: 'size-11 p-0',
  }
</script>

<button
  {type}
  {disabled}
  {title}
  {onclick}
  class={`inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border font-bold tracking-[-0.01em] transition duration-150 active:translate-y-px focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-register-600 disabled:pointer-events-none disabled:opacity-45 ${variants[variant]} ${sizes[size]} ${className}`}
>
  {@render children()}
</button>
