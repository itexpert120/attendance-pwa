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
  import PrintDocument from './print/PrintDocument.svelte'
  import PrintFooter from './print/PrintFooter.svelte'
  import PrintHeader from './print/PrintHeader.svelte'
  import PrintKeyValue from './print/PrintKeyValue.svelte'
  import PrintSignature from './print/PrintSignature.svelte'

  let { state: appState }: { state: AttendanceState } = $props()

  let register = $derived(appState.selectedRegister!)
  let group = $derived(
    appState.classGroups.find((item) => item.id === register.classGroupId),
  )
  let rows = $derived(appState.rowsForRegister(register))
  let attendanceRows = $derived(appState.attendanceRowsForRegister(register))
  let visibleEnrollmentIds = $derived(new Set(attendanceRows.map((row) => row.enrollment.id)))
  let visibleMonthAttendance = $derived(attendanceRows.reduce((sum, row) => sum + (currentByEnrollment.get(row.enrollment.id) ?? 0), 0))
  let visiblePreviousAttendance = $derived(attendanceRows.reduce((sum, row) => sum + (previousByEnrollment.get(row.enrollment.id) ?? 0), 0))
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
      if (mark.registerId !== register.id || mark.status !== 'P' || !visibleEnrollmentIds.has(mark.enrollmentId)) continue
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

<PrintDocument orientation="landscape">
  {#each dayChunks.filter((chunk) => chunk.length) as chunk, chunkIndex (chunk[0])}
    <section class="break-after-page">
      <PrintHeader
        logoDataUrl={appState.settings?.logoDataUrl}
        schoolName={appState.settings?.schoolName ?? 'School'}
        eyebrow="Official monthly record"
        title="Students Attendance Register"
        subtitle={`${monthName} ${register.year} · Attendance page ${chunkIndex + 1} of ${dayChunks.filter((item) => item.length).length}`}
      />
      <div class="mt-3">
        <PrintKeyValue
          items={[
            { key: 'Class', value: group?.className ?? '—' },
            { key: 'Section', value: group?.section ?? '—' },
            { key: 'Month', value: monthName },
            { key: 'Year', value: String(register.year) },
          ]}
        />
      </div>

      <table class="print-table print-table-dense mt-3 text-center">
        <thead>
          <tr>
            <th rowspan="2">Admission</th>
            <th rowspan="2">Roll</th>
            <th rowspan="2" class="min-w-32 text-left">Name with parentage</th>
            {#each chunk as day (day)}
              <th colspan="2" class={isHolidayDay(appState.holidays, register, day) ? 'bg-red-800' : ''}>{day}</th>
            {/each}
            {#if chunkIndex === dayChunks.length - 1}
              <th rowspan="2">Month</th>
              <th rowspan="2">B/F</th>
              <th rowspan="2">Total</th>
            {/if}
          </tr>
          <tr>
            {#each chunk as day (day)}
              <th class={isHolidayDay(appState.holidays, register, day) ? 'bg-red-800' : ''}>F</th>
              <th class={isHolidayDay(appState.holidays, register, day) ? 'bg-red-800' : ''}>S</th>
            {/each}
          </tr>
        </thead>
        <tbody>
          {#each attendanceRows as row (row.enrollment.id)}
            {@const current = currentByEnrollment.get(row.enrollment.id) ?? 0}
            {@const brought = previousByEnrollment.get(row.enrollment.id) ?? 0}
            <tr>
              <td>{row.student.admissionNumber}</td>
              <td>{row.enrollment.rollNumber}</td>
              <td class="text-left font-semibold">{row.student.name}</td>
              {#each chunk as day (day)}
                {#each [1, 2] as session (session)}
                  <td class={isHolidayDay(appState.holidays, register, day) ? 'bg-red-50 font-bold text-red-900' : ''}>
                    {isHolidayDay(appState.holidays, register, day) ? 'H' : !isEnrollmentActiveOn(row.enrollment, dateKey(register.year, register.month, day)) ? '–' : status(row.enrollment.id, day, session as SessionNumber)}
                  </td>
                {/each}
              {/each}
              {#if chunkIndex === dayChunks.length - 1}
                <td class="font-bold">{current}</td>
                <td class="font-bold">{brought}</td>
                <td class="font-bold">{current + brought}</td>
              {/if}
            </tr>
          {/each}
        </tbody>
        {#if attendanceRows.length}
          <tfoot>
            <tr>
              <th colspan="3" class="text-left">Column totals</th>
              {#each chunk as day (day)}
                {#each [1, 2] as session (session)}
                  <td>{isHolidayDay(appState.holidays, register, day) ? 'H' : attendanceForSession(day, session as SessionNumber)}</td>
                {/each}
              {/each}
              {#if chunkIndex === dayChunks.length - 1}
                <td>{visibleMonthAttendance}</td>
                <td>{visiblePreviousAttendance}</td>
                <td>{visibleMonthAttendance + visiblePreviousAttendance}</td>
              {/if}
            </tr>
          </tfoot>
        {/if}
      </table>
      <div class="mt-2 flex items-center justify-between text-[7px] text-register-700">
        <p>P = Present · A = Absent · L = Leave · H = Holiday</p>
        <p>F = First timing · S = Second timing · Each timing = 0.5</p>
      </div>
      {#if holidayReasons(chunk).length}
        <p class="mt-1 text-[7px] font-semibold text-red-900">Holiday reasons · {holidayReasons(chunk).join(' · ')}</p>
      {/if}
    </section>
  {/each}

  <section class="break-after-page">
    <PrintHeader
      logoDataUrl={appState.settings?.logoDataUrl}
      schoolName={appState.settings?.schoolName ?? 'School'}
      eyebrow="Financial record"
      title="Fees & Remarks"
      subtitle={`Class ${group?.className}, Section ${group?.section} · ${monthName} ${register.year}`}
    />
    <table class="print-table print-table-dense mt-3">
      <thead>
        <tr>
          <th>Adm.</th>
          <th>Roll</th>
          <th class="text-left">Name with parentage</th>
          {#each FEE_FIELDS as field (field.key)}<th>{field.shortLabel}</th>{/each}
          <th>Total</th>
          <th class="text-left">Remarks</th>
        </tr>
      </thead>
      <tbody>
        {#each rows as row (row.enrollment.id)}
          {@const fees = feesByStudent.get(row.enrollment.id) ?? EMPTY_FEES}
          <tr>
            <td>{row.student.admissionNumber}</td>
            <td>{row.enrollment.rollNumber}</td>
            <td class="text-left font-semibold">{row.student.name}</td>
            {#each FEE_FIELDS as field (field.key)}<td class="text-right">{minorToDisplay(fees[field.key])}</td>{/each}
            <td class="text-right font-bold">{minorToDisplay(feeGrandTotal(fees))}</td>
            <td class="text-left">{remarksByEnrollment.get(row.enrollment.id) ?? ''}</td>
          </tr>
        {/each}
      </tbody>
      <tfoot>
        <tr>
          <th class="text-left" colspan="3">Totals</th>
          {#each FEE_FIELDS as field (field.key)}<td class="text-right">{minorToDisplay(feeTotals[field.key])}</td>{/each}
          <td class="text-right">{minorToDisplay(feeGrandTotal(feeTotals))}</td>
          <td></td>
        </tr>
      </tfoot>
    </table>
  </section>

  <section>
    <PrintHeader
      logoDataUrl={appState.settings?.logoDataUrl}
      schoolName={appState.settings?.schoolName ?? 'School'}
      eyebrow="Monthly close"
      title="Monthly Summary"
      subtitle={`Class ${group?.className}, Section ${group?.section} · ${monthName} ${register.year}`}
    />

    <table class="print-table mt-4">
      <tbody>
        <tr>
          <th class="text-left">Students at beginning</th>
          <td class="font-bold">{movement.beginning}</td>
          <th class="text-left">Students at end</th>
          <td class="font-bold">{movement.end}</td>
        </tr>
        <tr>
          <th class="text-left">Admitted during month</th>
          <td class="font-bold">{movement.admitted}</td>
          <th class="text-left">Struck off during month</th>
          <td class="font-bold">{movement.struckOff}</td>
        </tr>
        <tr>
          <th class="text-left">Total timings</th>
          <td class="font-bold">{timings}</td>
          <th class="text-left">Attendance in month</th>
          <td class="font-bold">{monthAttendance}</td>
        </tr>
        <tr>
          <th class="text-left">Academic year attendance</th>
          <td class="font-bold">{monthAttendance + previousAttendance}</td>
          <th class="text-left">Average attendance</th>
          <td class="font-bold">{timings ? (monthAttendance / (timings * ATTENDANCE_MARK_VALUE)).toFixed(2) : '0.00'}</td>
        </tr>
      </tbody>
    </table>

    <h3 class="print-section-title mt-5 mb-2">Installment collection</h3>
    <table class="print-table print-table-dense">
      <thead>
        <tr>
          <th>Installment</th>
          <th>Students</th>
          <th>At rate of</th>
          {#each FEE_FIELDS as field (field.key)}<th>{field.shortLabel}</th>{/each}
          <th>Total</th>
          <th>Receiver / signature</th>
        </tr>
      </thead>
      <tbody>
        {#each [1, 2, 3] as installment (installment)}
          {@const amounts = feesForInstallment(appState.feeEntries, register.id, installment as InstallmentNumber)}
          {@const meta = appState.installmentMeta.find((item) => item.registerId === register.id && item.installment === installment)}
          <tr>
            <th>{installment === 1 ? '1st' : installment === 2 ? '2nd' : '3rd'}</th>
            <td>{installmentStudentCount(appState.feeEntries, register.id, installment as InstallmentNumber)}</td>
            <td class="text-right">{minorToDisplay(meta?.rate ?? 0)}</td>
            {#each FEE_FIELDS as field (field.key)}<td class="text-right">{minorToDisplay(amounts[field.key])}</td>{/each}
            <td class="text-right font-bold">{minorToDisplay(feeGrandTotal(amounts))}</td>
            <td>
              {meta?.receiverName}
              <div class="mt-4 border-b border-register-900"></div>
            </td>
          </tr>
        {/each}
      </tbody>
      <tfoot>
        <tr>
          <th class="text-left">Total</th>
          <td class="text-center">{totalInstallmentStudents}</td>
          <td class="text-right">{minorToDisplay(totalRate)}</td>
          {#each FEE_FIELDS as field (field.key)}<td class="text-right">{minorToDisplay(installmentTotals[field.key])}</td>{/each}
          <td class="text-right">{minorToDisplay(feeGrandTotal(installmentTotals))}</td>
          <td></td>
        </tr>
      </tfoot>
    </table>

    <PrintSignature
      signers={[{ label: 'Class incharge signature', name: appState.settings?.classInchargeName || 'Name and signature' }]}
    />
    <PrintFooter
      schoolName={appState.settings?.schoolName ?? 'School'}
      documentLabel="Monthly Attendance Register"
    />
  </section>
</PrintDocument>
