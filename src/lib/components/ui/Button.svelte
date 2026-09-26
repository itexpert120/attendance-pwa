<script lang="ts">
  import type { Snippet } from 'svelte'

  // Material 3 buttons. `secondary` and `soft` are tonal, `ghost` is a text button.
  type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'soft' | 'outlined'
  type Size = 'sm' | 'md' | 'icon'

  let {
    children,
    variant = 'primary',
    size = 'md',
    type = 'button',
    disabled = false,
    title,
    form,
    class: className = '',
    onclick,
  }: {
    children: Snippet
    variant?: Variant
    size?: Size
    type?: 'button' | 'submit' | 'reset'
    disabled?: boolean
    title?: string
    /** Id of a form elsewhere on the page to submit, e.g. from an app bar. */
    form?: string
    class?: string
    onclick?: (event: MouseEvent) => void
  } = $props()

  const variants: Record<Variant, string> = {
    primary: 'bg-primary text-on-primary hover:shadow-[var(--shadow-e1)] disabled:bg-on-surface/[0.12] disabled:text-on-surface/40',
    secondary: 'bg-secondary-container text-on-secondary-container disabled:bg-on-surface/[0.12] disabled:text-on-surface/40',
    soft: 'bg-primary-container text-on-primary-container disabled:bg-on-surface/[0.12] disabled:text-on-surface/40',
    outlined: 'border border-outline text-primary disabled:border-on-surface/[0.12] disabled:text-on-surface/40',
    ghost: 'text-primary disabled:text-on-surface/40',
    danger: 'bg-error text-on-error disabled:bg-on-surface/[0.12] disabled:text-on-surface/40',
  }

  const sizes: Record<Size, string> = {
    sm: 'h-10 px-4 [&>svg]:-ml-1',
    md: 'h-12 px-6 [&>svg]:-ml-1',
    icon: 'size-10 p-0',
  }
</script>

<button
  {type}
  {disabled}
  {title}
  {form}
  aria-label={size === 'icon' ? title : undefined}
  {onclick}
  class={`state-layer pressable type-label-large inline-flex shrink-0 items-center justify-center gap-2 rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:pointer-events-none ${variants[variant]} ${sizes[size]} ${className}`}
>
  {@render children()}
</button>
