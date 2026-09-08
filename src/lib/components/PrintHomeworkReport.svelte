<script lang="ts">
  import type { AttendanceState } from '../app-state.svelte'
  import type { DailyHomeworkReport } from '../types'
  import PrintDocument from './print/PrintDocument.svelte'
  import PrintFooter from './print/PrintFooter.svelte'
  import PrintHeader from './print/PrintHeader.svelte'
  import PrintKeyValue from './print/PrintKeyValue.svelte'
  import PrintSignature from './print/PrintSignature.svelte'

  let {
    state: appState,
    report,
  }: {
    state: AttendanceState
    report: DailyHomeworkReport
  } = $props()

  let group = $derived(
    appState.classGroups.find((item) => item.id === report.classGroupId),
  )
  let orderedItems = $derived([...report.items].sort((a, b) => a.order - b.order))
  let schoolName = $derived(appState.settings?.schoolName ?? 'School')

  function subjectName(subjectId: string) {
    return appState.subjects.find((subject) => subject.id === subjectId)?.name ?? 'Subject'
  }

  function dateLabel(value: string) {
    return new Intl.DateTimeFormat('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(new Date(`${value}T00:00:00`))
  }
</script>

<PrintDocument>
  <PrintHeader
    logoDataUrl={appState.settings?.logoDataUrl}
    {schoolName}
    eyebrow="Daily student diary"
    title="Homework report"
    subtitle="Learning for today, prepared for home"
  />

  <div class="mt-4">
    <PrintKeyValue
      items={[
        { key: 'Class', value: group?.className ?? '—' },
        { key: 'Section', value: group?.section ?? '—' },
        { key: 'Date', value: dateLabel(report.date) },
        { key: 'Incharge', value: report.inchargeName },
      ]}
    />
  </div>

  {#if report.photoDataUrl}
    <figure class="mt-5 break-inside-avoid">
      <p class="print-section-title mb-2">Photographed diary</p>
      <img
        src={report.photoDataUrl}
        alt="Photographed Daily Homework Report"
        class="max-h-[170mm] w-full rounded-md border border-register-200 object-contain"
      />
    </figure>
  {:else}
    <table class="print-table mt-5">
      <thead>
        <tr>
          <th class="w-[28%]">Subject</th>
          <th>Homework / Note</th>
        </tr>
      </thead>
      <tbody>
        {#each orderedItems as item, index (`${item.subjectId}:${item.order}`)}
          <tr class="break-inside-avoid">
            <td>
              <div class="flex items-start gap-2">
                <span class="grid size-5 shrink-0 place-items-center rounded bg-register-700 text-[8px] font-bold text-white">
                  {index + 1}
                </span>
                <span class="font-bold">{subjectName(item.subjectId)}</span>
              </div>
            </td>
            <td>
              <p class="whitespace-pre-wrap leading-5">{item.details}</p>
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  {/if}

  <aside class="print-note mt-5 break-inside-avoid">
    <p class="print-eyebrow">Note for parents</p>
    <p class="mt-2 whitespace-pre-wrap font-medium leading-5">{report.parentNote}</p>
  </aside>

  <PrintSignature
    signers={[
      { label: 'Parent / guardian signature' },
      { label: 'Class incharge signature', name: report.inchargeName },
    ]}
  />
  <PrintFooter {schoolName} documentLabel="Daily Homework Report" />
</PrintDocument>
