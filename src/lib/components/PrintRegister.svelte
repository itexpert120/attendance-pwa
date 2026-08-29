<script lang="ts">
  import type { AttendanceState } from '../app-state.svelte'
  import {
    addFees,
    broughtForwardAttendance,
    currentAttendance,
    dateKey,
    daysForRegister,
    feeGrandTotal,
    feesForInstallment,
    feesForStudent,
    installmentStudentCount,
    isEnrollmentActiveOn,
    isHolidayDay,
    minorToDisplay,
    monthlyMovement,
    workingTimings,
  } from '../calculations'
  import { FEE_FIELDS, type InstallmentNumber, type SessionNumber } from '../types'

  let { state: appState }: { state: AttendanceState } = $props()

  let register = $derived(appState.selectedRegister!)
  let group = $derived(appState.classGroups.find((item) => item.id === register.classGroupId))
  let rows = $derived(appState.rowsForRegister(register))
  let days = $derived(daysForRegister(register))
  let dayChunks = $derived([days.slice(0, 16), days.slice(16)])
  let movement = $derived(monthlyMovement(rows, register))
  let timings = $derived(workingTimings(register, appState.holidays))
  let monthAttendance = $derived(currentAttendance(appState.marks, register.id))
  let previousAttendance = $derived(appState.settings ? broughtForwardAttendance(appState.marks, appState.registers, register, appState.settings) : 0)
  let feeTotals = $derived(addFees(...rows.map((row) => feesForStudent(appState.feeEntries, register.id, row.enrollment.id))))

  function status(enrollmentId: string, day: number, session: SessionNumber) {
    return appState.marks.find((mark) => mark.registerId === register.id && mark.enrollmentId === enrollmentId && mark.day === day && mark.session === session)?.status ?? ''
  }

  function remark(enrollmentId: string) {
    return appState.remarks.find((item) => item.registerId === register.id && item.enrollmentId === enrollmentId)?.text ?? ''
  }
</script>

<div class="hidden bg-white text-black print:block">
  {#each dayChunks.filter((chunk) => chunk.length) as chunk, chunkIndex (chunk[0])}
    <section class="break-after-page p-4">
      <header class="mb-3 text-center">
        <h1 class="text-xl font-black uppercase tracking-wide">Students Attendance Register</h1>
        <p class="mt-1 text-base font-bold">{appState.settings?.schoolName}</p>
        <div class="mt-2 flex justify-center gap-8 text-xs"><span><b>Class:</b> {group?.className}</span><span><b>Section:</b> {group?.section}</span><span><b>Month:</b> {new Intl.DateTimeFormat('en', { month: 'long' }).format(new Date(register.year, register.month - 1))}</span><span><b>Year:</b> {register.year}</span></div>
      </header>
      <table class="w-full border-collapse text-center text-[7px]">
        <thead><tr><th rowspan="2" class="border border-black p-1">Admission</th><th rowspan="2" class="border border-black p-1">Roll</th><th rowspan="2" class="min-w-32 border border-black p-1 text-left">Name of student</th>{#each chunk as day (day)}<th colspan="2" class="border border-black p-1">{day}</th>{/each}{#if chunkIndex === dayChunks.length - 1}<th rowspan="2" class="border border-black p-1">Month</th><th rowspan="2" class="border border-black p-1">B/F</th><th rowspan="2" class="border border-black p-1">Total</th>{/if}</tr><tr>{#each chunk as day (day)}<th class="border border-black p-0.5">F</th><th class="border border-black p-0.5">S</th>{/each}</tr></thead>
        <tbody>
          {#each rows as row (row.enrollment.id)}
            {@const current = currentAttendance(appState.marks, register.id, row.enrollment.id)}
            {@const brought = appState.settings ? broughtForwardAttendance(appState.marks, appState.registers, register, appState.settings, row.enrollment.id) : 0}
            <tr><td class="border border-black p-1">{row.student.admissionNumber}</td><td class="border border-black p-1">{row.enrollment.rollNumber}</td><td class="border border-black p-1 text-left font-semibold">{row.student.name}</td>{#each chunk as day (day)}{#each [1, 2] as session (session)}<td class="border border-black p-1">{isHolidayDay(appState.holidays, register, day) ? 'H' : !isEnrollmentActiveOn(row.enrollment, dateKey(register.year, register.month, day)) ? '–' : status(row.enrollment.id, day, session as SessionNumber)}</td>{/each}{/each}{#if chunkIndex === dayChunks.length - 1}<td class="border border-black p-1 font-bold">{current}</td><td class="border border-black p-1 font-bold">{brought}</td><td class="border border-black p-1 font-bold">{current + brought}</td>{/if}</tr>
          {/each}
        </tbody>
      </table>
      <p class="mt-2 text-[7px]">P = Present · A = Absent · L = Leave · H = Holiday · F = First time · S = Second time</p>
    </section>
  {/each}

  <section class="break-after-page p-4">
    <header class="mb-3 text-center"><h2 class="text-lg font-black uppercase">Fees & Remarks</h2><p class="text-xs font-bold">{appState.settings?.schoolName} · Class {group?.className}, Section {group?.section}</p></header>
    <table class="w-full border-collapse text-[8px]">
      <thead><tr><th class="border border-black p-1">Adm.</th><th class="border border-black p-1">Roll</th><th class="border border-black p-1 text-left">Student</th>{#each FEE_FIELDS as field (field.key)}<th class="border border-black p-1">{field.shortLabel}</th>{/each}<th class="border border-black p-1">Total</th><th class="border border-black p-1 text-left">Remarks</th></tr></thead>
      <tbody>{#each rows as row (row.enrollment.id)}{@const fees = feesForStudent(appState.feeEntries, register.id, row.enrollment.id)}<tr><td class="border border-black p-1">{row.student.admissionNumber}</td><td class="border border-black p-1">{row.enrollment.rollNumber}</td><td class="border border-black p-1 text-left font-semibold">{row.student.name}</td>{#each FEE_FIELDS as field (field.key)}<td class="border border-black p-1 text-right">{minorToDisplay(fees[field.key])}</td>{/each}<td class="border border-black p-1 text-right font-bold">{minorToDisplay(feeGrandTotal(fees))}</td><td class="border border-black p-1 text-left">{remark(row.enrollment.id)}</td></tr>{/each}</tbody>
      <tfoot><tr class="font-bold"><th class="border border-black p-1 text-left" colspan="3">Totals</th>{#each FEE_FIELDS as field (field.key)}<td class="border border-black p-1 text-right">{minorToDisplay(feeTotals[field.key])}</td>{/each}<td class="border border-black p-1 text-right">{minorToDisplay(feeGrandTotal(feeTotals))}</td><td class="border border-black"></td></tr></tfoot>
    </table>
  </section>

  <section class="p-4">
    <header class="mb-4 text-center"><h2 class="text-lg font-black uppercase">Monthly Summary</h2><p class="text-xs font-bold">{appState.settings?.schoolName} · Class {group?.className}, Section {group?.section}</p></header>
    <table class="mb-5 w-full border-collapse text-xs"><tbody><tr><th class="border border-black p-2 text-left">Students at beginning</th><td class="border border-black p-2">{movement.beginning}</td><th class="border border-black p-2 text-left">Students at end</th><td class="border border-black p-2">{movement.end}</td></tr><tr><th class="border border-black p-2 text-left">Admitted during month</th><td class="border border-black p-2">{movement.admitted}</td><th class="border border-black p-2 text-left">Struck off during month</th><td class="border border-black p-2">{movement.struckOff}</td></tr><tr><th class="border border-black p-2 text-left">Total timings</th><td class="border border-black p-2">{timings}</td><th class="border border-black p-2 text-left">Attendance in month</th><td class="border border-black p-2">{monthAttendance}</td></tr><tr><th class="border border-black p-2 text-left">Academic year attendance</th><td class="border border-black p-2">{monthAttendance + previousAttendance}</td><th class="border border-black p-2 text-left">Average attendance</th><td class="border border-black p-2">{timings ? (monthAttendance / timings).toFixed(2) : '0.00'}</td></tr></tbody></table>

    <h3 class="mb-2 text-sm font-black uppercase">Installments</h3>
    <table class="w-full border-collapse text-[8px]">
      <thead><tr><th class="border border-black p-1">Installment</th><th class="border border-black p-1">Students</th><th class="border border-black p-1">At rate of</th>{#each FEE_FIELDS as field (field.key)}<th class="border border-black p-1">{field.shortLabel}</th>{/each}<th class="border border-black p-1">Total</th><th class="border border-black p-1">Receiver’s signature</th></tr></thead>
      <tbody>{#each [1, 2, 3] as installment (installment)}{@const amounts = feesForInstallment(appState.feeEntries, register.id, installment as InstallmentNumber)}{@const meta = appState.installmentMeta.find((item) => item.registerId === register.id && item.installment === installment)}<tr><th class="border border-black p-2">{installment === 1 ? '1st' : installment === 2 ? '2nd' : '3rd'}</th><td class="border border-black p-2">{installmentStudentCount(appState.feeEntries, register.id, installment as InstallmentNumber)}</td><td class="border border-black p-2 text-right">{minorToDisplay(meta?.rate ?? 0)}</td>{#each FEE_FIELDS as field (field.key)}<td class="border border-black p-2 text-right">{minorToDisplay(amounts[field.key])}</td>{/each}<td class="border border-black p-2 text-right font-bold">{minorToDisplay(feeGrandTotal(amounts))}</td><td class="border border-black p-2">{meta?.receiverName}<div class="mt-4 border-b border-black"></div></td></tr>{/each}</tbody>
    </table>
    <div class="mt-14 ml-auto w-64 text-center"><div class="border-b border-black"></div><p class="mt-2 text-xs font-bold">Headmaster’s Signature</p><p class="mt-1 text-[10px]">{appState.settings?.headmasterName}</p></div>
  </section>
</div>
