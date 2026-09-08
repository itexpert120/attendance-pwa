<script lang="ts">
  import type { AttendanceState } from '../app-state.svelte'
  import { marksPercentage } from '../calculations'
  import type { TestRecord } from '../types'
  import PrintDocument from './print/PrintDocument.svelte'
  import PrintFooter from './print/PrintFooter.svelte'
  import PrintHeader from './print/PrintHeader.svelte'
  import PrintKeyValue from './print/PrintKeyValue.svelte'
  import PrintSignature from './print/PrintSignature.svelte'
  import PrintStats from './print/PrintStats.svelte'

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
  let schoolName = $derived(appState.settings?.schoolName ?? 'School')

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

<PrintDocument>
  <PrintHeader
    logoDataUrl={appState.settings?.logoDataUrl}
    {schoolName}
    eyebrow={`Test report · ${progressLabel(summary?.progress)}`}
    title={test.name}
    subtitle={`${subject?.name ?? 'Subject'} · Class ${group?.className} · Section ${group?.section}`}
  />

  <div class="mt-4">
    <PrintKeyValue
      items={[
        { key: 'Date', value: dateLabel(test.date) },
        { key: 'Total Marks', value: String(test.totalMarks) },
        { key: 'Class', value: group ? `${group.className} · ${group.section}` : '—' },
        { key: 'Subject', value: subject?.name ?? '—' },
      ]}
    />
  </div>

  <div class="mt-4">
    <PrintStats
      items={[
        { label: 'Results', value: summary?.numericCount ?? 0 },
        { label: 'Absent', value: summary?.absentCount ?? 0 },
        { label: 'Not entered', value: summary?.notEnteredCount ?? 0 },
        { label: 'Average', value: summary?.average == null ? '—' : summary.average.toFixed(2) },
        { label: 'Highest', value: summary?.highest == null ? '—' : summary.highest },
        { label: 'Lowest', value: summary?.lowest == null ? '—' : summary.lowest },
      ]}
    />
  </div>

  <table class="print-table mt-5">
    <thead>
      <tr>
        <th>Admission</th>
        <th>Roll</th>
        <th>Student name</th>
        <th class="text-center">Marks / status</th>
        <th class="text-center">Percentage</th>
      </tr>
    </thead>
    <tbody>
      {#each rows as row (row.enrollment.id)}
        <tr>
          <td class="font-semibold">{row.student.admissionNumber}</td>
          <td class="font-bold">{row.enrollment.rollNumber}</td>
          <td class="font-semibold">{row.student.name}</td>
          <td class="text-center font-bold">{resultLabel(row)}</td>
          <td class="text-center">
            {row.result?.status === 'marks'
              ? `${marksPercentage(row.result.marks ?? 0, test.totalMarks).toFixed(2)}%`
              : '—'}
          </td>
        </tr>
      {/each}
    </tbody>
  </table>

  <PrintSignature
    signers={[{ label: 'Class incharge signature', name: appState.settings?.classInchargeName || 'Name and signature' }]}
  />
  <PrintFooter {schoolName} documentLabel="Test Report" />
</PrintDocument>
