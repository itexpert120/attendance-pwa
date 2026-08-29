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

<label class={`grid gap-1.5 text-left ${className}`}>
  <span class="text-[11px] font-bold tracking-[0.01em] text-ink-800">{label}</span>
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
    class="min-h-12 w-full rounded-xl border border-paper-200 bg-paper-50/60 px-3.5 text-sm font-medium text-ink-950 outline-none transition placeholder:font-normal placeholder:text-ink-600/50 focus:border-register-600 focus:bg-white focus:ring-4 focus:ring-register-100 disabled:bg-paper-100 sm:min-h-11"
  />
  {#if help}<span class="text-[11px] leading-4 text-ink-600">{help}</span>{/if}
</label>
