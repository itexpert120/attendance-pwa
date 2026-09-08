<script lang="ts">
  import type { AttendanceState } from '../app-state.svelte'
  import type { AttendanceReport, AttendanceReportStudent } from '../types'
  import PrintDocument from './print/PrintDocument.svelte'
  import PrintFooter from './print/PrintFooter.svelte'
  import PrintHeader from './print/PrintHeader.svelte'
  import PrintSignature from './print/PrintSignature.svelte'
  import PrintStats from './print/PrintStats.svelte'

  let {
    state: appState,
    report,
  }: {
    state: AttendanceState
    report: AttendanceReport
  } = $props()

  let register = $derived(appState.selectedRegister!)
  let group = $derived(appState.classGroups.find((item) => item.id === register.classGroupId))
  let schoolName = $derived(appState.settings?.schoolName ?? 'School')
  let marked = $derived(report.present + report.absent + report.leave)
  let attendanceRate = $derived(marked ? (report.present / marked) * 100 : 0)
  let absentees = $derived(report.students.filter((student) => student.absent > 0))

  function attendancePercent(student: AttendanceReportStudent) {
    const total = student.present + student.absent + student.leave
    return total ? `${Math.round((student.present / total) * 100)}%` : '—'
  }

  function sessionLabel(student: AttendanceReportStudent) {
    if (student.absentSessions.length === 2) return 'Both'
    return student.absentSessions[0] === 1 ? 'First' : 'Second'
  }
</script>

<PrintDocument>
  <PrintHeader
    logoDataUrl={appState.settings?.logoDataUrl}
    {schoolName}
    eyebrow={`${report.type} attendance report`}
    title="Attendance report"
    subtitle={`Class ${group?.className} · Section ${group?.section} · ${report.label} · Each timing = 0.5`}
  />

  <div class="mt-4">
    <PrintStats
      items={[
        { label: 'Present', value: report.present },
        { label: 'Absent', value: report.absent },
        { label: 'Leave', value: report.leave },
        { label: 'Unmarked', value: report.unmarked },
        { label: 'Attendance', value: `${attendanceRate.toFixed(1)}%` },
      ]}
    />
  </div>

  {#if report.type === 'daily'}
    <section class="mt-5">
      <h2 class="print-section-title">Absentees ({absentees.length})</h2>
      {#if absentees.length}
        <div class="mt-2 grid grid-cols-2 gap-x-6 gap-y-1 text-[10px]">
          {#each absentees as student (student.enrollment.id)}
            <p class="border-b border-register-200 py-1">
              <span class="font-bold">Roll {student.enrollment.rollNumber}</span>
              · {student.student.name} · {sessionLabel(student)}
            </p>
          {/each}
        </div>
      {:else}
        <p class="print-subtitle mt-2">No students were marked absent.</p>
      {/if}
    </section>
  {/if}

  <table class="print-table mt-5">
    <thead>
      <tr>
        <th>Roll</th>
        <th>Name with parentage</th>
        <th class="text-center">Present</th>
        <th class="text-center">Absent</th>
        <th class="text-center">Leave</th>
        <th class="text-center">Unmarked</th>
        <th class="text-center">Attendance</th>
      </tr>
    </thead>
    <tbody>
      {#each report.students as student (student.enrollment.id)}
        <tr>
          <td class="font-bold">{student.enrollment.rollNumber}</td>
          <td class="font-semibold">{student.student.name}</td>
          <td class="text-center">{student.present}</td>
          <td class="text-center">{student.absent}</td>
          <td class="text-center">{student.leave}</td>
          <td class="text-center">{student.unmarked}</td>
          <td class="text-center font-bold">{attendancePercent(student)}</td>
        </tr>
      {/each}
    </tbody>
  </table>

  <PrintSignature
    signers={[{ label: 'Class incharge signature', name: appState.settings?.classInchargeName || 'Name and signature' }]}
  />
  <PrintFooter {schoolName} documentLabel="Attendance Report" />
</PrintDocument>
