<script lang="ts">
  let {
    label,
    value = $bindable(''),
    placeholder = '',
    required = false,
    disabled = false,
    rows = 5,
    maxlength,
    help,
    class: className = '',
  }: {
    label: string
    value?: string
    placeholder?: string
    required?: boolean
    disabled?: boolean
    rows?: number
    maxlength?: number
    help?: string
    class?: string
  } = $props()
</script>

<label class={`grid gap-1.5 text-left ${className}`}>
  <span class="text-[11px] font-bold tracking-[0.01em] text-ink-800">{label}</span>
  <textarea
    bind:value
    {placeholder}
    {required}
    {disabled}
    {rows}
    {maxlength}
    class="min-h-32 w-full resize-y rounded-xl border border-paper-200 bg-paper-50/60 px-3.5 py-3 text-sm font-medium leading-5 text-ink-950 outline-none transition placeholder:font-normal placeholder:text-ink-600/50 focus:border-register-600 focus:bg-white focus:ring-4 focus:ring-register-100 disabled:bg-paper-100"
  ></textarea>
  {#if help}
    <span class="flex items-start justify-between gap-3 text-[11px] leading-4 text-ink-600">
      <span>{help}</span>
      {#if maxlength}<span class="shrink-0 tabular-nums">{value.length}/{maxlength}</span>{/if}
    </span>
  {/if}
</label>
