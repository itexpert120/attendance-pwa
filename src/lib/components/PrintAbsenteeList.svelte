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
  let absentees = $derived(report.students.filter((student) => student.absent > 0))

  function sessionLabel(student: AttendanceReportStudent) {
    if (student.absentSessions.length === 2) return 'Both timings'
    return student.absentSessions[0] === 1 ? 'First timing' : 'Second timing'
  }
</script>

<section class="hidden bg-white p-8 text-black [print-color-adjust:exact] print:block">
  <header class="flex items-center gap-4 border-b-4 border-register-800 pb-4">
    <SchoolMark logoDataUrl={appState.settings?.logoDataUrl} alt={`${appState.settings?.schoolName ?? 'School'} logo`} />
    <div class="min-w-0 flex-1">
      <p class="text-[9px] font-black uppercase tracking-[0.2em] text-register-800">Absentee-only list</p>
      <h1 class="mt-1 text-2xl font-black uppercase tracking-wide">{appState.settings?.schoolName}</h1>
      <p class="mt-1 text-xs font-bold text-ink-600">Class {group?.className} · Section {group?.section} · {report.label}</p>
    </div>
    <div class="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-center">
      <p class="text-2xl font-black text-red-900">{absentees.length}</p>
      <p class="text-[8px] font-bold uppercase tracking-wide text-red-800">Absent students</p>
    </div>
  </header>

  {#if absentees.length}
    <table class="mt-6 w-full border-collapse text-[10px]">
      <thead class="bg-register-100 text-register-900">
        <tr><th class="w-14 border border-register-900 p-2 text-center">Photo</th><th class="w-20 border border-register-900 p-2 text-left">Roll no.</th><th class="border border-register-900 p-2 text-left">Name</th><th class="w-48 border border-register-900 p-2 text-left">Date of absence</th><th class="w-28 border border-register-900 p-2 text-left">Timing</th></tr>
      </thead>
      <tbody>
        {#each absentees as student (student.enrollment.id)}
          <tr class="even:bg-paper-100/70">
            <td class="border border-ink-800 p-1.5 text-center">{#if student.student.photoDataUrl}<img src={student.student.photoDataUrl} alt={`${student.student.name} profile`} class="mx-auto size-10 rounded-lg object-cover" />{:else}<span class="text-ink-600">—</span>{/if}</td>
            <td class="border border-ink-800 p-2 font-black">{student.enrollment.rollNumber}</td>
            <td class="border border-ink-800 p-2 font-bold">{student.student.name}</td>
            <td class="border border-ink-800 p-2">{report.label}</td>
            <td class="border border-ink-800 p-2">{sessionLabel(student)}</td>
          </tr>
        {/each}
      </tbody>
    </table>
  {:else}
    <div class="mt-8 rounded-xl border border-dashed border-paper-200 p-10 text-center">
      <p class="text-sm font-black">No students were marked absent</p>
      <p class="mt-1 text-[10px] text-ink-600">There are no explicit absence marks for {report.label}.</p>
    </div>
  {/if}

  <div class="mt-16 ml-auto w-64 text-center"><div class="border-b-2 border-register-800"></div><p class="mt-2 text-xs font-black text-register-900">Class Incharge’s Signature</p><p class="mt-1 text-[10px] text-ink-600">{appState.settings?.classInchargeName || 'Name and signature'}</p></div>
</section>
