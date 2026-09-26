<script lang="ts">
  import type { HTMLInputAttributes } from 'svelte/elements'

  let {
    label,
    value = $bindable(''),
    type = 'text',
    placeholder = '',
    required = false,
    disabled = false,
    min,
    max,
    step,
    autocomplete,
    help,
    class: className = '',
  }: {
    label: string
    value?: string | number
    type?: 'text' | 'tel' | 'date' | 'number'
    placeholder?: string
    required?: boolean
    disabled?: boolean
    min?: number | string
    max?: number | string
    step?: number | string
    autocomplete?: HTMLInputAttributes['autocomplete']
    help?: string
    class?: string
  } = $props()
</script>

<label class={`group grid min-w-0 gap-1 text-left ${className}`}>
  <span class="relative block min-w-0 rounded-xl border border-outline bg-surface-container-lowest transition-[border-color,box-shadow] duration-150 group-hover:border-on-surface-variant focus-within:border-primary! focus-within:shadow-[0_0_0_1px_var(--color-primary)] has-[:disabled]:opacity-40">
    <span class="type-body-small pointer-events-none absolute left-4 top-2 font-medium text-on-surface-variant group-focus-within:text-primary">{label}</span>
    <input
      bind:value
      {type}
      {placeholder}
      {required}
      {disabled}
      {min}
      {max}
      {step}
      {autocomplete}
      class="type-body-large block w-full min-w-0 rounded-xl bg-transparent px-4 pb-2 pt-6 text-on-surface caret-primary outline-none placeholder:text-on-surface-variant/60 h-14"
    />
  </span>
  {#if help}<span class="type-body-small px-4 text-on-surface-variant">{help}</span>{/if}
</label>
