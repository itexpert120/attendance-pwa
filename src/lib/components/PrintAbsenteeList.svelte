<script lang="ts">
  import type { AttendanceState } from '../app-state.svelte'
  import type { AttendanceReport, AttendanceReportStudent } from '../types'
  import PrintDocument from './print/PrintDocument.svelte'
  import PrintFooter from './print/PrintFooter.svelte'
  import PrintHeader from './print/PrintHeader.svelte'
  import PrintSignature from './print/PrintSignature.svelte'

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
  let absentees = $derived(report.students.filter((student) => student.absent > 0))

  function sessionLabel(student: AttendanceReportStudent) {
    if (student.absentSessions.length === 2) return 'Both timings'
    return student.absentSessions[0] === 1 ? 'First timing' : 'Second timing'
  }
</script>

<PrintDocument>
  <PrintHeader
    logoDataUrl={appState.settings?.logoDataUrl}
    {schoolName}
    eyebrow="Absentee-only list"
    title="Absentee list"
    subtitle={`Class ${group?.className} · Section ${group?.section} · ${report.label}`}
  >
    <div class="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-center">
      <p class="print-title text-xl text-red-900">{absentees.length}</p>
      <p class="print-stat-label text-red-800">Absent students</p>
    </div>
  </PrintHeader>

  {#if absentees.length}
    <table class="print-table mt-5">
      <thead>
        <tr>
          <th class="w-14 text-center">Photo</th>
          <th class="w-20">Roll no.</th>
          <th>Name</th>
          <th class="w-48">Date of absence</th>
          <th class="w-28">Timing</th>
        </tr>
      </thead>
      <tbody>
        {#each absentees as student (student.enrollment.id)}
          <tr>
            <td class="text-center">
              {#if student.student.photoDataUrl}
                <img
                  src={student.student.photoDataUrl}
                  alt={`${student.student.name} profile`}
                  class="mx-auto size-10 rounded object-cover"
                />
              {:else}
                <span class="text-register-700/70">—</span>
              {/if}
            </td>
            <td class="font-bold">{student.enrollment.rollNumber}</td>
            <td class="font-semibold">{student.student.name}</td>
            <td>{report.label}</td>
            <td>{sessionLabel(student)}</td>
          </tr>
        {/each}
      </tbody>
    </table>
  {:else}
    <div class="print-note mt-8 text-center">
      <p class="print-section-title">No students were marked absent</p>
      <p class="print-subtitle mt-1">There are no explicit absence marks for {report.label}.</p>
    </div>
  {/if}

  <PrintSignature
    signers={[{ label: 'Class incharge signature', name: appState.settings?.classInchargeName || 'Name and signature' }]}
  />
  <PrintFooter {schoolName} documentLabel="Absentee List" />
</PrintDocument>
