<script lang="ts">
  import DotsThreeVertical from 'phosphor-svelte/lib/DotsThreeVertical'
  import ArrowsClockwise from 'phosphor-svelte/lib/ArrowsClockwise'
  import NotePencil from 'phosphor-svelte/lib/NotePencil'
  import Printer from 'phosphor-svelte/lib/Printer'
  import Trash from 'phosphor-svelte/lib/Trash'
  import UserPlus from 'phosphor-svelte/lib/UserPlus'
  import Users from 'phosphor-svelte/lib/Users'
  import { tick } from 'svelte'
  import type { AttendanceState } from '../app-state.svelte'
  import { goBack, paths } from '../navigation'
  import { printDocument } from '../print'
  import PrintTestReport from './PrintTestReport.svelte'
  import { marksPercentage, rowsForClass } from '../calculations'
  import type { TestRecord, TestRosterRow } from '../types'
  import Badge from './ui/Badge.svelte'
  import BarButton from './ui/BarButton.svelte'
  import Button from './ui/Button.svelte'
  import Card from './ui/Card.svelte'
  import ListGroup from './ui/ListGroup.svelte'
  import ListRow from './ui/ListRow.svelte'
  import Modal from './ui/Modal.svelte'
  import Screen from './ui/Screen.svelte'
  import SelectField from './ui/SelectField.svelte'
  import TextField from './ui/TextField.svelte'

  let {
    state: appState,
    test,
  }: {
    state: AttendanceState
    test: TestRecord
  } = $props()

  let printing = $state(false)

  async function onprint() {
    printing = true
    await tick()
    await printDocument()
    printing = false
  }

  let editOpen = $state(false)
  let rosterOpen = $state(false)
  let actionsOpen = $state(false)
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
    goBack(paths.tests())
  }
</script>

<Screen title={test.name} subtitle={`${subject?.name ?? 'Subject'} · Class ${group?.className ?? ''} ${group?.section ?? ''}`} back={paths.tests()} backLabel="Back to Tests" width="lg">
  {#snippet actions()}
    <div class="hidden items-center gap-2 sm:flex"><Button variant="secondary" size="sm" onclick={openEdit}><NotePencil size={16} weight="bold" /> Edit</Button><Button size="sm" onclick={() => onprint()}><Printer size={16} weight="bold" /> Print report</Button></div>
    <BarButton label="Test actions" class="sm:hidden" onclick={() => (actionsOpen = true)}><DotsThreeVertical weight="bold" /></BarButton>
  {/snippet}

  <div class="space-y-6">
    <section class="rounded-2xl bg-surface-container-lowest p-4">
      <div class="flex items-start justify-between gap-3">
        <div class="min-w-0">
          <p class="text-[13px] font-medium text-on-surface-variant">{dateLabel(test.date)} · {test.totalMarks} marks</p>
          <p class="mt-2 text-[34px] font-medium leading-none text-on-surface">{summary?.average == null ? '—' : summary.average.toFixed(2)}</p>
          <p class="mt-1 text-[13px] font-medium text-on-surface-variant">Class average</p>
        </div>
        <Badge tone={progressTone(summary?.progress)}>{progressLabel(summary?.progress)}</Badge>
      </div>
      <div class="mt-4 grid grid-cols-4 gap-2 text-center">
        {#each [
          { label: 'Students', value: rows.length, tint: 'bg-surface-container-high text-on-surface' },
          { label: 'Entered', value: summary?.numericCount ?? 0, tint: 'bg-primary-container/40 text-on-primary-container' },
          { label: 'Absent', value: summary?.absentCount ?? 0, tint: 'bg-error-container text-on-error-container' },
          { label: 'Pending', value: summary?.notEnteredCount ?? 0, tint: 'bg-warning-container text-on-warning-container' },
        ] as stat (stat.label)}
          <div class={`rounded-2xl px-1 py-2.5 ${stat.tint}`}><p class="text-[18px] font-medium leading-none">{stat.value}</p><p class="mt-1 text-[12px] font-medium opacity-75">{stat.label}</p></div>
        {/each}
      </div>
    </section>

    <section>
      <div class="flex items-end justify-between gap-3 px-4 pb-2">
        <h2 class="text-[13px] font-medium text-on-surface-variant">Results</h2>
        <div class="hidden items-center gap-2 sm:flex"><Button variant="ghost" size="sm" disabled={hasResults} title={hasResults ? 'Roster refresh locks after result entry begins' : 'Refresh from current Enrollments'} onclick={refreshRoster}><ArrowsClockwise size={16} weight="bold" /> Refresh roster</Button><Button variant="secondary" size="sm" onclick={() => (rosterOpen = true)}><Users size={16} weight="bold" /> Correct roster</Button></div>
      </div>
      {#if entryError}<p class="mb-3 rounded-2xl bg-error-container px-4 py-3 text-[13px] font-medium text-on-error-container">{entryError}</p>{/if}
      <div class="overflow-hidden rounded-2xl bg-surface-container-lowest sm:hidden [&>*+*]:border-t [&>*+*]:border-outline-variant">
        {#each rows as row, index (row.enrollment.id)}
          <article class="flex items-center gap-3 py-2.5 pl-3 pr-2.5">
            <span class="grid size-10 shrink-0 place-items-center rounded-full bg-surface-container-high text-[13px] font-medium text-on-surface">{row.enrollment.rollNumber}</span>
            <div class="min-w-0 flex-1">
              <p class="truncate text-[15px] font-medium text-on-surface">{row.student.name}</p>
              <p class="mt-0.5 truncate text-[12px] text-on-surface-variant">{row.result?.status === 'marks' ? `${marksPercentage(row.result.marks ?? 0, test.totalMarks).toFixed(1)}%` : row.result?.status === 'absent' ? 'Absent' : 'Not entered'} · {row.student.admissionNumber}</p>
            </div>
            <input data-mobile-marks-index={index} aria-label={`Marks for ${row.student.name}`} type="number" inputmode="decimal" enterkeyhint="next" min="0" max={test.totalMarks} step="0.01" placeholder="–" disabled={row.result?.status === 'absent'} value={row.result?.status === 'marks' ? row.result.marks : ''} onchange={(event) => saveMarks(row, event)} onkeydown={(event) => focusNextMarks(index, event)} class="h-12 w-18 shrink-0 rounded-2xl border border-transparent bg-surface-container-high px-2 text-center text-[17px] font-medium tabular-nums outline-none transition placeholder:text-on-surface-variant/50 focus:border-primary focus:bg-surface-container-lowest focus:ring-4 focus:ring-primary/20 disabled:opacity-40" />
            <button aria-label={`${row.result?.status === 'absent' ? 'Clear absence for' : 'Mark absent'} ${row.student.name}`} aria-pressed={row.result?.status === 'absent'} onclick={() => toggleAbsent(row)} class={`grid size-12 shrink-0 place-items-center rounded-2xl text-[15px] font-medium transition active:scale-90 ${row.result?.status === 'absent' ? 'bg-error text-on-error' : 'bg-surface-container-high text-on-surface-variant'}`}>A</button>
          </article>
        {/each}
      </div>
      <p class="px-4 pt-2 text-[12px] leading-snug text-on-surface-variant sm:hidden">Blank is Not Entered and zero is a recorded result. Tap A to mark a Student absent.</p>
      <Card class="hidden overflow-hidden sm:block">
        <p class="border-b border-outline-variant px-4 py-3 text-[12px] text-on-surface-variant">Blank is Not Entered. Zero is a recorded result. Press Enter to move to the next Student.</p>
        <div class="overflow-x-auto">
        <table class="w-full min-w-190 text-sm">
          <thead class="bg-surface-container type-label-medium text-on-surface-variant"><tr><th class="px-4 py-3 text-left">Roll</th><th class="px-4 py-3 text-left">Student</th><th class="px-3 py-3 text-left">Marks</th><th class="px-3 py-3 text-center">Absent</th><th class="px-4 py-3 text-right">Percentage</th><th class="px-4 py-3 text-right">State</th></tr></thead>
          <tbody class="divide-y divide-outline-variant bg-surface-container-lowest">
            {#each rows as row, index (row.enrollment.id)}
              <tr class="transition hover:bg-primary-container/40">
                <td class="px-4 py-3 text-lg font-medium">{row.enrollment.rollNumber}</td>
                <td class="px-4 py-3"><p class="font-medium text-on-surface">{row.student.name}</p><p class="mt-0.5 type-label-medium text-on-surface-variant">{row.student.admissionNumber}</p></td>
                <td class="px-3 py-2.5"><input data-desktop-marks-index={index} aria-label={`Marks for ${row.student.name}`} type="number" inputmode="decimal" min="0" max={test.totalMarks} step="0.01" disabled={row.result?.status === 'absent'} value={row.result?.status === 'marks' ? row.result.marks : ''} onchange={(event) => saveMarks(row, event)} onkeydown={(event) => focusNextMarks(index, event)} class="min-h-11 w-28 rounded-2xl border border-transparent bg-surface-container-high px-3 text-sm font-medium outline-none transition focus:border-primary focus:bg-surface-container-lowest focus:ring-4 focus:ring-primary/20 disabled:bg-surface-container disabled:text-on-surface-variant" /></td>
                <td class="px-3 py-2.5 text-center"><button aria-label={`${row.result?.status === 'absent' ? 'Clear absence for' : 'Mark absent'} ${row.student.name}`} aria-pressed={row.result?.status === 'absent'} onclick={() => toggleAbsent(row)} class={`min-h-10 rounded-xl border px-3 text-xs font-medium transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${row.result?.status === 'absent' ? 'bg-error text-on-error' : 'border-outline-variant bg-surface-container-lowest text-on-surface-variant hover:border-error/40 hover:bg-error-container hover:text-on-error-container'}`}>Absent</button></td>
                <td class="px-4 py-3 text-right font-medium text-on-surface">{row.result?.status === 'marks' ? `${marksPercentage(row.result.marks ?? 0, test.totalMarks).toFixed(2)}%` : '—'}</td>
                <td class="px-4 py-3 text-right"><Badge tone={row.result?.status === 'marks' ? 'success' : row.result?.status === 'absent' ? 'danger' : 'neutral'}>{row.result?.status === 'marks' ? 'Marks' : row.result?.status === 'absent' ? 'Absent' : 'Not Entered'}</Badge></td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
      </Card>
    </section>

    <div class="flex flex-col items-center gap-2 pt-2">
      <Button variant="ghost" class="text-error" onclick={deleteTest}><Trash size={17} weight="bold" /> Delete Test</Button>
      <p class="text-[12px] text-on-surface-variant">Results save automatically to this device.</p>
    </div>
  </div>
</Screen>

<Modal bind:open={actionsOpen} title={test.name} size="sm">
  <ListGroup muted>
    <ListRow icon={NotePencil} tone="blue" label="Edit Test" onclick={() => { actionsOpen = false; openEdit() }} />
    <ListRow icon={Printer} tone="green" label="Print report" onclick={() => { actionsOpen = false; onprint() }} />
    <ListRow icon={Users} tone="purple" label="Correct roster" onclick={() => { actionsOpen = false; rosterOpen = true }} />
    <ListRow icon={ArrowsClockwise} tone="gray" label="Refresh roster" detail={hasResults ? 'Locked after result entry begins' : 'Rebuild from current Enrollments'} disabled={hasResults} onclick={() => { actionsOpen = false; void refreshRoster() }} />
  </ListGroup>
</Modal>

<Modal bind:open={editOpen} title="Edit Test" description={hasResults ? 'Class Group and date are locked because result entry has begun.' : 'Changing Class Group or date will rebuild the roster.'}>
  <form class="grid gap-4" onsubmit={saveEdit}>
    <TextField label="Test Name" bind:value={editName} required />
    <SelectField label="Subject" bind:value={editSubjectId} options={subjectOptions} />
    <SelectField label="Class & section" bind:value={editClassGroupId} options={classOptions} disabled={hasResults} />
    <div class="grid grid-cols-2 gap-3"><TextField label="Test date" bind:value={editDate} type="date" required disabled={hasResults} /><TextField label="Total Marks" bind:value={editTotalMarks} type="number" min="0.01" step="0.01" required /></div>
    {#if editError}<p class="rounded-2xl bg-error-container px-4 py-3 text-[13px] font-medium text-on-error-container">{editError}</p>{/if}
    <Button type="submit" class="w-full">Save changes</Button>
  </form>
</Modal>

<Modal bind:open={rosterOpen} title="Correct Test Roster" description="Add a Class Group Enrollment, or remove a Student whose result is still Not Entered." size="lg">
  <div class="space-y-5">
    <section><h3 class="text-xs font-medium text-on-surface-variant">Current Test Roster · {rows.length}</h3><div class="mt-2 divide-y divide-outline-variant overflow-hidden rounded-2xl border border-outline-variant bg-surface-container-lowest">{#each rows as row (row.enrollment.id)}<div class="flex items-center gap-3 px-3 py-2.5"><div class="grid size-9 shrink-0 place-items-center rounded-2xl bg-surface-container font-medium">{row.enrollment.rollNumber}</div><div class="min-w-0 flex-1"><p class="truncate text-sm font-medium">{row.student.name}</p><p class="type-label-medium text-on-surface-variant">{row.result ? 'Recorded result' : 'Not Entered'}</p></div><Button variant="ghost" size="sm" disabled={Boolean(row.result)} title={row.result ? 'Clear the result before removing this Student' : 'Remove from Test Roster'} onclick={() => removeRosterMember(row)}><Trash size={15} /></Button></div>{/each}</div></section>
    <section><h3 class="text-xs font-medium text-on-surface-variant">Available Class Group Enrollments</h3><div class="mt-2 divide-y divide-outline-variant overflow-hidden rounded-2xl border border-outline-variant bg-surface-container-lowest">{#each rosterCandidates as row (row.enrollment.id)}<div class="flex items-center gap-3 px-3 py-2.5"><div class="grid size-9 shrink-0 place-items-center rounded-xl bg-primary-container/40 font-medium text-on-primary-container">{row.enrollment.rollNumber}</div><div class="min-w-0 flex-1"><p class="truncate text-sm font-medium">{row.student.name}</p><p class="type-label-medium text-on-surface-variant">{row.student.admissionNumber}</p></div><Button variant="soft" size="sm" onclick={() => addRosterMember(row.enrollment.id)}><UserPlus size={15} /> Add</Button></div>{:else}<p class="px-4 py-8 text-center text-xs font-medium text-on-surface-variant">Every Class Group Enrollment is already on this Test Roster.</p>{/each}</div></section>
  </div>
</Modal>

{#if printing}<PrintTestReport state={appState} {test} />{/if}
