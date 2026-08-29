<script lang="ts">
  import {
    ArrowLeft,
    ChartBar as BarChart3,
    CurrencyDollar as Banknote,
    Printer,
    UserPlus,
    UsersThree as UsersRound,
  } from 'phosphor-svelte'
  import type { AttendanceState } from '../app-state.svelte'
  import { monthLabel } from '../calculations'
  import AttendanceGrid from './AttendanceGrid.svelte'
  import FeesGrid from './FeesGrid.svelte'
  import PrintRegister from './PrintRegister.svelte'
  import RosterManager from './RosterManager.svelte'
  import SchoolMark from './SchoolMark.svelte'
  import SummaryPanel from './SummaryPanel.svelte'
  import Button from './ui/Button.svelte'

  let {
    state: appState,
    onback,
  }: {
    state: AttendanceState
    onback: () => void
  } = $props()

  let activeTab = $state<'attendance' | 'fees' | 'summary'>('attendance')
  let rosterOpen = $state(false)
  let register = $derived(appState.selectedRegister!)
  let group = $derived(appState.classGroups.find((item) => item.id === register.classGroupId))

  const tabs = [
    { id: 'attendance' as const, label: 'Attendance', icon: UsersRound },
    { id: 'fees' as const, label: 'Fees & remarks', icon: Banknote },
    { id: 'summary' as const, label: 'Monthly summary', icon: BarChart3 },
  ]
</script>

<main class="min-h-svh bg-paper-100 text-ink-950 print:hidden">
  <header class="sticky top-0 z-40 border-b border-paper-200 bg-paper-50/95 backdrop-blur">
    <div class="mx-auto flex max-w-[100rem] items-center gap-2 px-2.5 py-2.5 sm:px-5 sm:py-3">
      <Button variant="ghost" size="icon" title="Back to registers" onclick={onback}><ArrowLeft size={19} /></Button>
      <div class="hidden sm:block"><SchoolMark compact /></div>
      <div class="min-w-0 flex-1">
        <p class="truncate font-display text-lg font-semibold leading-none tracking-[-0.02em]">{appState.settings?.schoolName}</p>
        <p class="mt-1 truncate text-[10px] font-bold text-ink-600">Class {group?.className} · Section {group?.section} · {monthLabel(register.month, register.year)}</p>
      </div>
      <Button variant="secondary" size="sm" class="!w-10 !px-0 sm:!w-auto sm:!px-3.5" title="Manage students" onclick={() => (rosterOpen = true)}><UserPlus size={16} weight="bold" /><span class="hidden sm:inline">Students</span></Button>
      <Button size="sm" class="!w-10 !px-0 sm:!w-auto sm:!px-3.5" title="Print register" onclick={() => window.print()}><Printer size={16} weight="bold" /><span class="hidden sm:inline">Print register</span></Button>
    </div>
    <nav class="mx-auto flex max-w-[100rem] gap-1 overflow-x-auto px-2.5 sm:px-5" aria-label="Register sections">
      {#each tabs as tab (tab.id)}
        <button
          class={`flex min-h-11 shrink-0 items-center gap-2 border-b-2 px-3 text-[11px] font-extrabold transition ${activeTab === tab.id ? 'border-register-700 text-register-800' : 'border-transparent text-ink-600 hover:text-ink-950'}`}
          aria-current={activeTab === tab.id ? 'page' : undefined}
          onclick={() => (activeTab = tab.id)}
        ><tab.icon size={16} weight="bold" />{tab.label}</button>
      {/each}
    </nav>
  </header>

  <div class="mx-auto max-w-[100rem] px-2.5 py-3 sm:px-5 sm:py-5">
    {#if activeTab === 'attendance'}<AttendanceGrid state={appState} />
    {:else if activeTab === 'fees'}<FeesGrid state={appState} />
    {:else}<SummaryPanel state={appState} />{/if}
  </div>
</main>

<PrintRegister state={appState} />
<RosterManager state={appState} bind:open={rosterOpen} />
