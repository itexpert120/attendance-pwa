<script lang="ts">
  import ArrowDown from 'phosphor-svelte/lib/ArrowDown'
  import ArrowUp from 'phosphor-svelte/lib/ArrowUp'
  import ArrowCounterClockwise from 'phosphor-svelte/lib/ArrowCounterClockwise'
  import Archive from 'phosphor-svelte/lib/Archive'
  import BookOpen from 'phosphor-svelte/lib/BookOpen'
  import Camera from 'phosphor-svelte/lib/Camera'
  import Check from 'phosphor-svelte/lib/Check'
  import FloppyDisk from 'phosphor-svelte/lib/FloppyDisk'
  import NotePencil from 'phosphor-svelte/lib/NotePencil'
  import Notebook from 'phosphor-svelte/lib/Notebook'
  import Plus from 'phosphor-svelte/lib/Plus'
  import Printer from 'phosphor-svelte/lib/Printer'
  import Trash from 'phosphor-svelte/lib/Trash'
  import { tick } from 'svelte'
  import type { AttendanceState } from '../app-state.svelte'
  import { dateKey } from '../calculations'
  import { printDocument } from '../print'
  import type { DailyHomeworkReport } from '../types'
  import type { Subject } from '../types'
  import HomeworkPhotoPicker from './HomeworkPhotoPicker.svelte'
  import PrintHomeworkReport from './PrintHomeworkReport.svelte'
  import { goBack, navigate, paths } from '../navigation'
  import BarButton from './ui/BarButton.svelte'
  import Button from './ui/Button.svelte'
  import Card from './ui/Card.svelte'
  import EmptyState from './ui/EmptyState.svelte'
  import Fab from './ui/Fab.svelte'
  import ListGroup from './ui/ListGroup.svelte'
  import ListRow from './ui/ListRow.svelte'
  import Modal from './ui/Modal.svelte'
  import Screen from './ui/Screen.svelte'
  import Segmented from './ui/Segmented.svelte'
  import SelectField from './ui/SelectField.svelte'
  import SubjectForm from './SubjectForm.svelte'
  import TextareaField from './ui/TextareaField.svelte'
  import TextField from './ui/TextField.svelte'

  let {
    state: appState,
    editor,
    report: editingReport,
  }: {
    state: AttendanceState
    /** Set on the /homework/new and /homework/:id/edit routes. */
    editor?: 'new' | 'edit'
    report?: DailyHomeworkReport
  } = $props()

  type DraftItem = { key: string; subjectId: string; details: string }

  const currentDate = new Date()
  const today = dateKey(
    currentDate.getFullYear(),
    currentDate.getMonth() + 1,
    currentDate.getDate(),
  )
  const defaultParentNote =
    'Please check that the homework has been completed and sign the diary.'

  let editingId = $state<string | null>(null)
  let reportClassGroupId = $state('')
  let reportDate = $state(today)
  let inchargeName = $state('')
  let parentNote = $state(defaultParentNote)
  let draftPhoto = $state('')
  let entryMode = $state<'typed' | 'photo'>('typed')
  let draftItems = $state<DraftItem[]>([])
  let formError = $state('')
  let saving = $state(false)
  let printReportId = $state<string | null>(null)
  let classFilter = $state('')
  let dateFilter = $state('')
  let itemSequence = 0
  let subjectsOpen = $state(false)
  let newSubjectName = $state('')
  let editingSubjectId = $state<string | null>(null)
  let editingSubjectName = $state('')
  let subjectError = $state('')
  let actionReport = $state<DailyHomeworkReport | null>(null)
  let subjectFormOpen = $state(false)

  let activeSubjects = $derived(appState.subjects.filter((subject) => !subject.archivedAt))
  let classOptions = $derived(
    appState.classGroups.map((group) => ({
      value: group.id,
      label: `${group.className} · Section ${group.section}`,
    })),
  )
  let filterClassOptions = $derived([
    { value: '', label: 'All Class Groups' },
    ...classOptions,
  ])
  let filteredReports = $derived(
    appState.dailyHomeworkReports.filter(
      (report) =>
        (!classFilter || report.classGroupId === classFilter) &&
        (!dateFilter || report.date === dateFilter),
    ),
  )
  let printReport = $derived(
    appState.dailyHomeworkReports.find((report) => report.id === printReportId) ?? null,
  )

  function nextItemKey() {
    itemSequence += 1
    return `homework-item-${itemSequence}`
  }

  function firstUnusedSubjectId() {
    const used = new Set(draftItems.map((item) => item.subjectId))
    return activeSubjects.find((subject) => !used.has(subject.id))?.id ?? ''
  }

  function subjectOptionsFor(item: DraftItem) {
    return appState.subjects
      .filter((subject) => !subject.archivedAt || subject.id === item.subjectId)
      .map((subject) => ({
        value: subject.id,
        label: `${subject.name}${subject.archivedAt ? ' · Archived' : ''}`,
      }))
  }

  function beginCreate() {
    editingId = null
    reportClassGroupId = appState.classGroups[0]?.id ?? ''
    reportDate = today
    inchargeName = appState.settings?.classInchargeName ?? ''
    parentNote = defaultParentNote
    draftPhoto = ''
    entryMode = 'typed'
    draftItems = activeSubjects[0]
      ? [{ key: nextItemKey(), subjectId: activeSubjects[0].id, details: '' }]
      : []
    formError = ''
  }

  function beginEdit(report: DailyHomeworkReport) {
    editingId = report.id
    reportClassGroupId = report.classGroupId
    reportDate = report.date
    inchargeName = report.inchargeName
    parentNote = report.parentNote
    draftPhoto = report.photoDataUrl ?? ''
    entryMode = report.photoDataUrl ? 'photo' : 'typed'
    draftItems = [...report.items]
      .sort((a, b) => a.order - b.order)
      .map((item) => ({ ...item, key: nextItemKey() }))
    formError = ''
  }

  // The editor routes start from a blank or saved report once, on open.
  let initializedEditor = false
  $effect(() => {
    if (initializedEditor || !editor) return
    initializedEditor = true
    if (editor === 'edit' && editingReport) beginEdit(editingReport)
    else beginCreate()
  })

  /** Runs a report action after closing the action sheet (which clears `actionReport`). */
  function act(action: (report: DailyHomeworkReport) => unknown) {
    const report = actionReport
    actionReport = null
    if (report) void action(report)
  }

  function addItem() {
    draftItems = [
      ...draftItems,
      { key: nextItemKey(), subjectId: firstUnusedSubjectId(), details: '' },
    ]
  }

  async function createSubject() {
    subjectError = ''
    try {
      const subject = await appState.saveSubject(newSubjectName)
      if (!draftItems.some((item) => item.subjectId === subject.id)) {
        draftItems = [
          ...draftItems,
          { key: nextItemKey(), subjectId: subject.id, details: '' },
        ]
      }
      newSubjectName = ''
    } catch (caught) {
      subjectError = caught instanceof Error ? caught.message : 'Could not create this Subject.'
    }
  }

  function renameSubjectOnEnter(event: KeyboardEvent) {
    if (event.key !== 'Enter') return
    event.preventDefault()
    void renameSubject()
  }

  function beginSubjectRename(subject: Subject) {
    editingSubjectId = subject.id
    editingSubjectName = subject.name
    subjectError = ''
  }

  async function renameSubject() {
    if (!editingSubjectId) return
    subjectError = ''
    try {
      await appState.renameSubject(editingSubjectId, editingSubjectName)
      editingSubjectId = null
      editingSubjectName = ''
    } catch (caught) {
      subjectError = caught instanceof Error ? caught.message : 'Could not rename this Subject.'
    }
  }

  async function toggleSubjectArchive(subject: Subject) {
    subjectError = ''
    try {
      if (subject.archivedAt) await appState.restoreSubject(subject.id)
      else await appState.archiveSubject(subject.id)
    } catch (caught) {
      subjectError = caught instanceof Error ? caught.message : 'Could not update this Subject.'
    }
  }

  function removeItem(index: number) {
    draftItems = draftItems.filter((_, itemIndex) => itemIndex !== index)
  }

  function moveItem(index: number, direction: -1 | 1) {
    const target = index + direction
    if (target < 0 || target >= draftItems.length) return
    const reordered = [...draftItems]
    const current = reordered[index]
    const replacement = reordered[target]
    if (!current || !replacement) return
    reordered[index] = replacement
    reordered[target] = current
    draftItems = reordered
  }

  function setEntryMode(mode: 'typed' | 'photo') {
    if (mode === entryMode) return
    entryMode = mode
    if (mode === 'photo') {
      draftItems = []
      return
    }
    draftPhoto = ''
    if (!draftItems.length && activeSubjects[0]) {
      draftItems = [{ key: nextItemKey(), subjectId: activeSubjects[0].id, details: '' }]
    }
  }

  async function saveReport(printAfter = false) {
    if (saving) return
    saving = true
    formError = ''
    try {
      const input = {
        classGroupId: reportClassGroupId,
        date: reportDate,
        inchargeName,
        parentNote,
        items:
          entryMode === 'typed'
            ? draftItems.map((item) => ({
                subjectId: item.subjectId,
                details: item.details,
              }))
            : [],
        photoDataUrl: entryMode === 'photo' ? draftPhoto : undefined,
      }
      const saved = editingId
        ? await appState.updateDailyHomeworkReport(editingId, input)
        : await appState.createDailyHomeworkReport(input)
      if (printAfter) await openPrint(saved)
      goBack(paths.homework())
    } catch (caught) {
      formError =
        caught instanceof Error ? caught.message : 'Could not save this Daily Homework Report.'
    } finally {
      saving = false
    }
  }

  async function submitReport(event: SubmitEvent) {
    event.preventDefault()
    await saveReport()
  }

  async function openPrint(report: DailyHomeworkReport) {
    printReportId = report.id
    await tick()
    await printDocument()
    printReportId = null
  }

  async function deleteReport(report: DailyHomeworkReport) {
    const group = groupLabel(report)
    if (
      !window.confirm(
        `Delete the Daily Homework Report for Class ${group} on ${dateLabel(report.date)}? This cannot be undone.`,
      )
    ) {
      return
    }
    await appState.deleteDailyHomeworkReport(report.id)
  }

  function groupLabel(report: DailyHomeworkReport) {
    const group = appState.classGroups.find((item) => item.id === report.classGroupId)
    return group ? `${group.className} · ${group.section}` : 'Class Group'
  }

  function subjectName(subjectId: string) {
    return appState.subjects.find((subject) => subject.id === subjectId)?.name ?? 'Subject'
  }

  function dateLabel(value: string) {
    return new Intl.DateTimeFormat('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(new Date(`${value}T00:00:00`))
  }
</script>

{#if editor}
<Screen title={editingId ? 'Edit homework' : 'New homework'} subtitle="Daily diary for parents" back={paths.homework()} backLabel="Cancel" width="lg">
  {#snippet actions()}
    <BarButton label="Manage Subjects" onclick={() => { subjectError = ''; subjectsOpen = true }}><BookOpen /></BarButton>
  {/snippet}
    <form onsubmit={submitReport} class="space-y-6">
      <Card class="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3">
        <SelectField label="Class & section" bind:value={reportClassGroupId} options={classOptions} />
        <TextField label="Report date" bind:value={reportDate} type="date" required />
        <TextField label="Class incharge" bind:value={inchargeName} placeholder="Name shown on the report" required />
      </Card>

      <section class="space-y-3">
        <h2 class="type-title-small flex min-h-10 items-center px-4 text-primary">Homework</h2>
        <Segmented label="Homework entry" bind:value={() => entryMode, setEntryMode} options={[{ value: 'typed' as const, label: 'Type subjects', icon: Notebook }, { value: 'photo' as const, label: 'Diary photo', icon: Camera }]} />
        {#if entryMode === 'photo'}
          <Card class="p-4"><HomeworkPhotoPicker bind:value={draftPhoto} /></Card>
        {:else}
          {#each draftItems as item, index (item.key)}
            <Card class="p-4">
              <div class="flex items-end gap-2">
                <span class="type-title-medium mb-3 grid size-8 shrink-0 place-items-center rounded-full bg-secondary-container text-on-secondary-container">{index + 1}</span>
                <SelectField class="min-w-0 flex-1" label="Subject" bind:value={item.subjectId} options={subjectOptionsFor(item)} />
              </div>
              <div class="mt-3">
                <TextareaField label="Homework" bind:value={item.details} rows={3} maxlength={1200} placeholder="What should students complete? One instruction per line." required />
              </div>
              <div class="-mb-2 mt-1 flex items-center justify-end">
                <BarButton label="Move up" disabled={index === 0} onclick={() => moveItem(index, -1)}><ArrowUp /></BarButton>
                <BarButton label="Move down" disabled={index === draftItems.length - 1} onclick={() => moveItem(index, 1)}><ArrowDown /></BarButton>
                <BarButton label="Remove Subject" onclick={() => removeItem(index)}><Trash /></BarButton>
              </div>
            </Card>
          {/each}
          {#if activeSubjects.length}
            <Button variant="outlined" class="w-full" disabled={!firstUnusedSubjectId()} onclick={addItem}><Plus size={18} /> {draftItems.length ? 'Add another Subject' : 'Add a Subject'}</Button>
            {#if !firstUnusedSubjectId()}<p class="type-body-small px-4 text-on-surface-variant">Every active Subject is already on this diary. <button type="button" class="font-medium text-primary" onclick={() => (subjectFormOpen = true)}>Create a new Subject</button></p>{/if}
          {:else}
            <Card>
              <EmptyState icon={BookOpen} title="No Subjects yet" text="Subjects are shared by Tests and homework across every class.">
                <Button onclick={() => (subjectFormOpen = true)}><Plus size={18} /> New Subject</Button>
              </EmptyState>
            </Card>
          {/if}
        {/if}
      </section>

      <Card class="p-4">
        <TextareaField label="Note for parents" bind:value={parentNote} rows={3} maxlength={600} placeholder="Message printed below the homework." help="Printed at the end of the PDF." required />
      </Card>

      {#if formError}
        <p role="alert" class="type-body-medium rounded-xl bg-error-container px-4 py-3 text-on-error-container">
          {formError}
        </p>
      {/if}

      <div class="kb-hide sticky bottom-0 z-20 -mx-4 grid grid-cols-2 gap-2 border-t border-outline-variant bg-surface-container-lowest px-4 pb-[calc(var(--safe-bottom)+0.75rem)] pt-3 sm:static sm:mx-0 sm:flex sm:justify-end sm:border-0 sm:bg-transparent sm:px-0">
        <Button type="submit" variant="secondary" disabled={saving}>
          <FloppyDisk size={18} /> {saving ? 'Saving…' : 'Save'}
        </Button>
        <Button type="button" disabled={saving} onclick={() => void saveReport(true)}>
          <Printer size={18} /> Save & PDF
        </Button>
      </div>
    </form>
</Screen>
{:else}
<Screen title="Homework" subtitle="Class diaries and PDF reports">
  {#snippet actions()}
    <BarButton label="Manage Subjects" onclick={() => { subjectError = ''; subjectsOpen = true }}><BookOpen /></BarButton>
  {/snippet}

  <div class="space-y-6">
    <div class="grid grid-cols-2 gap-2">
      <SelectField label="Class Group" bind:value={classFilter} options={filterClassOptions} />
      <TextField label="Date" bind:value={dateFilter} type="date" />
    </div>

    {#if filteredReports.length}
      <ListGroup header={`${filteredReports.length} saved report${filteredReports.length === 1 ? '' : 's'}`} footer="Newest date first. Tap a report to edit, share as PDF or delete it.">
        {#each filteredReports as report (report.id)}
          <ListRow
            label={`Class ${groupLabel(report)} · ${dateLabel(report.date)}`}
            detail={report.photoDataUrl ? 'Photographed diary' : report.items.map((item) => subjectName(item.subjectId)).join(' · ')}
            onclick={() => (actionReport = report)}
          >
            {#snippet leading()}
              <span class="grid size-11 shrink-0 place-items-center overflow-hidden rounded-2xl bg-teal-100 text-teal-700">
                {#if report.photoDataUrl}<img src={report.photoDataUrl} alt="" class="size-full object-cover" />{:else}<Notebook size={22} weight="duotone" />{/if}
              </span>
            {/snippet}
          </ListRow>
        {/each}
      </ListGroup>
    {:else}
      <div class="rounded-2xl bg-surface-container-lowest">
        <EmptyState icon={Notebook} title="No homework reports" text="Clear the filters or create today’s diary.">
          <Button onclick={() => navigate(paths.homeworkNew())}><Plus size={17} weight="bold" /> New report</Button>
        </EmptyState>
      </div>
    {/if}
  </div>
</Screen>

<Fab icon={Plus} text="New report" label="New homework report" onclick={() => navigate(paths.homeworkNew())} />
{/if}

<Modal open={actionReport !== null} title={actionReport ? `Class ${groupLabel(actionReport)}` : 'Homework report'} description={actionReport ? `${dateLabel(actionReport.date)} · Incharge: ${actionReport.inchargeName}` : undefined} size="sm">
  {#if actionReport}
    <ListGroup muted>
      <ListRow icon={NotePencil} tone="blue" label="Edit report" onclick={() => act((report) => navigate(paths.homeworkEdit(report.id)))} />
      <ListRow icon={Printer} tone="green" label="Create PDF" detail="Print or save to share with parents" onclick={() => act(openPrint)} />
      <ListRow icon={Trash} tone="red" label="Delete report" destructive onclick={() => act(deleteReport)} />
    </ListGroup>
  {/if}
</Modal>

<SubjectForm state={appState} bind:open={subjectFormOpen} oncreated={(id) => {
  if (entryMode === 'typed' && !draftItems.some((item) => item.subjectId === id)) draftItems = [...draftItems, { key: nextItemKey(), subjectId: id, details: '' }]
}} />

<Modal bind:open={subjectsOpen} title="Manage Subjects" description="Add a Subject and it becomes a new homework row immediately. Renames update every Test and report." size="lg">
  <form class="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-end" onsubmit={(event) => { event.preventDefault(); void createSubject() }}>
    <TextField label="New Subject" bind:value={newSubjectName} placeholder="e.g. Computer Science" required />
    <Button type="submit"><Plus size={16} weight="bold" /> Add & use</Button>
  </form>
  {#if subjectError}<p role="alert" class="mt-3 rounded-2xl bg-error-container px-4 py-3 text-[13px] font-medium text-on-error-container">{subjectError}</p>{/if}
  <div class="mt-5 max-h-[55svh] divide-y divide-outline-variant overflow-y-auto rounded-2xl border border-outline-variant bg-surface-container-lowest">
    {#each appState.subjects as subject (subject.id)}
      <div class="flex items-center gap-2 px-3 py-2.5 sm:px-4">
        <div class={`grid size-9 shrink-0 place-items-center rounded-xl ${subject.archivedAt ? 'bg-surface-container text-on-surface-variant' : 'bg-primary-container/40 text-on-primary-container'}`}><BookOpen size={17} weight="bold" /></div>
        {#if editingSubjectId === subject.id}
          <input bind:value={editingSubjectName} aria-label={`Rename ${subject.name}`} onkeydown={renameSubjectOnEnter} class="min-h-10 min-w-0 flex-1 rounded-xl border border-primary bg-surface-container-lowest px-3 text-sm font-medium outline-none ring-4 ring-primary/20" />
          <Button type="button" size="sm" onclick={() => void renameSubject()}><Check size={15} weight="bold" /> Save</Button>
        {:else}
          <div class="min-w-0 flex-1">
            <p class="truncate text-sm font-medium">{subject.name}</p>
            <p class="mt-0.5 type-label-medium text-on-surface-variant">{subject.archivedAt ? 'Archived' : 'Active'} · {appState.dailyHomeworkReports.filter((report) => report.items.some((item) => item.subjectId === subject.id)).length} homework report(s)</p>
          </div>
          <Button type="button" variant="ghost" size="icon" title={`Rename ${subject.name}`} onclick={() => beginSubjectRename(subject)}><NotePencil size={15} /></Button>
          <Button
            type="button"
            variant={subject.archivedAt ? 'soft' : 'ghost'}
            size="icon"
            title={subject.archivedAt ? `Restore ${subject.name}` : `Archive ${subject.name}`}
            disabled={!subject.archivedAt && draftItems.some((item) => item.subjectId === subject.id)}
            onclick={() => void toggleSubjectArchive(subject)}
          >{#if subject.archivedAt}<ArrowCounterClockwise size={15} weight="bold" />{:else}<Archive size={15} />{/if}</Button>
        {/if}
      </div>
    {:else}
      <p class="px-4 py-10 text-center text-sm font-medium text-on-surface-variant">No Subjects yet. Add the first one above.</p>
    {/each}
  </div>
</Modal>

{#if printReport}
  <PrintHomeworkReport state={appState} report={printReport} />
{/if}
