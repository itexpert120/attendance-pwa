<script lang="ts">
  import CalendarDays from 'phosphor-svelte/lib/CalendarDots'
  import ChartNoAxesCombined from 'phosphor-svelte/lib/ChartLineUp'
  import GraduationCap from 'phosphor-svelte/lib/Student'
  import UserMinus from 'phosphor-svelte/lib/UserMinus'
  import UserPlus from 'phosphor-svelte/lib/UserPlus'
  import Users from 'phosphor-svelte/lib/Users'
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
  import InstallmentCard from './InstallmentCard.svelte'
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
  <div class="space-y-3 md:hidden">
    <Card class="overflow-hidden">
      <div class="grid grid-cols-[1fr_auto] items-end gap-4 bg-register-900 px-4 py-4 text-white">
        <div><p class="text-[9px] font-extrabold uppercase tracking-[0.12em] text-white/55">Attendance this month</p><p class="mt-1 text-3xl font-extrabold tracking-[-0.03em]">{monthAttendance}</p></div>
        <div class="text-right"><p class="text-[9px] font-extrabold uppercase tracking-[0.1em] text-white/55">Daily average</p><p class="mt-1 text-xl font-extrabold">{average.toFixed(2)}</p></div>
      </div>
      <div class="grid grid-cols-2 divide-x divide-paper-200">
        <div class="p-4"><p class="text-[9px] font-extrabold uppercase tracking-[0.08em] text-ink-600">Working timings</p><p class="mt-1 text-lg font-extrabold text-ink-950">{timings}</p></div>
        <div class="p-4"><p class="text-[9px] font-extrabold uppercase tracking-[0.08em] text-ink-600">Academic year total</p><p class="mt-1 text-lg font-extrabold text-ink-950">{monthAttendance + broughtForward}</p></div>
      </div>
    </Card>

    <Card class="overflow-hidden">
      <div class="border-b border-paper-200 px-4 py-3"><h2 class="text-sm font-extrabold text-ink-950">Student movement</h2></div>
      <div class="grid grid-cols-2">
        {#each [
          { icon: Users, label: 'At beginning', value: movement.beginning },
          { icon: GraduationCap, label: 'At end', value: movement.end },
          { icon: UserPlus, label: 'Admitted', value: movement.admitted },
          { icon: UserMinus, label: 'Struck off', value: movement.struckOff },
        ] as item (item.label)}
          <div class="border-b border-r border-paper-200 p-4 even:border-r-0 [&:nth-last-child(-n+2)]:border-b-0">
            <div class="flex items-center justify-between gap-2"><p class="text-[10px] font-bold text-ink-600">{item.label}</p><item.icon size={16} weight="bold" class="text-ink-600" /></div><p class="mt-2 text-xl font-extrabold text-ink-950">{item.value}</p>
          </div>
        {/each}
      </div>
    </Card>
  </div>

  <div class="hidden grid-cols-2 gap-3 md:grid md:grid-cols-4">
    {#each summaryCards as item (item.label)}
      <Card class="p-4">
        <item.icon size={18} class="text-register-700" />
        <p class="mt-4 text-2xl font-black tracking-tight text-ink-950">{item.value}</p>
        <p class="mt-1 text-[11px] font-semibold leading-4 text-ink-600">{item.label}</p>
      </Card>
    {/each}
  </div>

  <div class="md:hidden">
    <h2 class="text-sm font-extrabold text-ink-950">Installment collection</h2>
    <p class="mt-1 text-[11px] font-medium text-ink-600">Rates, receivers, and totals for the month.</p>
  </div>

  <div class="space-y-3 md:hidden">
    {#each [1, 2, 3] as installment (installment)}
      <InstallmentCard state={appState} installment={installment as InstallmentNumber} />
    {/each}
    <Card class="overflow-hidden">
      <div class="flex items-center justify-between bg-paper-100 px-4 py-3.5"><div><p class="text-[9px] font-extrabold uppercase tracking-[0.1em] text-ink-600">All installments</p><p class="mt-1 text-xs font-bold text-ink-800">{totalInstallmentStudents} student entries · rate {appState.settings?.currencyLabel} {minorToDisplay(totalRate)}</p></div><p class="text-base font-extrabold tabular-nums text-ink-950">{appState.settings?.currencyLabel} {minorToDisplay(feeGrandTotal(installmentTotals))}</p></div>
      <div class="grid grid-cols-3 border-t border-paper-200">
        {#each FEE_FIELDS as field (field.key)}<div class="border-b border-r border-paper-200 px-2.5 py-2.5 [&:nth-child(3n)]:border-r-0 [&:nth-last-child(-n+3)]:border-b-0"><p class="text-[9px] font-extrabold uppercase tracking-[0.05em] text-ink-600">{field.shortLabel}</p><p class="mt-0.5 text-[11px] font-bold tabular-nums text-ink-800">{minorToDisplay(installmentTotals[field.key])}</p></div>{/each}
      </div>
    </Card>
  </div>

  <Card class="hidden overflow-hidden md:block">
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
    <Card class="p-5"><p class="text-xs font-bold uppercase tracking-wider text-ink-600">Class incharge’s signature</p><div class="mt-10 border-b border-ink-800"></div><p class="mt-2 text-[11px] text-ink-600">{appState.settings?.classInchargeName || 'Name and signature'}</p></Card>
  </div>
</section>
