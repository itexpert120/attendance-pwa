<script lang="ts">
  import { flushSync } from 'svelte'
  import BarChart3 from 'phosphor-svelte/lib/ChartBar'
  import Banknote from 'phosphor-svelte/lib/CurrencyDollar'
  import DotsThreeVertical from 'phosphor-svelte/lib/DotsThreeVertical'
  import Printer from 'phosphor-svelte/lib/Printer'
  import FileText from 'phosphor-svelte/lib/FileText'
  import UserPlus from 'phosphor-svelte/lib/UserPlus'
  import UsersRound from 'phosphor-svelte/lib/UsersThree'
  import type { AttendanceState } from '../app-state.svelte'
  import { navigate, paths, replaceRoute, type RegisterSection } from '../navigation'
  import type { AttendanceReport } from '../types'
  import { monthLabel } from '../calculations'
  import { printDocument } from '../print'
  import AttendanceGrid from './AttendanceGrid.svelte'
  import FeesGrid from './FeesGrid.svelte'
  import PrintAbsenteeList from './PrintAbsenteeList.svelte'
  import PrintRegister from './PrintRegister.svelte'
  import PrintReport from './PrintReport.svelte'
  import ReportsPanel from './ReportsPanel.svelte'
  import SummaryPanel from './SummaryPanel.svelte'
  import BarButton from './ui/BarButton.svelte'
  import Button from './ui/Button.svelte'
  import ListGroup from './ui/ListGroup.svelte'
  import ListRow from './ui/ListRow.svelte'
  import Modal from './ui/Modal.svelte'
  import Screen from './ui/Screen.svelte'

  let {
    state: appState,
    section,
  }: {
    state: AttendanceState
    section: RegisterSection
  } = $props()

  let activeTab = $derived(section)
  let actionsOpen = $state(false)
  let printMode = $state<'register' | 'report' | 'absentees' | null>(null)
  let reportToPrint = $state<AttendanceReport | null>(null)
  let register = $derived(appState.selectedRegister!)
  let group = $derived(appState.classGroups.find((item) => item.id === register.classGroupId))

  const tabs = [
    { id: 'attendance' as const, label: 'Attendance', icon: UsersRound },
    { id: 'fees' as const, label: 'Fees', icon: Banknote },
    { id: 'summary' as const, label: 'Summary', icon: BarChart3 },
    { id: 'reports' as const, label: 'Reports', icon: FileText },
  ]

  const openStudents = () => navigate(paths.students(register.classGroupId))

  function selectTab(tab: typeof activeTab) {
    if (tab === activeTab) return
    navigator.vibrate?.(6)
    // Sections swap in place so back leaves the register rather than walking tabs.
    replaceRoute(paths.register(register.id, tab))
  }

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

<Screen title={`Class ${group?.className ?? ''} · ${group?.section ?? ''}`} subtitle={monthLabel(register.month, register.year)} back={paths.home()} backLabel="Back to registers" width="full">
  {#snippet actions()}
    <div class="hidden items-center gap-2 md:flex">
      <Button variant="ghost" size="sm" onclick={() => (openStudents())}><UserPlus size={18} /> Students</Button>
      <Button variant="secondary" size="sm" onclick={printRegister}><Printer size={18} /> Print register</Button>
    </div>
    <BarButton label="Register actions" class="md:hidden" onclick={() => (actionsOpen = true)}><DotsThreeVertical weight="bold" /></BarButton>
  {/snippet}
  {#snippet toolbar()}
    <nav class="grid grid-cols-4 border-b border-outline-variant md:max-w-xl" aria-label="Register sections">
      {#each tabs as tab (tab.id)}
        {@const selected = activeTab === tab.id}
        <button
          type="button"
          class={`state-layer type-title-small flex h-12 items-center justify-center ${selected ? 'text-primary' : 'text-on-surface-variant'}`}
          aria-current={selected ? 'page' : undefined}
          onclick={() => selectTab(tab.id)}
        >
          <span class="relative flex h-full items-center">
            {tab.label}
            <span class={`absolute inset-x-0 bottom-0 h-[3px] rounded-t-full bg-primary transition-transform duration-200 ${selected ? 'scale-x-100' : 'scale-x-0'}`}></span>
          </span>
        </button>
      {/each}
    </nav>
  {/snippet}

  {#if activeTab === 'attendance'}<AttendanceGrid state={appState} onmanagestudents={() => (openStudents())} />
  {:else if activeTab === 'fees'}<FeesGrid state={appState} />
  {:else if activeTab === 'summary'}<SummaryPanel state={appState} />
  {:else}<ReportsPanel state={appState} onprint={printReport} onprintabsentees={printAbsenteeList} />{/if}
</Screen>

<Modal bind:open={actionsOpen} title="Register" description={`Class ${group?.className ?? ''} · Section ${group?.section ?? ''} · ${monthLabel(register.month, register.year)}`} size="sm">
  <ListGroup muted>
    <ListRow icon={UserPlus} tone="blue" label="Manage students" onclick={() => { actionsOpen = false; openStudents() }} />
    <ListRow icon={Printer} tone="green" label="Print register" detail="Save the full month as a PDF" onclick={() => { actionsOpen = false; void printRegister() }} />
  </ListGroup>
</Modal>

{#if printMode === 'register'}<PrintRegister state={appState} />
{:else if printMode === 'report' && reportToPrint}<PrintReport state={appState} report={reportToPrint} />
{:else if printMode === 'absentees' && reportToPrint}<PrintAbsenteeList state={appState} report={reportToPrint} />{/if}
