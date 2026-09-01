<script lang="ts">
  import type { AttendanceState } from '../app-state.svelte'
  import { marksPercentage } from '../calculations'
  import type { TestRecord } from '../types'
  import SchoolMark from './SchoolMark.svelte'

  let {
    state: appState,
    test,
  }: {
    state: AttendanceState
    test: TestRecord
  } = $props()

  let rows = $derived(appState.rowsForTest(test.id))
  let summary = $derived(appState.summaryForTest(test.id))
  let subject = $derived(appState.subjects.find((item) => item.id === test.subjectId))
  let group = $derived(appState.classGroups.find((item) => item.id === test.classGroupId))

  function dateLabel(value: string) {
    return new Intl.DateTimeFormat('en', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(new Date(`${value}T00:00:00`))
  }

  function progressLabel(progress?: string) {
    if (progress === 'complete') return 'Complete'
    if (progress === 'in-progress') return 'In Progress'
    return 'Not Started'
  }

  function resultLabel(row: (typeof rows)[number]) {
    if (!row.result) return 'Not Entered'
    if (row.result.status === 'absent') return 'Absent'
    return String(row.result.marks ?? 0)
  }
</script>

<section class="hidden bg-white p-8 text-black [print-color-adjust:exact] print:block">
  <header class="flex items-center gap-4 border-b-4 border-register-800 pb-4">
    <SchoolMark logoDataUrl={appState.settings?.logoDataUrl} alt={`${appState.settings?.schoolName ?? 'School'} logo`} />
    <div class="min-w-0 flex-1">
      <p class="text-[9px] font-black uppercase tracking-[0.2em] text-register-800">Test report · {progressLabel(summary?.progress)}</p>
      <h1 class="mt-1 text-2xl font-black uppercase tracking-wide">{appState.settings?.schoolName}</h1>
      <p class="mt-1 text-xs font-bold text-ink-600">{test.name} · {subject?.name ?? 'Subject'} · Class {group?.className} · Section {group?.section}</p>
      <p class="mt-1 text-[10px] font-semibold text-ink-600">{dateLabel(test.date)} · Total Marks: {test.totalMarks}</p>
    </div>
  </header>

  <div class="mt-4 grid grid-cols-6 divide-x divide-register-200 border border-register-200 bg-register-50 text-center">
    {#each [
      { label: 'Results', value: summary?.numericCount ?? 0 },
      { label: 'Absent', value: summary?.absentCount ?? 0 },
      { label: 'Not entered', value: summary?.notEnteredCount ?? 0 },
      { label: 'Average', value: summary?.average == null ? '—' : summary.average.toFixed(2) },
      { label: 'Highest', value: summary?.highest == null ? '—' : summary.highest },
      { label: 'Lowest', value: summary?.lowest == null ? '—' : summary.lowest },
    ] as stat (stat.label)}
      <div class="p-2"><p class="text-lg font-black text-register-900">{stat.value}</p><p class="text-[8px] font-bold uppercase tracking-wide text-ink-600">{stat.label}</p></div>
    {/each}
  </div>

  <table class="mt-5 w-full border-collapse text-[9px]">
    <thead class="bg-register-100 text-register-900">
      <tr><th class="border border-register-900 p-1.5 text-left">Admission</th><th class="border border-register-900 p-1.5 text-left">Roll</th><th class="border border-register-900 p-1.5 text-left">Student name</th><th class="border border-register-900 p-1.5 text-center">Marks / status</th><th class="border border-register-900 p-1.5 text-center">Percentage</th></tr>
    </thead>
    <tbody>
      {#each rows as row (row.enrollment.id)}
        <tr class="even:bg-paper-100/70">
          <td class="border border-ink-800 p-1.5 font-semibold">{row.student.admissionNumber}</td>
          <td class="border border-ink-800 p-1.5 font-bold">{row.enrollment.rollNumber}</td>
          <td class="border border-ink-800 p-1.5 font-semibold">{row.student.name}</td>
          <td class="border border-ink-800 p-1.5 text-center font-bold">{resultLabel(row)}</td>
          <td class="border border-ink-800 p-1.5 text-center">{row.result?.status === 'marks' ? `${marksPercentage(row.result.marks ?? 0, test.totalMarks).toFixed(2)}%` : '—'}</td>
        </tr>
      {/each}
    </tbody>
  </table>

  <div class="mt-14 ml-auto w-64 text-center"><div class="border-b-2 border-register-800"></div><p class="mt-2 text-xs font-black text-register-900">Class Incharge’s Signature</p><p class="mt-1 text-[10px] text-ink-600">{appState.settings?.classInchargeName || 'Name and signature'}</p></div>
</section>
