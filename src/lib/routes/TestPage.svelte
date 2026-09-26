<script lang="ts">
  import type { AttendanceState } from '../app-state.svelte'
  import { paths } from '../navigation'
  import TestDetail from '../components/TestDetail.svelte'
  import MissingScreen from './MissingScreen.svelte'

  let { state: appState, params }: { state: AttendanceState; params: { id: string } } = $props()

  let test = $derived(appState.tests.find((item) => item.id === params.id))
</script>

{#if test}
  {#key test.id}<TestDetail state={appState} {test} />{/key}
{:else}
  <MissingScreen title="Test" back={paths.tests()} />
{/if}
