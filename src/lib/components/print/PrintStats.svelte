<script lang="ts">
  let {
    items,
  }: {
    items: Array<{ label: string; value: string | number }>
  } = $props()
</script>

<div class="print-stats" style={`grid-template-columns: repeat(${items.length}, minmax(0, 1fr));`}>
  {#each items as item (item.label)}
    <div>
      <p class="print-stat-value">{item.value}</p>
      <p class="print-stat-label">{item.label}</p>
    </div>
  {/each}
</div>
