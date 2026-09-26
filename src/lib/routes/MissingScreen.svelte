<script lang="ts">
  import Warning from 'phosphor-svelte/lib/Warning'
  import EmptyState from '../components/ui/EmptyState.svelte'
  import Screen from '../components/ui/Screen.svelte'

  let { title, back }: { title: string; back: string } = $props()
</script>

<Screen {title} {back}>
  <EmptyState icon={Warning} title="Not found" text="This item may have been deleted." />
</Screen>
