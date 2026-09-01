<script lang="ts">
  import type { AttendanceState } from '../app-state.svelte'
  import type { DailyHomeworkReport } from '../types'
  import SchoolMark from './SchoolMark.svelte'

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

<svelte:head>
  <style>
    @media print {
      @page {
        size: A4 portrait;
        margin: 12mm;
      }
    }
  </style>
</svelte:head>

<section class="hidden bg-white text-black [print-color-adjust:exact] print:block">
  <header class="flex items-center gap-4 border-b-4 border-register-800 pb-4">
    <SchoolMark
      logoDataUrl={appState.settings?.logoDataUrl}
      alt={`${appState.settings?.schoolName ?? 'School'} logo`}
    />
    <div class="min-w-0 flex-1">
      <p class="text-[9px] font-black uppercase tracking-[0.2em] text-register-800">
        Daily student diary
      </p>
      <h1 class="mt-1 text-2xl font-black uppercase tracking-wide">
        {appState.settings?.schoolName}
      </h1>
      <p class="mt-1 text-[10px] font-semibold text-ink-600">
        Learning for today, prepared for home
      </p>
    </div>
  </header>

  <div class="mt-5 rounded-xl border-2 border-register-800 bg-register-50 px-5 py-3 text-center">
    <p class="text-[9px] font-black uppercase tracking-[0.24em] text-register-700">Daily report</p>
    <h2 class="mt-1 text-2xl font-black uppercase tracking-[0.12em] text-register-950">
      Diary / Homework
    </h2>
  </div>

  <dl class="mt-4 grid grid-cols-4 divide-x divide-register-200 overflow-hidden rounded-lg border border-register-200 bg-white">
    <div class="p-3">
      <dt class="text-[8px] font-black uppercase tracking-wide text-ink-600">Class</dt>
      <dd class="mt-1 text-sm font-black text-register-900">{group?.className ?? '-'}</dd>
    </div>
    <div class="p-3">
      <dt class="text-[8px] font-black uppercase tracking-wide text-ink-600">Section</dt>
      <dd class="mt-1 text-sm font-black text-register-900">{group?.section ?? '-'}</dd>
    </div>
    <div class="p-3">
      <dt class="text-[8px] font-black uppercase tracking-wide text-ink-600">Date</dt>
      <dd class="mt-1 text-[10px] font-black leading-4 text-register-900">{dateLabel(report.date)}</dd>
    </div>
    <div class="p-3">
      <dt class="text-[8px] font-black uppercase tracking-wide text-ink-600">Incharge</dt>
      <dd class="mt-1 text-[10px] font-black leading-4 text-register-900">{report.inchargeName}</dd>
    </div>
  </dl>

  <table class="mt-5 w-full table-fixed border-collapse text-left">
    <thead>
      <tr class="bg-register-800 text-white">
        <th class="w-[30%] border border-register-900 px-4 py-2.5 text-[9px] font-black uppercase tracking-[0.16em]">
          Subject
        </th>
        <th class="border border-register-900 px-4 py-2.5 text-[9px] font-black uppercase tracking-[0.16em]">
          Homework / Note
        </th>
      </tr>
    </thead>
    <tbody>
      {#each orderedItems as item, index (`${item.subjectId}:${item.order}`)}
        <tr class="break-inside-avoid align-top">
          <td class="border border-ink-800 bg-register-50 px-4 py-3">
            <div class="flex items-start gap-2.5">
              <span class="grid size-5 shrink-0 place-items-center rounded-md bg-register-800 text-[8px] font-black text-white">{index + 1}</span>
              <span class="text-[10px] font-black uppercase leading-5 tracking-wide text-register-950">{subjectName(item.subjectId)}</span>
            </div>
          </td>
          <td class="border border-ink-800 px-4 py-3">
            <p class="whitespace-pre-wrap text-[10px] font-semibold leading-5 text-ink-950">{item.details}</p>
          </td>
        </tr>
      {/each}
    </tbody>
  </table>

  <aside class="mt-5 break-inside-avoid rounded-lg border-2 border-register-300 bg-register-50 px-4 py-3">
    <p class="text-[8px] font-black uppercase tracking-[0.18em] text-register-800">Note for parents</p>
    <p class="mt-2 whitespace-pre-wrap text-[10px] font-semibold leading-5 text-ink-950">
      {report.parentNote}
    </p>
  </aside>

  <footer class="mt-12 grid grid-cols-2 gap-16 text-center">
    <div>
      <div class="border-b border-ink-950"></div>
      <p class="mt-2 text-[9px] font-black uppercase tracking-wide text-ink-800">Parent / guardian signature</p>
    </div>
    <div>
      <div class="border-b border-ink-950"></div>
      <p class="mt-2 text-[9px] font-black uppercase tracking-wide text-ink-800">Class incharge signature</p>
    </div>
  </footer>
</section>
