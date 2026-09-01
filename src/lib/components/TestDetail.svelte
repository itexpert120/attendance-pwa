<script lang="ts">
  import ArrowLeft from 'phosphor-svelte/lib/ArrowLeft'
  import ArrowsClockwise from 'phosphor-svelte/lib/ArrowsClockwise'
  import NotePencil from 'phosphor-svelte/lib/NotePencil'
  import Printer from 'phosphor-svelte/lib/Printer'
  import Trash from 'phosphor-svelte/lib/Trash'
  import UserPlus from 'phosphor-svelte/lib/UserPlus'
  import Users from 'phosphor-svelte/lib/Users'
  import type { AttendanceState } from '../app-state.svelte'
  import { marksPercentage, rowsForClass } from '../calculations'
  import type { TestRecord, TestRosterRow } from '../types'
  import Badge from './ui/Badge.svelte'
  import Button from './ui/Button.svelte'
  import Card from './ui/Card.svelte'
  import Modal from './ui/Modal.svelte'
  import SelectField from './ui/SelectField.svelte'
  import TextField from './ui/TextField.svelte'

  let {
    state: appState,
    test,
    onback,
    onprint,
    ondeleted,
  }: {
    state: AttendanceState
    test: TestRecord
    onback: () => void
    onprint: (test: TestRecord) => void
    ondeleted: () => void
  } = $props()

  let editOpen = $state(false)
  let rosterOpen = $state(false)
  let editName = $state('')
  let editSubjectId = $state('')
  let editClassGroupId = $state('')
  let editDate = $state('')
  let editTotalMarks = $state<string | number>('')
  let editError = $state('')
  let entryError = $state('')

  let rows = $derived(appState.rowsForTest(test.id))
  let summary = $derived(appState.summaryForTest(test.id))
  let subject = $derived(appState.subjects.find((item) => item.id === test.subjectId))
  let group = $derived(appState.classGroups.find((item) => item.id === test.classGroupId))
  let hasResults = $derived(appState.testResults.some((result) => result.testId === test.id))
  let classRows = $derived(rowsForClass(appState.enrollments, appState.students, test.classGroupId))
  let rosterIds = $derived(new Set(rows.map((row) => row.enrollment.id)))
  let rosterCandidates = $derived(classRows.filter((row) => !rosterIds.has(row.enrollment.id)))
  let subjectOptions = $derived(
    appState.subjects
      .filter((item) => !item.archivedAt || item.id === test.subjectId)
      .map((item) => ({ value: item.id, label: `${item.name}${item.archivedAt ? ' · Archived' : ''}` })),
  )
  let classOptions = $derived(
    appState.classGroups.map((item) => ({
      value: item.id,
      label: `${item.className} · Section ${item.section}`,
    })),
  )

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

  function progressTone(progress?: string): 'success' | 'warning' | 'neutral' {
    if (progress === 'complete') return 'success'
    if (progress === 'in-progress') return 'warning'
    return 'neutral'
  }

  function openEdit() {
    editName = test.name
    editSubjectId = test.subjectId
    editClassGroupId = test.classGroupId
    editDate = test.date
    editTotalMarks = test.totalMarks
    editError = ''
    editOpen = true
  }

  async function saveEdit(event: SubmitEvent) {
    event.preventDefault()
    editError = ''
    const totalMarks = Number(editTotalMarks)
    if (
      totalMarks !== test.totalMarks &&
      !window.confirm('Changing Total Marks will recalculate every percentage. Continue?')
    ) return
    try {
      await appState.updateTest(test.id, {
        name: editName,
        subjectId: editSubjectId,
        classGroupId: editClassGroupId,
        date: editDate,
        totalMarks,
      })
      editOpen = false
    } catch (caught) {
      editError = caught instanceof Error ? caught.message : 'Could not update this Test.'
    }
  }

  async function saveMarks(row: TestRosterRow, event: Event) {
    const input = event.currentTarget as HTMLInputElement
    entryError = ''
    try {
      if (!input.value.trim()) {
        await appState.setTestResult(test.id, row.enrollment.id, null)
      } else {
        await appState.setTestResult(test.id, row.enrollment.id, {
          status: 'marks',
          marks: Number(input.value),
        })
      }
    } catch (caught) {
      entryError = caught instanceof Error ? caught.message : 'Could not save Marks.'
      input.value = row.result?.status === 'marks' ? String(row.result.marks ?? '') : ''
    }
  }

  async function toggleAbsent(row: TestRosterRow) {
    entryError = ''
    try {
      await appState.setTestResult(
        test.id,
        row.enrollment.id,
        row.result?.status === 'absent' ? null : { status: 'absent' },
      )
    } catch (caught) {
      entryError = caught instanceof Error ? caught.message : 'Could not save this result.'
    }
  }

  function focusNextMarks(index: number, event: KeyboardEvent) {
    if (event.key !== 'Enter') return
    event.preventDefault()
    const surface = window.matchMedia('(min-width: 640px)').matches ? 'desktop' : 'mobile'
    document
      .querySelector<HTMLInputElement>(`[data-${surface}-marks-index="${index + 1}"]`)
      ?.focus()
  }

  async function refreshRoster() {
    try {
      await appState.refreshTestRoster(test.id)
    } catch (caught) {
      window.alert(caught instanceof Error ? caught.message : 'Could not refresh the Test Roster.')
    }
  }

  async function addRosterMember(enrollmentId: string) {
    try {
      await appState.addTestRosterMember(test.id, enrollmentId)
    } catch (caught) {
      window.alert(caught instanceof Error ? caught.message : 'Could not add this Student.')
    }
  }

  async function removeRosterMember(row: TestRosterRow) {
    if (!window.confirm(`Remove ${row.student.name} from this Test Roster?`)) return
    try {
      await appState.removeTestRosterMember(test.id, row.enrollment.id)
    } catch (caught) {
      window.alert(caught instanceof Error ? caught.message : 'Could not remove this Student.')
    }
  }

  async function deleteTest() {
    const recorded = appState.testResults.filter((result) => result.testId === test.id).length
    if (!window.confirm(`Delete “${test.name}” and ${recorded} recorded result${recorded === 1 ? '' : 's'}? This cannot be undone.`)) return
    await appState.deleteTest(test.id)
    ondeleted()
  }
</script>

<main class="min-h-svh bg-paper-100 text-ink-950 print:hidden">
  <header class="border-b border-paper-200 bg-white/95 backdrop-blur">
    <div class="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 sm:px-6">
      <Button variant="ghost" size="icon" title="Back to Tests" onclick={onback}><ArrowLeft size={19} weight="bold" /></Button>
      <div class="min-w-0 flex-1">
        <div class="flex flex-wrap items-center gap-2"><h1 class="truncate font-display text-xl font-semibold tracking-[-0.025em] sm:text-2xl">{test.name}</h1><Badge tone={progressTone(summary?.progress)}>{progressLabel(summary?.progress)}</Badge></div>
        <p class="mt-1 truncate text-[11px] font-semibold text-ink-600">{subject?.name} · Class {group?.className}, Section {group?.section} · {dateLabel(test.date)} · {test.totalMarks} marks</p>
      </div>
      <div class="hidden items-center gap-2 sm:flex"><Button variant="secondary" size="sm" onclick={openEdit}><NotePencil size={16} weight="bold" /> Edit</Button><Button onclick={() => onprint(test)}><Printer size={17} weight="bold" /> Print report</Button></div>
    </div>
  </header>

  <div class="mx-auto max-w-7xl px-4 py-5 sm:px-6 sm:py-7">
    <div class="mb-4 grid grid-cols-3 gap-2 sm:hidden"><Button variant="secondary" size="sm" onclick={openEdit}><NotePencil size={16} weight="bold" /> Edit</Button><Button variant="secondary" size="sm" onclick={() => onprint(test)}><Printer size={16} weight="bold" /> Print</Button><Button variant="secondary" size="sm" onclick={() => (rosterOpen = true)}><Users size={16} weight="bold" /> Roster</Button></div>

    <section class="grid grid-cols-2 gap-3 lg:grid-cols-5">
      {#each [
        { label: 'Students', value: rows.length, surface: 'bg-white' },
        { label: 'Marks entered', value: summary?.numericCount ?? 0, surface: 'bg-register-50' },
        { label: 'Absent', value: summary?.absentCount ?? 0, surface: 'bg-red-50' },
        { label: 'Not entered', value: summary?.notEnteredCount ?? 0, surface: 'bg-amber-50' },
        { label: 'Average', value: summary?.average == null ? '—' : summary.average.toFixed(2), surface: 'bg-sky-50' },
      ] as stat (stat.label)}
        <Card class={`p-4 ${stat.surface}`}><p class="font-display text-2xl font-semibold tracking-tight">{stat.value}</p><p class="mt-1 text-[10px] font-extrabold uppercase tracking-[0.08em] text-ink-600">{stat.label}</p></Card>
      {/each}
    </section>

    <Card class="mt-5 overflow-hidden">
      <div class="flex flex-col gap-3 border-b border-paper-200 bg-white px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div class="min-w-0 flex-1"><h2 class="font-display text-xl font-semibold">Enter Test Results</h2><p class="mt-1 text-[11px] font-medium text-ink-600">Blank is Not Entered. Zero is a recorded result. Press Enter to move to the next Student.</p></div>
        <div class="hidden items-center gap-2 sm:flex"><Button variant="ghost" size="sm" disabled={hasResults} title={hasResults ? 'Roster refresh locks after result entry begins' : 'Refresh from current Enrollments'} onclick={refreshRoster}><ArrowsClockwise size={16} weight="bold" /> Refresh roster</Button><Button variant="secondary" size="sm" onclick={() => (rosterOpen = true)}><Users size={16} weight="bold" /> Correct roster</Button></div>
        <Button variant="ghost" size="sm" class="sm:hidden" disabled={hasResults} title={hasResults ? 'Roster refresh locks after result entry begins' : 'Refresh from current Enrollments'} onclick={refreshRoster}><ArrowsClockwise size={16} weight="bold" /> Refresh</Button>
      </div>
      {#if entryError}<p class="m-4 rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-800">{entryError}</p>{/if}
      <div class="divide-y divide-paper-200 bg-white sm:hidden">
        {#each rows as row, index (row.enrollment.id)}
          <article class="p-4">
            <div class="flex items-start gap-3"><div class="grid size-10 shrink-0 place-items-center rounded-xl bg-paper-100 font-display text-lg font-semibold">{row.enrollment.rollNumber}</div><div class="min-w-0 flex-1"><p class="truncate text-sm font-bold">{row.student.name}</p><p class="mt-0.5 text-[10px] font-semibold text-ink-600">{row.student.admissionNumber}</p></div><Badge tone={row.result?.status === 'marks' ? 'success' : row.result?.status === 'absent' ? 'danger' : 'neutral'}>{row.result?.status === 'marks' ? 'Marks' : row.result?.status === 'absent' ? 'Absent' : 'Not Entered'}</Badge></div>
            <div class="mt-3 grid grid-cols-[1fr_auto] items-end gap-2">
              <label class="grid gap-1.5"><span class="text-[10px] font-bold text-ink-600">Marks out of {test.totalMarks}</span><input data-mobile-marks-index={index} aria-label={`Marks for ${row.student.name}`} type="number" inputmode="decimal" min="0" max={test.totalMarks} step="0.01" disabled={row.result?.status === 'absent'} value={row.result?.status === 'marks' ? row.result.marks : ''} onchange={(event) => saveMarks(row, event)} onkeydown={(event) => focusNextMarks(index, event)} class="min-h-12 w-full rounded-xl border border-paper-200 bg-paper-50 px-3 text-base font-bold outline-none transition focus:border-register-600 focus:bg-white focus:ring-4 focus:ring-register-100 disabled:bg-paper-100 disabled:text-ink-600" /></label>
              <button aria-label={`${row.result?.status === 'absent' ? 'Clear absence for' : 'Mark absent'} ${row.student.name}`} aria-pressed={row.result?.status === 'absent'} onclick={() => toggleAbsent(row)} class={`min-h-12 rounded-xl border px-4 text-xs font-extrabold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-register-600 ${row.result?.status === 'absent' ? 'border-red-700 bg-red-700 text-white' : 'border-paper-200 bg-white text-ink-600'}`}>Absent</button>
            </div>
            <p class="mt-2 text-right text-[10px] font-bold text-ink-600">Percentage: {row.result?.status === 'marks' ? `${marksPercentage(row.result.marks ?? 0, test.totalMarks).toFixed(2)}%` : '—'}</p>
          </article>
        {/each}
      </div>
      <div class="hidden overflow-x-auto sm:block">
        <table class="w-full min-w-190 text-sm">
          <thead class="bg-paper-100 text-[10px] font-extrabold uppercase tracking-[0.07em] text-ink-600"><tr><th class="px-4 py-3 text-left">Roll</th><th class="px-4 py-3 text-left">Student</th><th class="px-3 py-3 text-left">Marks</th><th class="px-3 py-3 text-center">Absent</th><th class="px-4 py-3 text-right">Percentage</th><th class="px-4 py-3 text-right">State</th></tr></thead>
          <tbody class="divide-y divide-paper-200 bg-white">
            {#each rows as row, index (row.enrollment.id)}
              <tr class="transition hover:bg-register-50/40">
                <td class="px-4 py-3 font-display text-lg font-semibold">{row.enrollment.rollNumber}</td>
                <td class="px-4 py-3"><p class="font-bold text-ink-950">{row.student.name}</p><p class="mt-0.5 text-[10px] font-semibold text-ink-600">{row.student.admissionNumber}</p></td>
                <td class="px-3 py-2.5"><input data-desktop-marks-index={index} aria-label={`Marks for ${row.student.name}`} type="number" inputmode="decimal" min="0" max={test.totalMarks} step="0.01" disabled={row.result?.status === 'absent'} value={row.result?.status === 'marks' ? row.result.marks : ''} onchange={(event) => saveMarks(row, event)} onkeydown={(event) => focusNextMarks(index, event)} class="min-h-11 w-28 rounded-xl border border-paper-200 bg-paper-50 px-3 text-sm font-bold outline-none transition focus:border-register-600 focus:bg-white focus:ring-4 focus:ring-register-100 disabled:bg-paper-100 disabled:text-ink-600" /></td>
                <td class="px-3 py-2.5 text-center"><button aria-label={`${row.result?.status === 'absent' ? 'Clear absence for' : 'Mark absent'} ${row.student.name}`} aria-pressed={row.result?.status === 'absent'} onclick={() => toggleAbsent(row)} class={`min-h-10 rounded-xl border px-3 text-xs font-extrabold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-register-600 ${row.result?.status === 'absent' ? 'border-red-700 bg-red-700 text-white' : 'border-paper-200 bg-white text-ink-600 hover:border-red-200 hover:bg-red-50 hover:text-red-800'}`}>Absent</button></td>
                <td class="px-4 py-3 text-right font-bold text-ink-800">{row.result?.status === 'marks' ? `${marksPercentage(row.result.marks ?? 0, test.totalMarks).toFixed(2)}%` : '—'}</td>
                <td class="px-4 py-3 text-right"><Badge tone={row.result?.status === 'marks' ? 'success' : row.result?.status === 'absent' ? 'danger' : 'neutral'}>{row.result?.status === 'marks' ? 'Marks' : row.result?.status === 'absent' ? 'Absent' : 'Not Entered'}</Badge></td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </Card>

    <div class="mt-5 flex flex-col-reverse gap-2 border-t border-paper-200 pt-5 sm:flex-row sm:items-center sm:justify-between"><Button variant="ghost" size="sm" class="text-red-700 hover:bg-red-50 hover:text-red-800" onclick={deleteTest}><Trash size={16} weight="bold" /> Delete Test</Button><p class="text-[10px] font-semibold text-ink-600">Results save automatically to this device.</p></div>
  </div>
</main>

<Modal bind:open={editOpen} title="Edit Test" description={hasResults ? 'Class Group and date are locked because result entry has begun.' : 'Changing Class Group or date will rebuild the roster.'}>
  <form class="grid gap-4" onsubmit={saveEdit}>
    <TextField label="Test Name" bind:value={editName} required />
    <SelectField label="Subject" bind:value={editSubjectId} options={subjectOptions} />
    <SelectField label="Class & section" bind:value={editClassGroupId} options={classOptions} disabled={hasResults} />
    <div class="grid grid-cols-2 gap-3"><TextField label="Test date" bind:value={editDate} type="date" required disabled={hasResults} /><TextField label="Total Marks" bind:value={editTotalMarks} type="number" min="0.01" step="0.01" required /></div>
    {#if editError}<p class="rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-800">{editError}</p>{/if}
    <Button type="submit" class="w-full">Save changes</Button>
  </form>
</Modal>

<Modal bind:open={rosterOpen} title="Correct Test Roster" description="Add a Class Group Enrollment, or remove a Student whose result is still Not Entered." size="lg">
  <div class="space-y-5">
    <section><h3 class="text-xs font-extrabold uppercase tracking-[0.08em] text-ink-600">Current Test Roster · {rows.length}</h3><div class="mt-2 divide-y divide-paper-200 overflow-hidden rounded-2xl border border-paper-200 bg-white">{#each rows as row (row.enrollment.id)}<div class="flex items-center gap-3 px-3 py-2.5"><div class="grid size-9 shrink-0 place-items-center rounded-xl bg-paper-100 font-display font-semibold">{row.enrollment.rollNumber}</div><div class="min-w-0 flex-1"><p class="truncate text-sm font-bold">{row.student.name}</p><p class="text-[10px] font-semibold text-ink-600">{row.result ? 'Recorded result' : 'Not Entered'}</p></div><Button variant="ghost" size="sm" disabled={Boolean(row.result)} title={row.result ? 'Clear the result before removing this Student' : 'Remove from Test Roster'} onclick={() => removeRosterMember(row)}><Trash size={15} /></Button></div>{/each}</div></section>
    <section><h3 class="text-xs font-extrabold uppercase tracking-[0.08em] text-ink-600">Available Class Group Enrollments</h3><div class="mt-2 divide-y divide-paper-200 overflow-hidden rounded-2xl border border-paper-200 bg-white">{#each rosterCandidates as row (row.enrollment.id)}<div class="flex items-center gap-3 px-3 py-2.5"><div class="grid size-9 shrink-0 place-items-center rounded-xl bg-register-50 font-display font-semibold text-register-800">{row.enrollment.rollNumber}</div><div class="min-w-0 flex-1"><p class="truncate text-sm font-bold">{row.student.name}</p><p class="text-[10px] font-semibold text-ink-600">{row.student.admissionNumber}</p></div><Button variant="soft" size="sm" onclick={() => addRosterMember(row.enrollment.id)}><UserPlus size={15} /> Add</Button></div>{:else}<p class="px-4 py-8 text-center text-xs font-semibold text-ink-600">Every Class Group Enrollment is already on this Test Roster.</p>{/each}</div></section>
  </div>
</Modal>
