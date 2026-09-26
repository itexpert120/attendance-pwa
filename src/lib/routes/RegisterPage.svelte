<script lang="ts">
  import { untrack } from 'svelte'
  import type { AttendanceState } from '../app-state.svelte'
  import { paths, type RegisterSection } from '../navigation'
  import RegisterView from '../components/RegisterView.svelte'
  import MissingScreen from './MissingScreen.svelte'

  let { state: appState, params }: { state: AttendanceState; params: { id: string; section?: string } } = $props()

  const SECTIONS: RegisterSection[] = ['attendance', 'fees', 'summary', 'reports']
  let section = $derived<RegisterSection>(
    SECTIONS.includes(params.section as RegisterSection) ? (params.section as RegisterSection) : 'attendance',
  )
  let exists = $derived(appState.registers.some((register) => register.id === params.id))

  // Register panels read the selected register from app state. Only the route
  // id and existence are dependencies; selecting is an untracked write.
  $effect(() => {
    const id = params.id
    if (!exists) return
    untrack(() => appState.selectRegister(id))
    return () => untrack(() => appState.selectRegister(null))
  })
</script>

{#if !exists}
  <MissingScreen title="Register" back={paths.home()} />
{:else if appState.selectedRegister?.id === params.id}
  {#key params.id}<RegisterView state={appState} {section} />{/key}
{/if}
