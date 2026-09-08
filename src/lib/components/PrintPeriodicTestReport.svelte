<script lang="ts">
  import type { AttendanceState } from '../app-state.svelte'
  import { SvelteSet } from 'svelte/reactivity'
  import { marksPercentage } from '../calculations'
  import type { TestRecord, TestRosterEntry } from '../types'
  import PrintDocument from './print/PrintDocument.svelte'
  import PrintFooter from './print/PrintFooter.svelte'
  import PrintHeader from './print/PrintHeader.svelte'
  import PrintSignature from './print/PrintSignature.svelte'
  import PrintStats from './print/PrintStats.svelte'

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
  let schoolName = $derived(appState.settings?.schoolName ?? 'School')
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
  let subtitle = $derived(
    mode === 'student'
      ? `${student?.name ?? 'Student'} · ${student?.admissionNumber ?? ''} · Class ${classGroup?.className ?? ''}, Section ${classGroup?.section ?? ''}`
      : `${subject?.name ?? 'All Subjects'} · ${classGroup ? `Class ${classGroup.className}, Section ${classGroup.section}` : 'All Class Groups'}`,
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

<PrintDocument>
  <PrintHeader
    logoDataUrl={appState.settings?.logoDataUrl}
    {schoolName}
    eyebrow={mode === 'student' ? 'Student report' : 'Subject report'}
    title={mode === 'student' ? (student?.name ?? 'Student report') : (subject?.name ?? 'Subject report')}
    {subtitle}
  />

  <p class="print-subtitle mt-3">{periodLabel}{mode === 'student' && subject ? ` · ${subject.name}` : ''}</p>

  <div class="mt-4">
    <PrintStats
      items={[
        { label: 'Tests', value: aggregate.totalTests },
        { label: 'Results', value: aggregate.numericCount },
        { label: 'Absent', value: aggregate.absentCount },
        { label: 'Not entered', value: aggregate.notEnteredCount },
        {
          label: 'Average',
          value: aggregate.averagePercentage == null ? '—' : `${aggregate.averagePercentage.toFixed(2)}%`,
        },
      ]}
    />
  </div>

  <table class="print-table mt-5">
    <thead>
      {#if mode === 'student'}
        <tr>
          <th>Date</th>
          <th>Subject</th>
          <th>Class</th>
          <th>Test</th>
          <th class="text-center">Marks / status</th>
          <th class="text-center">Total</th>
          <th class="text-center">Percentage</th>
        </tr>
      {:else}
        <tr>
          <th>Date</th>
          <th>Subject</th>
          <th>Class</th>
          <th>Test</th>
          <th class="text-center">Entered</th>
          <th class="text-center">Absent</th>
          <th class="text-center">Average</th>
        </tr>
      {/if}
    </thead>
    <tbody>
      {#each tests as test (test.id)}
        {@const summary = appState.summaryForTest(test.id)}
        {@const result = studentResult(test)}
        <tr>
          <td class="font-semibold">{dateLabel(test.date)}</td>
          <td class="font-semibold">{subjectName(test)}</td>
          <td>{groupName(test)}</td>
          <td class="font-bold">{test.name}</td>
          {#if mode === 'student'}
            <td class="text-center font-bold">{resultLabel(test)}</td>
            <td class="text-center">{test.totalMarks}</td>
            <td class="text-center">
              {result?.status === 'marks'
                ? `${marksPercentage(result.marks ?? 0, test.totalMarks).toFixed(2)}%`
                : '—'}
            </td>
          {:else}
            <td class="text-center">{summary?.numericCount ?? 0}</td>
            <td class="text-center">{summary?.absentCount ?? 0}</td>
            <td class="text-center">
              {summary?.average == null
                ? '—'
                : `${marksPercentage(summary.average, test.totalMarks).toFixed(2)}%`}
            </td>
          {/if}
        </tr>
      {/each}
    </tbody>
  </table>

  <PrintSignature
    signers={[{ label: 'Class incharge signature', name: appState.settings?.classInchargeName || 'Name and signature' }]}
  />
  <PrintFooter {schoolName} documentLabel={mode === 'student' ? 'Student Report' : 'Subject Report'} />
</PrintDocument>
