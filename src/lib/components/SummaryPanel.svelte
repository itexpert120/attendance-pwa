<script lang="ts">
  import {
    CalendarDots as CalendarDays,
    ChartLineUp as ChartNoAxesCombined,
    Student as GraduationCap,
    UserMinus,
    UserPlus,
    Users,
  } from 'phosphor-svelte'
  import type { AttendanceState } from '../app-state.svelte'
  import {
    addFees,
    broughtForwardAttendance,
    currentAttendance,
    feeGrandTotal,
    feesForInstallment,
    installmentStudentCount,
    minorToDisplay,
    monthlyMovement,
    workingTimings,
  } from '../calculations'
  import { FEE_FIELDS, type InstallmentNumber } from '../types'
  import InstallmentRow from './InstallmentRow.svelte'
  import Card from './ui/Card.svelte'

  let { state: appState }: { state: AttendanceState } = $props()

  let register = $derived(appState.selectedRegister!)
  let rows = $derived(appState.rowsForRegister(register))
  let movement = $derived(monthlyMovement(rows, register))
  let timings = $derived(workingTimings(register, appState.holidays))
  let monthAttendance = $derived(currentAttendance(appState.marks, register.id))
  let broughtForward = $derived(
    appState.settings
      ? broughtForwardAttendance(appState.marks, appState.registers, register, appState.settings)
      : 0,
  )
  let average = $derived(timings ? monthAttendance / timings : 0)
  let installmentTotals = $derived(
    addFees(
      ...([1, 2, 3] as InstallmentNumber[]).map((installment) =>
        feesForInstallment(appState.feeEntries, register.id, installment),
      ),
    ),
  )
  let totalRate = $derived(
    appState.installmentMeta
      .filter((item) => item.registerId === register.id)
      .reduce((sum, item) => sum + item.rate, 0),
  )
  let totalInstallmentStudents = $derived(
    ([1, 2, 3] as InstallmentNumber[]).reduce(
      (sum, installment) => sum + installmentStudentCount(appState.feeEntries, register.id, installment),
      0,
    ),
  )

  const summaryCards = $derived([
    { icon: Users, label: 'Students at beginning', value: movement.beginning },
    { icon: GraduationCap, label: 'Students at end', value: movement.end },
    { icon: UserPlus, label: 'Admitted this month', value: movement.admitted },
    { icon: UserMinus, label: 'Struck off this month', value: movement.struckOff },
    { icon: CalendarDays, label: 'Total timings', value: timings },
    { icon: ChartNoAxesCombined, label: 'Month attendance', value: monthAttendance },
    { icon: ChartNoAxesCombined, label: 'Academic year to date', value: monthAttendance + broughtForward },
    { icon: ChartNoAxesCombined, label: 'Average attendance', value: average.toFixed(2) },
  ])
</script>

<section class="space-y-5">
  <div class="grid grid-cols-2 gap-3 md:grid-cols-4">
    {#each summaryCards as item (item.label)}
      <Card class="p-4">
        <item.icon size={18} class="text-register-700" />
        <p class="mt-4 text-2xl font-black tracking-tight text-ink-950">{item.value}</p>
        <p class="mt-1 text-[11px] font-semibold leading-4 text-ink-600">{item.label}</p>
      </Card>
    {/each}
  </div>

  <Card class="overflow-hidden">
    <div class="border-b border-paper-200 px-4 py-4"><h2 class="text-sm font-black text-ink-950">Installment collection summary</h2><p class="mt-1 text-xs text-ink-600">Student counts and fee totals are calculated from individual entries.</p></div>
    <div class="overflow-auto">
      <table class="w-max min-w-full text-xs">
        <thead class="bg-paper-100 text-ink-600"><tr><th class="sticky left-0 min-w-28 border-r border-paper-200 bg-paper-100 px-3 py-3 text-left">Installment</th><th class="min-w-24 border-r border-paper-200 px-3 py-3">Students</th><th class="min-w-28 border-r border-paper-200 px-3 py-3">At rate of</th>{#each FEE_FIELDS as field (field.key)}<th class="min-w-24 border-r border-paper-200 px-3 py-3 text-right">{field.shortLabel}</th>{/each}<th class="min-w-28 border-r border-paper-200 bg-register-100 px-3 py-3 text-right">Total</th><th class="min-w-44 px-3 py-3 text-left">Receiver / signature</th></tr></thead>
        <tbody class="bg-white">
          {#each [1, 2, 3] as installment (installment)}<InstallmentRow state={appState} installment={installment as InstallmentNumber} />{/each}
        </tbody>
        <tfoot class="bg-paper-100 font-black text-ink-950">
          <tr><th class="sticky left-0 border-r border-paper-200 bg-paper-100 px-3 py-3 text-left">Total</th><td class="border-r border-paper-200 px-3 py-3 text-center">{totalInstallmentStudents}</td><td class="border-r border-paper-200 px-3 py-3 text-right">{minorToDisplay(totalRate)}</td>{#each FEE_FIELDS as field (field.key)}<td class="border-r border-paper-200 px-3 py-3 text-right">{minorToDisplay(installmentTotals[field.key])}</td>{/each}<td class="border-r border-paper-200 bg-register-100 px-3 py-3 text-right text-register-800">{minorToDisplay(feeGrandTotal(installmentTotals))}</td><td></td></tr>
        </tfoot>
      </table>
    </div>
  </Card>

  <div class="grid gap-4 sm:grid-cols-2">
    <Card class="p-5"><p class="text-xs font-bold uppercase tracking-wider text-ink-600">Receiver’s signature</p><div class="mt-10 border-b border-ink-800"></div><p class="mt-2 text-[11px] text-ink-600">Sign after verifying installment totals</p></Card>
    <Card class="p-5"><p class="text-xs font-bold uppercase tracking-wider text-ink-600">Headmaster’s signature</p><div class="mt-10 border-b border-ink-800"></div><p class="mt-2 text-[11px] text-ink-600">{appState.settings?.headmasterName || 'Name and signature'}</p></Card>
  </div>
</section>
