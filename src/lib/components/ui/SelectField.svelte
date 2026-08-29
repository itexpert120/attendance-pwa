<script lang="ts">
  let {
    label,
    value = $bindable(),
    options,
    disabled = false,
    class: className = '',
  }: {
    label: string
    value: string | number
    options: Array<{ value: string | number; label: string }>
    disabled?: boolean
    class?: string
  } = $props()
</script>

<label class={`grid gap-1.5 text-left ${className}`}>
  <span class="text-[11px] font-bold tracking-[0.01em] text-ink-800">{label}</span>
  <select
    bind:value
    {disabled}
    class="min-h-12 w-full rounded-xl border border-paper-200 bg-paper-50/60 px-3.5 text-sm font-medium text-ink-950 outline-none transition focus:border-register-600 focus:bg-white focus:ring-4 focus:ring-register-100 disabled:bg-paper-100 sm:min-h-11"
  >
    {#each options as option (option.value)}
      <option value={option.value}>{option.label}</option>
    {/each}
  </select>
</label>
