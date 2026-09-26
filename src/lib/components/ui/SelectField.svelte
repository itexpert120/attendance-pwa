<script lang="ts">
  import CaretDown from 'phosphor-svelte/lib/CaretDown'

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

<label class={`group grid min-w-0 gap-1 text-left ${className}`}>
  <span class="relative block min-w-0 rounded-xl border border-outline bg-surface-container-lowest transition-[border-color,box-shadow] duration-150 group-hover:border-on-surface-variant focus-within:border-primary! focus-within:shadow-[0_0_0_1px_var(--color-primary)] has-[:disabled]:opacity-40">
    <span class="type-body-small pointer-events-none absolute left-4 top-2 font-medium text-on-surface-variant group-focus-within:text-primary">{label}</span>
    <select
      bind:value
      {disabled}
      class="type-body-large block w-full min-w-0 rounded-xl bg-transparent px-4 pb-2 pt-6 text-on-surface caret-primary outline-none placeholder:text-on-surface-variant/60 h-14 appearance-none truncate pr-11"
    >
      {#each options as option (option.value)}
        <option value={option.value}>{option.label}</option>
      {/each}
    </select>
    <CaretDown size={18} weight="fill" class="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant" />
  </span>
</label>
