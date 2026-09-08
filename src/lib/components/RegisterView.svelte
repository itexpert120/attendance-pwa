<script lang="ts">
  import { flushSync } from 'svelte'
  import ArrowLeft from 'phosphor-svelte/lib/ArrowLeft'
  import BarChart3 from 'phosphor-svelte/lib/ChartBar'
  import Banknote from 'phosphor-svelte/lib/CurrencyDollar'
  import DotsThreeVertical from 'phosphor-svelte/lib/DotsThreeVertical'
  import Printer from 'phosphor-svelte/lib/Printer'
  import FileText from 'phosphor-svelte/lib/FileText'
  import UserPlus from 'phosphor-svelte/lib/UserPlus'
  import UsersRound from 'phosphor-svelte/lib/UsersThree'
  import type { AttendanceState } from '../app-state.svelte'
  import type { AttendanceReport } from '../types'
  import { monthLabel } from '../calculations'
  import { printDocument } from '../print'
  import AttendanceGrid from './AttendanceGrid.svelte'
  import FeesGrid from './FeesGrid.svelte'
  import PrintAbsenteeList from './PrintAbsenteeList.svelte'
  import PrintRegister from './PrintRegister.svelte'
  import PrintReport from './PrintReport.svelte'
  import ReportsPanel from './ReportsPanel.svelte'
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

  let activeTab = $state<'attendance' | 'fees' | 'summary' | 'reports'>('attendance')
  let rosterOpen = $state(false)
  let actionsOpen = $state(false)
  let printMode = $state<'register' | 'report' | 'absentees' | null>(null)
  let reportToPrint = $state<AttendanceReport | null>(null)
  let register = $derived(appState.selectedRegister!)
  let group = $derived(appState.classGroups.find((item) => item.id === register.classGroupId))

  const tabs = [
    { id: 'attendance' as const, label: 'Attendance', icon: UsersRound },
    { id: 'fees' as const, label: 'Fees & remarks', icon: Banknote },
    { id: 'summary' as const, label: 'Monthly summary', icon: BarChart3 },
    { id: 'reports' as const, label: 'Reports', icon: FileText },
  ]

  async function printRegister() {
    flushSync(() => (printMode = 'register'))
    await printDocument()
  }

  async function printReport(report: AttendanceReport) {
    reportToPrint = report
    flushSync(() => (printMode = 'report'))
    await printDocument()
  }

  async function printAbsenteeList(report: AttendanceReport) {
    reportToPrint = report
    flushSync(() => (printMode = 'absentees'))
    await printDocument()
  }

  function beforePrint() {
    if (!printMode) flushSync(() => (printMode = 'register'))
  }
</script>

<svelte:window
  onbeforeprint={beforePrint}
  onafterprint={() => (printMode = null)}
/>

<main class="min-h-svh bg-paper-100 text-ink-950 print:hidden">
  <header class="sticky top-0 z-40 border-b border-paper-200 bg-paper-50/95 backdrop-blur">
    <div class="mx-auto flex max-w-[100rem] items-center gap-2 px-2.5 py-2.5 sm:px-5 sm:py-3">
      <Button variant="ghost" size="icon" title="Back to registers" onclick={onback}><ArrowLeft size={19} /></Button>
      <div class="hidden sm:block"><SchoolMark compact logoDataUrl={appState.settings?.logoDataUrl} alt={`${appState.settings?.schoolName ?? 'School'} logo`} /></div>
      <div class="min-w-0 flex-1">
        <p class="truncate font-display text-lg font-semibold leading-none tracking-[-0.02em]">{appState.settings?.schoolName}</p>
        <p class="mt-1 truncate text-[10px] font-bold text-ink-600">Class {group?.className} · Section {group?.section} · {monthLabel(register.month, register.year)}</p>
      </div>
      <div class="relative sm:hidden">
        <Button variant="ghost" size="icon" title="Register actions" onclick={() => (actionsOpen = !actionsOpen)}><DotsThreeVertical size={20} weight="bold" /></Button>
        {#if actionsOpen}
          <div class="absolute right-0 top-12 z-50 w-48 overflow-hidden rounded-xl border border-paper-200 bg-white p-1.5 shadow-lifted">
            <button class="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-left text-xs font-bold text-ink-800 active:bg-paper-100" onclick={() => { actionsOpen = false; rosterOpen = true }}><UserPlus size={17} weight="bold" /> Manage students</button>
            <button class="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-left text-xs font-bold text-ink-800 active:bg-paper-100" onclick={() => { actionsOpen = false; printRegister() }}><Printer size={17} weight="bold" /> Print register</button>
          </div>
        {/if}
      </div>
      <div class="hidden items-center gap-2 sm:flex">
        <Button variant="secondary" size="sm" onclick={() => (rosterOpen = true)}><UserPlus size={16} weight="bold" /> Students</Button>
        <Button size="sm" onclick={printRegister}><Printer size={16} weight="bold" /> Print register</Button>
      </div>
    </div>
    <nav class="mx-auto hidden max-w-[100rem] gap-1 overflow-x-auto px-3 md:flex sm:px-5" aria-label="Register sections">
      {#each tabs as tab (tab.id)}
        <button
          class={`flex min-h-11 shrink-0 items-center gap-2 border-b-2 px-3 text-[11px] font-extrabold transition ${activeTab === tab.id ? 'border-register-700 text-register-800' : 'border-transparent text-ink-600 hover:text-ink-950'}`}
          aria-current={activeTab === tab.id ? 'page' : undefined}
          onclick={() => (activeTab = tab.id)}
        ><tab.icon size={16} weight="bold" />{tab.label}</button>
      {/each}
    </nav>
  </header>

  <div class="mx-auto max-w-[100rem] px-2.5 py-3 pb-24 sm:px-5 sm:py-5 md:pb-5">
    {#if activeTab === 'attendance'}<AttendanceGrid state={appState} onmanagestudents={() => (rosterOpen = true)} />
    {:else if activeTab === 'fees'}<FeesGrid state={appState} />
    {:else if activeTab === 'summary'}<SummaryPanel state={appState} />
    {:else}<ReportsPanel state={appState} onprint={printReport} onprintabsentees={printAbsenteeList} />{/if}
  </div>
</main>

<nav class="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t border-paper-200 bg-white/95 px-1 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_24px_rgb(0_0_0/0.06)] backdrop-blur md:hidden print:hidden" aria-label="Register sections">
  {#each tabs as tab (tab.id)}
    <button
      class={`flex min-h-16 flex-col items-center justify-center gap-1 rounded-xl px-2 text-[10px] font-extrabold transition ${activeTab === tab.id ? 'text-ink-950' : 'text-ink-600'}`}
      aria-current={activeTab === tab.id ? 'page' : undefined}
      onclick={() => (activeTab = tab.id)}
    >
      <span class={`grid size-8 place-items-center rounded-xl ${activeTab === tab.id ? 'bg-register-900 text-white shadow-sm' : ''}`}><tab.icon size={17} weight="bold" /></span>
      {tab.label}
    </button>
  {/each}
</nav>

{#if printMode === 'register'}<PrintRegister state={appState} />
{:else if printMode === 'report' && reportToPrint}<PrintReport state={appState} report={reportToPrint} />
{:else if printMode === 'absentees' && reportToPrint}<PrintAbsenteeList state={appState} report={reportToPrint} />{/if}
<RosterManager state={appState} bind:open={rosterOpen} />
