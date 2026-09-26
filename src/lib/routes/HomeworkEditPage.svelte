<script lang="ts">
  import type { AttendanceState } from '../app-state.svelte'
  import { paths } from '../navigation'
  import HomeworkView from '../components/HomeworkView.svelte'
  import MissingScreen from './MissingScreen.svelte'

  let { state: appState, params }: { state: AttendanceState; params: { id: string } } = $props()

  let report = $derived(appState.dailyHomeworkReports.find((item) => item.id === params.id))
</script>

{#if report}
  {#key report.id}<HomeworkView state={appState} editor="edit" {report} />{/key}
{:else}
  <MissingScreen title="Homework" back={paths.homework()} />
{/if}
