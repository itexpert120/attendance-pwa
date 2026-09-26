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

<label class={`group grid min-w-0 gap-1 text-left ${className}`}>
  <span class="relative block min-w-0 rounded-xl border border-outline bg-surface-container-lowest transition-[border-color,box-shadow] duration-150 group-hover:border-on-surface-variant focus-within:border-primary! focus-within:shadow-[0_0_0_1px_var(--color-primary)] has-[:disabled]:opacity-40">
    <span class="type-body-small pointer-events-none absolute left-4 top-2 font-medium text-on-surface-variant group-focus-within:text-primary">{label}</span>
    <textarea
      bind:value
      {placeholder}
      {required}
      {disabled}
      {rows}
      {maxlength}
      class="type-body-large block w-full min-w-0 rounded-xl bg-transparent px-4 pb-2 pt-6 text-on-surface caret-primary outline-none placeholder:text-on-surface-variant/60 min-h-32 resize-y"
    ></textarea>
  </span>
  {#if help}
    <span class="flex items-start justify-between gap-3 type-body-small px-4 text-on-surface-variant">
      <span>{help}</span>
      {#if maxlength}<span class="shrink-0 tabular-nums">{value.length}/{maxlength}</span>{/if}
    </span>
  {/if}
</label>
