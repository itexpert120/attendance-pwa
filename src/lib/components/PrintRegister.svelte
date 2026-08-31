<script lang="ts">
  import { SvelteMap } from 'svelte/reactivity'
  import type { AttendanceState } from '../app-state.svelte'
  import {
    ATTENDANCE_MARK_VALUE,
    addFees,
    customHolidayForDay,
    dateKey,
    daysForRegister,
    feeGrandTotal,
    feesByEnrollment,
    feesForInstallment,
    installmentStudentCount,
    isEnrollmentActiveOn,
    isHolidayDay,
    isRegisterEarlierInAcademicYear,
    minorToDisplay,
    monthlyMovement,
    presentAttendanceByEnrollment,
    workingTimings,
  } from '../calculations'
  import {
    EMPTY_FEES,
    FEE_FIELDS,
    type InstallmentNumber,
    type SessionNumber,
  } from '../types'
  import SchoolMark from './SchoolMark.svelte'

  let { state: appState }: { state: AttendanceState } = $props()

  let register = $derived(appState.selectedRegister!)
  let group = $derived(
    appState.classGroups.find((item) => item.id === register.classGroupId),
  )
  let rows = $derived(appState.rowsForRegister(register))
  let days = $derived(daysForRegister(register))
  let dayChunks = $derived([days.slice(0, 16), days.slice(16)])
  let monthName = $derived(
    new Intl.DateTimeFormat('en', { month: 'long' }).format(
      new Date(register.year, register.month - 1),
    ),
  )
  let movement = $derived(monthlyMovement(rows, register))
  let timings = $derived(workingTimings(register, appState.holidays))
  let currentByEnrollment = $derived(
    presentAttendanceByEnrollment(appState.marks, new Set([register.id])),
  )
  let previousRegisterIds = $derived(
    new Set(
      appState.settings
        ? appState.registers
            .filter((item) =>
              isRegisterEarlierInAcademicYear(item, register, appState.settings!),
            )
            .map((item) => item.id)
        : [],
    ),
  )
  let previousByEnrollment = $derived(
    presentAttendanceByEnrollment(appState.marks, previousRegisterIds),
  )
  let monthAttendance = $derived(
    [...currentByEnrollment.values()].reduce((sum, value) => sum + value, 0),
  )
  let previousAttendance = $derived(
    [...previousByEnrollment.values()].reduce((sum, value) => sum + value, 0),
  )
  let marksByCell = $derived(
    new Map(
      appState.marks
        .filter((mark) => mark.registerId === register.id)
        .map((mark) => [`${mark.enrollmentId}:${mark.day}:${mark.session}`, mark.status]),
    ),
  )
  let presentByDaySession = $derived.by(() => {
    const totals = new SvelteMap<string, number>()
    for (const mark of appState.marks) {
      if (mark.registerId !== register.id || mark.status !== 'P') continue
      const key = `${mark.day}:${mark.session}`
      totals.set(key, (totals.get(key) ?? 0) + ATTENDANCE_MARK_VALUE)
    }
    return totals
  })
  let remarksByEnrollment = $derived(
    new Map(
      appState.remarks
        .filter((item) => item.registerId === register.id)
        .map((item) => [item.enrollmentId, item.text]),
    ),
  )
  let feesByStudent = $derived(feesByEnrollment(appState.feeEntries, register.id))
  let feeTotals = $derived(
    addFees(...rows.map((row) => feesByStudent.get(row.enrollment.id) ?? EMPTY_FEES)),
  )
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
      (sum, installment) =>
        sum + installmentStudentCount(appState.feeEntries, register.id, installment),
      0,
    ),
  )

  function status(enrollmentId: string, day: number, session: SessionNumber) {
    return marksByCell.get(`${enrollmentId}:${day}:${session}`) ?? ''
  }

  function attendanceForSession(day: number, session: SessionNumber) {
    return presentByDaySession.get(`${day}:${session}`) ?? 0
  }

  function holidayReasons(dayList: number[]) {
    return dayList
      .map((day) => {
        const holiday = customHolidayForDay(appState.holidays, register.id, day)
        return holiday ? `${day}: ${holiday.title}` : ''
      })
      .filter(Boolean)
  }
</script>

<div class="hidden bg-white text-black [print-color-adjust:exact] print:block">
  {#each dayChunks.filter((chunk) => chunk.length) as chunk, chunkIndex (chunk[0])}
    <section class="break-after-page p-4">
      <header class="mb-3 border-t-4 border-register-800 pt-2">
        <div class="flex items-end justify-between gap-5">
          <div class="flex items-center gap-3">
            <SchoolMark compact logoDataUrl={appState.settings?.logoDataUrl} alt={`${appState.settings?.schoolName ?? 'School'} logo`} />
            <div>
              <p class="text-[7px] font-black uppercase tracking-[0.2em] text-register-800">Official monthly record</p>
              <h1 class="mt-1 text-xl font-black uppercase tracking-wide">Students Attendance Register</h1>
              <p class="mt-0.5 text-sm font-bold text-ink-800">{appState.settings?.schoolName}</p>
            </div>
          </div>
          <p class="text-[8px] font-bold text-ink-600">Attendance page {chunkIndex + 1} of {dayChunks.filter((item) => item.length).length}</p>
        </div>
        <div class="mt-2 grid grid-cols-4 divide-x divide-register-200 border border-register-200 bg-register-50 text-[8px]">
          <p class="p-1.5"><span class="block font-bold uppercase text-register-800">Class</span>{group?.className}</p>
          <p class="p-1.5"><span class="block font-bold uppercase text-register-800">Section</span>{group?.section}</p>
          <p class="p-1.5"><span class="block font-bold uppercase text-register-800">Month</span>{monthName}</p>
          <p class="p-1.5"><span class="block font-bold uppercase text-register-800">Year</span>{register.year}</p>
        </div>
      </header>

      <table class="w-full border-collapse text-center text-[7px]">
        <thead class="bg-register-100 text-register-900">
          <tr>
            <th rowspan="2" class="border border-register-900 p-1">Admission</th>
            <th rowspan="2" class="border border-register-900 p-1">Roll</th>
            <th rowspan="2" class="min-w-32 border border-register-900 p-1 text-left">Name with parentage</th>
            {#each chunk as day (day)}
              <th colspan="2" class={`border border-register-900 p-1 ${isHolidayDay(appState.holidays, register, day) ? 'bg-red-100 text-red-900' : ''}`}>{day}</th>
            {/each}
            {#if chunkIndex === dayChunks.length - 1}
              <th rowspan="2" class="border border-register-900 bg-register-50 p-1">Month</th>
              <th rowspan="2" class="border border-register-900 bg-register-50 p-1">B/F</th>
              <th rowspan="2" class="border border-register-900 p-1">Total</th>
            {/if}
          </tr>
          <tr>
            {#each chunk as day (day)}
              <th class={`border border-register-900 p-0.5 ${isHolidayDay(appState.holidays, register, day) ? 'bg-red-100 text-red-900' : ''}`}>F</th>
              <th class={`border border-register-900 p-0.5 ${isHolidayDay(appState.holidays, register, day) ? 'bg-red-100 text-red-900' : ''}`}>S</th>
            {/each}
          </tr>
        </thead>
        <tbody>
          {#each rows as row (row.enrollment.id)}
            {@const current = currentByEnrollment.get(row.enrollment.id) ?? 0}
            {@const brought = previousByEnrollment.get(row.enrollment.id) ?? 0}
            <tr class="even:bg-paper-100/70">
              <td class="border border-ink-800 p-1">{row.student.admissionNumber}</td>
              <td class="border border-ink-800 p-1">{row.enrollment.rollNumber}</td>
              <td class="border border-ink-800 p-1 text-left font-semibold">{row.student.name}</td>
              {#each chunk as day (day)}
                {#each [1, 2] as session (session)}
                  <td class={`border border-ink-800 p-1 ${isHolidayDay(appState.holidays, register, day) ? 'bg-red-100 font-bold text-red-900' : ''}`}>
                    {isHolidayDay(appState.holidays, register, day) ? 'H' : !isEnrollmentActiveOn(row.enrollment, dateKey(register.year, register.month, day)) ? '–' : status(row.enrollment.id, day, session as SessionNumber)}
                  </td>
                {/each}
              {/each}
              {#if chunkIndex === dayChunks.length - 1}
                <td class="border border-ink-800 bg-register-50 p-1 font-bold">{current}</td>
                <td class="border border-ink-800 bg-register-50 p-1 font-bold">{brought}</td>
                <td class="border border-ink-800 bg-register-100 p-1 font-black">{current + brought}</td>
              {/if}
            </tr>
          {/each}
        </tbody>
        {#if rows.length}
          <tfoot class="bg-register-100 font-black text-register-900">
            <tr>
              <th colspan="3" class="border border-register-900 p-1 text-left">Column totals</th>
              {#each chunk as day (day)}
                {#each [1, 2] as session (session)}
                  <td class="border border-register-900 p-1">{isHolidayDay(appState.holidays, register, day) ? 'H' : attendanceForSession(day, session as SessionNumber)}</td>
                {/each}
              {/each}
              {#if chunkIndex === dayChunks.length - 1}
                <td class="border border-register-900 p-1">{monthAttendance}</td>
                <td class="border border-register-900 p-1">{previousAttendance}</td>
                <td class="border border-register-900 p-1">{monthAttendance + previousAttendance}</td>
              {/if}
            </tr>
          </tfoot>
        {/if}
      </table>
      <div class="mt-2 flex items-center justify-between text-[7px] text-ink-600"><p>P = Present · A = Absent · L = Leave · H = Holiday</p><p>F = First timing · S = Second timing · Each timing = 0.5</p></div>
      {#if holidayReasons(chunk).length}<p class="mt-1 text-[7px] font-semibold text-red-900">Holiday reasons · {holidayReasons(chunk).join(' · ')}</p>{/if}
    </section>
  {/each}

  <section class="break-after-page p-4">
    <header class="mb-3 flex items-center gap-3 border-t-4 border-register-800 pt-2">
      <SchoolMark compact logoDataUrl={appState.settings?.logoDataUrl} alt={`${appState.settings?.schoolName ?? 'School'} logo`} />
      <div><p class="text-[7px] font-black uppercase tracking-[0.2em] text-register-800">Financial record</p>
      <h2 class="mt-1 text-lg font-black uppercase">Fees & Remarks</h2>
      <p class="mt-0.5 text-[9px] font-bold text-ink-600">{appState.settings?.schoolName} · Class {group?.className}, Section {group?.section} · {monthName} {register.year}</p></div>
    </header>
    <table class="w-full border-collapse text-[8px]">
      <thead class="bg-register-100 text-register-900">
        <tr><th class="border border-register-900 p-1">Adm.</th><th class="border border-register-900 p-1">Roll</th><th class="border border-register-900 p-1 text-left">Name with parentage</th>{#each FEE_FIELDS as field (field.key)}<th class="border border-register-900 p-1">{field.shortLabel}</th>{/each}<th class="border border-register-900 bg-register-200 p-1">Total</th><th class="border border-register-900 p-1 text-left">Remarks</th></tr>
      </thead>
      <tbody>
        {#each rows as row (row.enrollment.id)}
          {@const fees = feesByStudent.get(row.enrollment.id) ?? EMPTY_FEES}
          <tr class="even:bg-paper-100/70"><td class="border border-ink-800 p-1">{row.student.admissionNumber}</td><td class="border border-ink-800 p-1">{row.enrollment.rollNumber}</td><td class="border border-ink-800 p-1 text-left font-semibold">{row.student.name}</td>{#each FEE_FIELDS as field (field.key)}<td class="border border-ink-800 p-1 text-right">{minorToDisplay(fees[field.key])}</td>{/each}<td class="border border-ink-800 bg-register-50 p-1 text-right font-bold">{minorToDisplay(feeGrandTotal(fees))}</td><td class="border border-ink-800 p-1 text-left">{remarksByEnrollment.get(row.enrollment.id) ?? ''}</td></tr>
        {/each}
      </tbody>
      <tfoot class="bg-register-100 font-black text-register-900"><tr><th class="border border-register-900 p-1 text-left" colspan="3">Totals</th>{#each FEE_FIELDS as field (field.key)}<td class="border border-register-900 p-1 text-right">{minorToDisplay(feeTotals[field.key])}</td>{/each}<td class="border border-register-900 bg-register-200 p-1 text-right">{minorToDisplay(feeGrandTotal(feeTotals))}</td><td class="border border-register-900"></td></tr></tfoot>
    </table>
  </section>

  <section class="p-4">
    <header class="mb-4 flex items-center gap-3 border-t-4 border-register-800 pt-2">
      <SchoolMark compact logoDataUrl={appState.settings?.logoDataUrl} alt={`${appState.settings?.schoolName ?? 'School'} logo`} />
      <div><p class="text-[7px] font-black uppercase tracking-[0.2em] text-register-800">Monthly close</p>
      <h2 class="mt-1 text-lg font-black uppercase">Monthly Summary</h2>
      <p class="mt-0.5 text-[9px] font-bold text-ink-600">{appState.settings?.schoolName} · Class {group?.className}, Section {group?.section} · {monthName} {register.year}</p></div>
    </header>

    <table class="mb-5 w-full border-collapse text-[10px]">
      <tbody>
        <tr><th class="border border-register-900 bg-register-100 p-2 text-left text-register-900">Students at beginning</th><td class="border border-register-900 p-2 font-bold">{movement.beginning}</td><th class="border border-register-900 bg-register-100 p-2 text-left text-register-900">Students at end</th><td class="border border-register-900 p-2 font-bold">{movement.end}</td></tr>
        <tr><th class="border border-register-900 bg-register-50 p-2 text-left">Admitted during month</th><td class="border border-register-900 p-2 font-bold">{movement.admitted}</td><th class="border border-register-900 bg-register-50 p-2 text-left">Struck off during month</th><td class="border border-register-900 p-2 font-bold">{movement.struckOff}</td></tr>
        <tr><th class="border border-register-900 bg-register-50 p-2 text-left">Total timings</th><td class="border border-register-900 p-2 font-bold">{timings}</td><th class="border border-register-900 bg-register-50 p-2 text-left">Attendance in month</th><td class="border border-register-900 p-2 font-bold">{monthAttendance}</td></tr>
        <tr><th class="border border-register-900 bg-register-100 p-2 text-left text-register-900">Academic year attendance</th><td class="border border-register-900 p-2 font-bold">{monthAttendance + previousAttendance}</td><th class="border border-register-900 bg-register-100 p-2 text-left text-register-900">Average attendance</th><td class="border border-register-900 p-2 font-bold">{timings ? (monthAttendance / (timings * ATTENDANCE_MARK_VALUE)).toFixed(2) : '0.00'}</td></tr>
      </tbody>
    </table>

    <h3 class="mb-2 text-sm font-black uppercase text-register-900">Installment collection</h3>
    <table class="w-full border-collapse text-[8px]">
      <thead class="bg-register-100 text-register-900"><tr><th class="border border-register-900 p-1">Installment</th><th class="border border-register-900 p-1">Students</th><th class="border border-register-900 p-1">At rate of</th>{#each FEE_FIELDS as field (field.key)}<th class="border border-register-900 p-1">{field.shortLabel}</th>{/each}<th class="border border-register-900 bg-register-200 p-1">Total</th><th class="border border-register-900 p-1">Receiver / signature</th></tr></thead>
      <tbody>
        {#each [1, 2, 3] as installment (installment)}
          {@const amounts = feesForInstallment(appState.feeEntries, register.id, installment as InstallmentNumber)}
          {@const meta = appState.installmentMeta.find((item) => item.registerId === register.id && item.installment === installment)}
          <tr><th class="border border-ink-800 bg-register-50 p-2">{installment === 1 ? '1st' : installment === 2 ? '2nd' : '3rd'}</th><td class="border border-ink-800 p-2">{installmentStudentCount(appState.feeEntries, register.id, installment as InstallmentNumber)}</td><td class="border border-ink-800 p-2 text-right">{minorToDisplay(meta?.rate ?? 0)}</td>{#each FEE_FIELDS as field (field.key)}<td class="border border-ink-800 p-2 text-right">{minorToDisplay(amounts[field.key])}</td>{/each}<td class="border border-ink-800 bg-register-50 p-2 text-right font-bold">{minorToDisplay(feeGrandTotal(amounts))}</td><td class="border border-ink-800 p-2">{meta?.receiverName}<div class="mt-4 border-b border-ink-800"></div></td></tr>
        {/each}
      </tbody>
      <tfoot class="bg-register-100 font-black text-register-900"><tr><th class="border border-register-900 p-1 text-left">Total</th><td class="border border-register-900 p-1 text-center">{totalInstallmentStudents}</td><td class="border border-register-900 p-1 text-right">{minorToDisplay(totalRate)}</td>{#each FEE_FIELDS as field (field.key)}<td class="border border-register-900 p-1 text-right">{minorToDisplay(installmentTotals[field.key])}</td>{/each}<td class="border border-register-900 bg-register-200 p-1 text-right">{minorToDisplay(feeGrandTotal(installmentTotals))}</td><td class="border border-register-900"></td></tr></tfoot>
    </table>

    <div class="mt-14 ml-auto w-64 text-center"><div class="border-b-2 border-register-800"></div><p class="mt-2 text-xs font-black text-register-900">Class Incharge’s Signature</p><p class="mt-1 text-[10px] text-ink-600">{appState.settings?.classInchargeName || 'Name and signature'}</p></div>
  </section>
</div>
