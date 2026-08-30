<script lang="ts">
  import type { AttendanceState } from '../app-state.svelte'
  import type { AttendanceReport, AttendanceReportStudent } from '../types'
  import SchoolMark from './SchoolMark.svelte'

  let {
    state: appState,
    report,
  }: {
    state: AttendanceState
    report: AttendanceReport
  } = $props()

  let register = $derived(appState.selectedRegister!)
  let group = $derived(appState.classGroups.find((item) => item.id === register.classGroupId))
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

<section class="hidden bg-white p-8 text-black [print-color-adjust:exact] print:block">
  <header class="flex items-center gap-4 border-b-4 border-register-800 pb-4">
    <SchoolMark logoDataUrl={appState.settings?.logoDataUrl} alt={`${appState.settings?.schoolName ?? 'School'} logo`} />
    <div class="min-w-0 flex-1">
      <p class="text-[9px] font-black uppercase tracking-[0.2em] text-register-800">{report.type} attendance report</p>
      <h1 class="mt-1 text-2xl font-black uppercase tracking-wide">{appState.settings?.schoolName}</h1>
      <p class="mt-1 text-xs font-bold text-ink-600">Class {group?.className} · Section {group?.section} · {report.label}</p>
    </div>
  </header>

  <div class="mt-4 grid grid-cols-5 divide-x divide-register-200 border border-register-200 bg-register-50 text-center">
    {#each [
      { label: 'Present', value: report.present },
      { label: 'Absent', value: report.absent },
      { label: 'Leave', value: report.leave },
      { label: 'Unmarked', value: report.unmarked },
      { label: 'Attendance', value: `${attendanceRate.toFixed(1)}%` },
    ] as stat (stat.label)}
      <div class="p-2"><p class="text-lg font-black text-register-900">{stat.value}</p><p class="text-[8px] font-bold uppercase tracking-wide text-ink-600">{stat.label}</p></div>
    {/each}
  </div>

  {#if report.type === 'daily'}
    <section class="mt-5">
      <h2 class="text-xs font-black uppercase tracking-wide text-red-900">Absentees ({absentees.length})</h2>
      {#if absentees.length}
        <div class="mt-2 grid grid-cols-2 gap-x-6 gap-y-1 text-[9px]">
          {#each absentees as student (student.enrollment.id)}
            <p class="border-b border-paper-200 py-1"><span class="font-black">Roll {student.enrollment.rollNumber}</span> · {student.student.name} · {sessionLabel(student)}</p>
          {/each}
        </div>
      {:else}
        <p class="mt-2 text-[9px] text-ink-600">No students were marked absent.</p>
      {/if}
    </section>
  {/if}

  <table class="mt-5 w-full border-collapse text-[9px]">
    <thead class="bg-register-100 text-register-900"><tr><th class="border border-register-900 p-1.5 text-left">Roll</th><th class="border border-register-900 p-1.5 text-left">Name with parentage</th><th class="border border-register-900 p-1.5">Present</th><th class="border border-register-900 p-1.5">Absent</th><th class="border border-register-900 p-1.5">Leave</th><th class="border border-register-900 p-1.5">Unmarked</th><th class="border border-register-900 p-1.5">Attendance</th></tr></thead>
    <tbody>
      {#each report.students as student (student.enrollment.id)}
        <tr class="even:bg-paper-100/70"><td class="border border-ink-800 p-1.5 font-bold">{student.enrollment.rollNumber}</td><td class="border border-ink-800 p-1.5 font-semibold">{student.student.name}</td><td class="border border-ink-800 p-1.5 text-center">{student.present}</td><td class="border border-ink-800 p-1.5 text-center">{student.absent}</td><td class="border border-ink-800 p-1.5 text-center">{student.leave}</td><td class="border border-ink-800 p-1.5 text-center">{student.unmarked}</td><td class="border border-ink-800 p-1.5 text-center font-black">{attendancePercent(student)}</td></tr>
      {/each}
    </tbody>
  </table>

  <div class="mt-14 ml-auto w-64 text-center"><div class="border-b-2 border-register-800"></div><p class="mt-2 text-xs font-black text-register-900">Class Incharge’s Signature</p><p class="mt-1 text-[10px] text-ink-600">{appState.settings?.classInchargeName || 'Name and signature'}</p></div>
</section>
