<script lang="ts">
  let {
    items,
    columns = 4,
  }: {
    items: Array<{ key: string; value: string }>
    columns?: 2 | 3 | 4 | 5
  } = $props()

  const columnClass = $derived(
    (
      {
        2: 'grid-cols-2',
        3: 'grid-cols-3',
        4: 'grid-cols-4',
        5: 'grid-cols-5',
      } as const
    )[columns],
  )
</script>

<dl class={`print-kv ${columnClass}`}>
  {#each items as item (item.key)}
    <div>
      <dt>{item.key}</dt>
      <dd>{item.value}</dd>
    </div>
  {/each}
</dl>
