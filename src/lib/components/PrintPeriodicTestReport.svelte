<script lang="ts">
  import type { AttendanceState } from '../app-state.svelte'
  import { SvelteSet } from 'svelte/reactivity'
  import { marksPercentage } from '../calculations'
  import type { TestRecord, TestRosterEntry } from '../types'
  import SchoolMark from './SchoolMark.svelte'

  let {
    state: appState,
    mode,
    periodLabel,
    tests,
    roster,
    aggregate,
    subjectId,
    studentId,
    classGroupId,
  }: {
    state: AttendanceState
    mode: 'subject' | 'student'
    periodLabel: string
    tests: TestRecord[]
    roster: TestRosterEntry[]
    aggregate: {
      totalTests: number
      numericCount: number
      absentCount: number
      notEnteredCount: number
      averagePercentage: number | null
    }
    subjectId: string
    studentId: string
    classGroupId: string
  } = $props()

  let subject = $derived(appState.subjects.find((item) => item.id === subjectId))
  let student = $derived(appState.students.find((item) => item.id === studentId))
  let classGroup = $derived(appState.classGroups.find((item) => item.id === classGroupId))
  let studentEnrollmentIds = $derived(
    new SvelteSet(
      appState.enrollments
        .filter(
          (enrollment) =>
            enrollment.studentId === studentId && enrollment.classGroupId === classGroupId,
        )
        .map((enrollment) => enrollment.id),
    ),
  )

  function dateLabel(value: string) {
    return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(
      new Date(`${value}T00:00:00`),
    )
  }

  function subjectName(test: TestRecord) {
    return appState.subjects.find((item) => item.id === test.subjectId)?.name ?? 'Subject'
  }

  function groupName(test: TestRecord) {
    const group = appState.classGroups.find((item) => item.id === test.classGroupId)
    return group ? `${group.className} · ${group.section}` : 'Class Group'
  }

  function studentResult(test: TestRecord) {
    const member = roster.find(
      (entry) => entry.testId === test.id && studentEnrollmentIds.has(entry.enrollmentId),
    )
    return member
      ? appState.testResults.find(
          (result) => result.testId === test.id && result.enrollmentId === member.enrollmentId,
        )
      : undefined
  }

  function resultLabel(test: TestRecord) {
    const result = studentResult(test)
    if (!result) return 'Not Entered'
    if (result.status === 'absent') return 'Absent'
    return String(result.marks ?? 0)
  }
</script>

<section class="hidden bg-white p-8 text-black [print-color-adjust:exact] print:block">
  <header class="flex items-center gap-4 border-b-4 border-register-800 pb-4">
    <SchoolMark logoDataUrl={appState.settings?.logoDataUrl} alt={`${appState.settings?.schoolName ?? 'School'} logo`} />
    <div class="min-w-0 flex-1">
      <p class="text-[9px] font-black uppercase tracking-[0.2em] text-register-800">{mode === 'student' ? 'Student report' : 'Subject report'}</p>
      <h1 class="mt-1 text-2xl font-black uppercase tracking-wide">{appState.settings?.schoolName}</h1>
      <p class="mt-1 text-xs font-bold text-ink-600">{mode === 'student' ? `${student?.name ?? 'Student'} · ${student?.admissionNumber ?? ''} · Class ${classGroup?.className ?? ''}, Section ${classGroup?.section ?? ''}` : `${subject?.name ?? 'All Subjects'} · ${classGroup ? `Class ${classGroup.className}, Section ${classGroup.section}` : 'All Class Groups'}`}</p>
      <p class="mt-1 text-[10px] font-semibold text-ink-600">{periodLabel}{mode === 'student' && subject ? ` · ${subject.name}` : ''}</p>
    </div>
  </header>

  <div class="mt-4 grid grid-cols-5 divide-x divide-register-200 border border-register-200 bg-register-50 text-center">
    {#each [
      { label: 'Tests', value: aggregate.totalTests },
      { label: 'Results', value: aggregate.numericCount },
      { label: 'Absent', value: aggregate.absentCount },
      { label: 'Not entered', value: aggregate.notEnteredCount },
      { label: 'Average', value: aggregate.averagePercentage == null ? '—' : `${aggregate.averagePercentage.toFixed(2)}%` },
    ] as stat (stat.label)}
      <div class="p-2"><p class="text-lg font-black text-register-900">{stat.value}</p><p class="text-[8px] font-bold uppercase tracking-wide text-ink-600">{stat.label}</p></div>
    {/each}
  </div>

  <table class="mt-5 w-full border-collapse text-[9px]">
    <thead class="bg-register-100 text-register-900">
      {#if mode === 'student'}
        <tr><th class="border border-register-900 p-1.5 text-left">Date</th><th class="border border-register-900 p-1.5 text-left">Subject</th><th class="border border-register-900 p-1.5 text-left">Class</th><th class="border border-register-900 p-1.5 text-left">Test</th><th class="border border-register-900 p-1.5 text-center">Marks / status</th><th class="border border-register-900 p-1.5 text-center">Total</th><th class="border border-register-900 p-1.5 text-center">Percentage</th></tr>
      {:else}
        <tr><th class="border border-register-900 p-1.5 text-left">Date</th><th class="border border-register-900 p-1.5 text-left">Subject</th><th class="border border-register-900 p-1.5 text-left">Class</th><th class="border border-register-900 p-1.5 text-left">Test</th><th class="border border-register-900 p-1.5 text-center">Entered</th><th class="border border-register-900 p-1.5 text-center">Absent</th><th class="border border-register-900 p-1.5 text-center">Average</th></tr>
      {/if}
    </thead>
    <tbody>
      {#each tests as test (test.id)}
        {@const summary = appState.summaryForTest(test.id)}
        {@const result = studentResult(test)}
        <tr class="even:bg-paper-100/70">
          <td class="border border-ink-800 p-1.5 font-semibold">{dateLabel(test.date)}</td>
          <td class="border border-ink-800 p-1.5 font-semibold">{subjectName(test)}</td>
          <td class="border border-ink-800 p-1.5">{groupName(test)}</td>
          <td class="border border-ink-800 p-1.5 font-bold">{test.name}</td>
          {#if mode === 'student'}
            <td class="border border-ink-800 p-1.5 text-center font-bold">{resultLabel(test)}</td>
            <td class="border border-ink-800 p-1.5 text-center">{test.totalMarks}</td>
            <td class="border border-ink-800 p-1.5 text-center">{result?.status === 'marks' ? `${marksPercentage(result.marks ?? 0, test.totalMarks).toFixed(2)}%` : '—'}</td>
          {:else}
            <td class="border border-ink-800 p-1.5 text-center">{summary?.numericCount ?? 0}</td>
            <td class="border border-ink-800 p-1.5 text-center">{summary?.absentCount ?? 0}</td>
            <td class="border border-ink-800 p-1.5 text-center">{summary?.average == null ? '—' : `${marksPercentage(summary.average, test.totalMarks).toFixed(2)}%`}</td>
          {/if}
        </tr>
      {/each}
    </tbody>
  </table>

  <div class="mt-14 ml-auto w-64 text-center"><div class="border-b-2 border-register-800"></div><p class="mt-2 text-xs font-black text-register-900">Class Incharge’s Signature</p><p class="mt-1 text-[10px] text-ink-600">{appState.settings?.classInchargeName || 'Name and signature'}</p></div>
</section>
