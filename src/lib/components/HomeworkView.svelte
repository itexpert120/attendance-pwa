<script lang="ts">
  import ArrowDown from 'phosphor-svelte/lib/ArrowDown'
  import ArrowLeft from 'phosphor-svelte/lib/ArrowLeft'
  import ArrowUp from 'phosphor-svelte/lib/ArrowUp'
  import ArrowCounterClockwise from 'phosphor-svelte/lib/ArrowCounterClockwise'
  import Archive from 'phosphor-svelte/lib/Archive'
  import BookOpen from 'phosphor-svelte/lib/BookOpen'
  import CalendarBlank from 'phosphor-svelte/lib/CalendarBlank'
  import Camera from 'phosphor-svelte/lib/Camera'
  import CaretRight from 'phosphor-svelte/lib/CaretRight'
  import Check from 'phosphor-svelte/lib/Check'
  import FloppyDisk from 'phosphor-svelte/lib/FloppyDisk'
  import NotePencil from 'phosphor-svelte/lib/NotePencil'
  import Notebook from 'phosphor-svelte/lib/Notebook'
  import Plus from 'phosphor-svelte/lib/Plus'
  import ImageSquare from 'phosphor-svelte/lib/ImageSquare'
  import Printer from 'phosphor-svelte/lib/Printer'
  import Trash from 'phosphor-svelte/lib/Trash'
  import { tick } from 'svelte'
  import type { AttendanceState } from '../app-state.svelte'
  import { dateKey } from '../calculations'
  import {
    downloadPrintDocumentAsImage,
    homeworkImageFilename,
    printDocument,
  } from '../print'
  import type { DailyHomeworkReport } from '../types'
  import type { Subject } from '../types'
  import HomeworkPhotoPicker from './HomeworkPhotoPicker.svelte'
  import PrintHomeworkReport from './PrintHomeworkReport.svelte'
  import SchoolMark from './SchoolMark.svelte'
  import Badge from './ui/Badge.svelte'
  import Button from './ui/Button.svelte'
  import Card from './ui/Card.svelte'
  import Modal from './ui/Modal.svelte'
  import SelectField from './ui/SelectField.svelte'
  import TextareaField from './ui/TextareaField.svelte'
  import TextField from './ui/TextField.svelte'

  let {
    state: appState,
    onback,
  }: {
    state: AttendanceState
    onback: () => void
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

  let editorOpen = $state(false)
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
  let exporting = $state(false)
  let listError = $state('')
  let printReportId = $state<string | null>(null)
  let classFilter = $state('')
  let dateFilter = $state('')
  let itemSequence = 0
  let subjectsOpen = $state(false)
  let newSubjectName = $state('')
  let editingSubjectId = $state<string | null>(null)
  let editingSubjectName = $state('')
  let subjectError = $state('')

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
    editorOpen = true
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
    editorOpen = true
  }

  function cancelEdit() {
    editorOpen = false
    editingId = null
    formError = ''
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

  async function saveReport(after: 'none' | 'pdf' | 'image' = 'none') {
    if (saving || exporting) return
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
      editorOpen = false
      editingId = null
      if (after === 'pdf') await openPrint(saved)
      if (after === 'image') await openImage(saved)
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

  async function withPrintReport(
    report: DailyHomeworkReport,
    run: () => Promise<void>,
  ) {
    printReportId = report.id
    await tick()
    try {
      await run()
    } finally {
      printReportId = null
    }
  }

  async function openPrint(report: DailyHomeworkReport) {
    exporting = true
    listError = ''
    try {
      await withPrintReport(report, () => printDocument())
    } catch (caught) {
      const message =
        caught instanceof Error ? caught.message : 'Could not create this PDF.'
      if (editorOpen) formError = message
      else listError = message
    } finally {
      exporting = false
    }
  }

  async function openImage(report: DailyHomeworkReport) {
    exporting = true
    listError = ''
    try {
      const group = appState.classGroups.find((item) => item.id === report.classGroupId)
      await withPrintReport(report, () =>
        downloadPrintDocumentAsImage(
          homeworkImageFilename({
            date: report.date,
            className: group?.className,
            section: group?.section,
          }),
        ),
      )
    } catch (caught) {
      const message =
        caught instanceof Error ? caught.message : 'Could not create an image of this report.'
      if (editorOpen) formError = message
      else listError = message
    } finally {
      exporting = false
    }
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

<main class="min-h-svh bg-paper-100 text-ink-950 print:hidden">
  <header class="border-b border-paper-200 bg-white/95 backdrop-blur">
    <div class="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3.5 sm:px-6">
      <Button variant="ghost" size="icon" title="Back to Dashboard" onclick={onback}>
        <ArrowLeft size={19} weight="bold" />
      </Button>
      <div class="hidden sm:block">
        <SchoolMark
          compact
          logoDataUrl={appState.settings?.logoDataUrl}
          alt={`${appState.settings?.schoolName ?? 'School'} logo`}
        />
      </div>
      <div class="min-w-0 flex-1">
        <h1 class="font-display text-xl font-semibold tracking-[-0.025em] sm:text-2xl">
          Daily Homework
        </h1>
        <p class="mt-0.5 hidden text-[10px] font-bold uppercase tracking-[0.11em] text-ink-600 sm:block">
          Class diaries, PDFs, and images
        </p>
      </div>
      {#if !editorOpen}
        <div class="hidden sm:block">
          <Button onclick={beginCreate}><Plus size={17} weight="bold" /> New report</Button>
        </div>
      {/if}
    </div>
  </header>

  <div class="mx-auto max-w-7xl px-4 py-5 sm:px-6 sm:py-8">
    {#if editorOpen}
      <form onsubmit={submitReport}>
        <section class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p class="text-[10px] font-extrabold uppercase tracking-[0.12em] text-register-700">
              {editingId ? 'Edit saved diary' : 'Create class diary'}
            </p>
            <h2 class="mt-1 font-display text-2xl font-semibold tracking-tight sm:text-3xl">
              {editingId ? 'Update homework report' : 'New homework report'}
            </h2>
            <p class="mt-1 text-xs font-medium text-ink-600">
              Type Subject assignments, or attach one photo of the written diary.
            </p>
          </div>
          <Button type="button" variant="ghost" onclick={cancelEdit}>Cancel</Button>
        </section>

        <Card class="mt-5 p-4 sm:p-5">
          <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <SelectField
              label="Class & section"
              bind:value={reportClassGroupId}
              options={classOptions}
            />
            <TextField label="Report date" bind:value={reportDate} type="date" required />
            <TextField
              label="Class incharge"
              bind:value={inchargeName}
              placeholder="Name shown on the report"
              required
            />
          </div>
        </Card>

        <section class="mt-7">
          <div class="mb-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p class="text-[10px] font-extrabold uppercase tracking-[0.1em] text-register-700">
                Diary / Homework
              </p>
              <h2 class="mt-1 font-display text-xl font-semibold">
                {entryMode === 'photo' ? 'Photographed diary' : 'Subject assignments'}
              </h2>
            </div>
            <div class="grid grid-cols-2 gap-2 sm:flex">
              {#if entryMode === 'typed'}
                <Button type="button" variant="soft" size="sm" onclick={() => { subjectError = ''; subjectsOpen = true }}>
                  <BookOpen size={15} weight="bold" /> Manage Subjects
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={!firstUnusedSubjectId()}
                  onclick={addItem}
                >
                  <Plus size={15} weight="bold" /> Add homework row
                </Button>
              {/if}
            </div>
          </div>

          <div class="mb-4 grid grid-cols-2 gap-2 rounded-2xl border border-paper-200 bg-white p-1">
            <Button
              type="button"
              variant={entryMode === 'typed' ? 'primary' : 'ghost'}
              size="sm"
              onclick={() => setEntryMode('typed')}
            >
              <Notebook size={15} weight="bold" /> Type subjects
            </Button>
            <Button
              type="button"
              variant={entryMode === 'photo' ? 'primary' : 'ghost'}
              size="sm"
              onclick={() => setEntryMode('photo')}
            >
              <Camera size={15} weight="bold" /> Attach photo
            </Button>
          </div>

          {#if entryMode === 'photo'}
            <Card class="p-4 sm:p-5">
              <HomeworkPhotoPicker bind:value={draftPhoto} />
            </Card>
          {:else if draftItems.length}
            <Card class="overflow-hidden">
              <div class="grid grid-cols-[8rem_minmax(0,1fr)] bg-register-800 text-white sm:grid-cols-[15rem_minmax(0,1fr)_8rem]">
                <div class="border-r border-white/20 px-3 py-2.5 text-[10px] font-extrabold uppercase tracking-[0.1em] sm:px-4">Subject</div>
                <div class="px-3 py-2.5 text-[10px] font-extrabold uppercase tracking-[0.1em] sm:px-4">Homework / Note</div>
                <div class="hidden border-l border-white/20 px-3 py-2.5 text-center text-[10px] font-extrabold uppercase tracking-[0.1em] sm:block">Order</div>
              </div>
              <div class="divide-y divide-paper-200">
                {#each draftItems as item, index (item.key)}
                  <div class="grid grid-cols-[8rem_minmax(0,1fr)] bg-white sm:grid-cols-[15rem_minmax(0,1fr)_8rem]">
                    <div class="border-r border-paper-200 bg-register-50/60 p-2.5 sm:p-3.5">
                      <div class="mb-2 flex items-center gap-2">
                        <span class="grid size-6 shrink-0 place-items-center rounded-lg bg-register-800 text-[10px] font-extrabold text-white">{index + 1}</span>
                        <span class="truncate text-[9px] font-extrabold uppercase tracking-wide text-register-800">Subject</span>
                      </div>
                      <select
                        bind:value={item.subjectId}
                        aria-label={`Subject for Homework Item ${index + 1}`}
                        required
                        class="min-h-11 w-full rounded-xl border border-paper-200 bg-white px-2 text-xs font-bold text-ink-950 outline-none transition focus:border-register-600 focus:ring-4 focus:ring-register-100"
                      >
                        {#each subjectOptionsFor(item) as option (option.value)}
                          <option value={option.value}>{option.label}</option>
                        {/each}
                      </select>
                    </div>
                    <div class="p-2.5 sm:p-3.5">
                      <textarea
                        bind:value={item.details}
                        aria-label={`Homework details for ${subjectName(item.subjectId)}`}
                        rows={4}
                        maxlength={1200}
                        placeholder="What should Students complete?"
                        required
                        class="min-h-28 w-full resize-y rounded-xl border border-paper-200 bg-paper-50/60 px-3 py-2.5 text-sm font-medium leading-5 text-ink-950 outline-none transition placeholder:text-ink-600/50 focus:border-register-600 focus:bg-white focus:ring-4 focus:ring-register-100"
                      ></textarea>
                      <div class="mt-1.5 flex items-center justify-between gap-2 text-[9px] font-semibold text-ink-600">
                        <span>Use a new line for each instruction.</span>
                        <span class="shrink-0 tabular-nums">{item.details.length}/1200</span>
                      </div>
                    </div>
                    <div class="hidden flex-col items-center justify-center gap-1 border-l border-paper-200 bg-paper-50 p-2 sm:flex">
                      <Button type="button" variant="ghost" size="icon" title="Move Subject up" disabled={index === 0} onclick={() => moveItem(index, -1)}><ArrowUp size={16} weight="bold" /></Button>
                      <Button type="button" variant="ghost" size="icon" title="Move Subject down" disabled={index === draftItems.length - 1} onclick={() => moveItem(index, 1)}><ArrowDown size={16} weight="bold" /></Button>
                      <Button type="button" variant="ghost" size="icon" title="Remove Subject" onclick={() => removeItem(index)}><Trash size={16} /></Button>
                    </div>
                    <div class="col-span-2 flex items-center justify-end gap-1 border-t border-paper-200 bg-paper-50 px-2 py-1.5 sm:hidden">
                      <Button type="button" variant="ghost" size="sm" title="Move Subject up" disabled={index === 0} onclick={() => moveItem(index, -1)}><ArrowUp size={15} weight="bold" /> Up</Button>
                      <Button type="button" variant="ghost" size="sm" title="Move Subject down" disabled={index === draftItems.length - 1} onclick={() => moveItem(index, 1)}><ArrowDown size={15} weight="bold" /> Down</Button>
                      <Button type="button" variant="ghost" size="sm" title="Remove Subject" onclick={() => removeItem(index)}><Trash size={15} /> Remove</Button>
                    </div>
                  </div>
                {/each}
              </div>
            </Card>
          {:else}
            <Card class="grid min-h-44 place-items-center border-dashed p-6 text-center">
              <div>
                <BookOpen size={24} class="mx-auto text-ink-600" />
                <h3 class="mt-3 font-bold">Add a Subject assignment</h3>
                <p class="mt-1 text-xs font-medium text-ink-600">
                  Active Subjects are shared with the Tests feature.
                </p>
                <Button
                  type="button"
                  class="mt-4"
                  disabled={!activeSubjects.length}
                  onclick={addItem}
                ><Plus size={16} /> Add Subject</Button>
              </div>
            </Card>
          {/if}
        </section>

        <Card class="mt-5 p-4 sm:p-5">
          <TextareaField
            label="Note for parents"
            bind:value={parentNote}
            rows={4}
            maxlength={600}
            placeholder="Message printed below the homework."
            help="This note appears at the end of the PDF and image."
            required
          />
        </Card>

        {#if formError}
          <p role="alert" class="mt-4 rounded-xl bg-red-50 px-4 py-3 text-xs font-semibold text-red-800">
            {formError}
          </p>
        {/if}

        <div class="mt-5 grid gap-2 sm:flex sm:justify-end">
          <Button type="submit" variant="secondary" disabled={saving || exporting}>
            <FloppyDisk size={17} weight="bold" /> {saving ? 'Saving…' : 'Save report'}
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={saving || exporting}
            onclick={() => void saveReport('image')}
          >
            <ImageSquare size={17} weight="bold" /> {exporting ? 'Creating…' : 'Save as image'}
          </Button>
          <Button
            type="button"
            disabled={saving || exporting}
            onclick={() => void saveReport('pdf')}
          >
            <Printer size={17} weight="bold" /> Save & create PDF
          </Button>
        </div>
      </form>
    {:else}
      <section class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p class="text-[10px] font-extrabold uppercase tracking-[0.12em] text-register-700">
            School-to-home record
          </p>
          <h2 class="mt-1 font-display text-2xl font-semibold tracking-tight sm:text-3xl">
            Daily homework reports
          </h2>
          <p class="mt-1 text-xs font-medium text-ink-600">
            Save one diary per Class Group and date, ready to print, save as PDF, or save as an image.
          </p>
        </div>
        <Button class="w-full sm:hidden" onclick={beginCreate}>
          <Plus size={17} weight="bold" /> New report
        </Button>
      </section>

      {#if listError}
        <p role="alert" class="mt-4 rounded-xl bg-red-50 px-4 py-3 text-xs font-semibold text-red-800">
          {listError}
        </p>
      {/if}

      <Card class="mt-5 p-4">
        <div class="grid gap-3 sm:grid-cols-2">
          <SelectField
            label="Class Group"
            bind:value={classFilter}
            options={filterClassOptions}
          />
          <TextField label="Report date" bind:value={dateFilter} type="date" />
        </div>
      </Card>

      <section class="mt-7">
        <div class="mb-3 flex items-center justify-between gap-3">
          <div>
            <h2 class="font-display text-xl font-semibold">
              {filteredReports.length} saved report{filteredReports.length === 1 ? '' : 's'}
            </h2>
            <p class="mt-0.5 text-[11px] font-medium text-ink-600">Newest date first</p>
          </div>
          <Notebook size={23} weight="bold" class="text-register-700" />
        </div>

        <div class="grid gap-3 lg:grid-cols-2">
          {#each filteredReports as report (report.id)}
            <Card class="overflow-hidden">
              <div class="flex items-start gap-4 p-4">
                <div class="grid size-14 shrink-0 place-items-center overflow-hidden rounded-2xl border border-register-100 bg-register-50 text-register-800">
                  {#if report.photoDataUrl}
                    <img src={report.photoDataUrl} alt="" class="size-full object-cover" />
                  {:else}
                    <Notebook size={27} weight="duotone" />
                  {/if}
                </div>
                <div class="min-w-0 flex-1">
                  <div class="flex flex-wrap items-center gap-2">
                    <h3 class="font-display text-xl font-semibold">Class {groupLabel(report)}</h3>
                    {#if report.photoDataUrl}
                      <Badge tone="success">Photo diary</Badge>
                    {:else}
                      <Badge tone="info">{report.items.length} Subject{report.items.length === 1 ? '' : 's'}</Badge>
                    {/if}
                  </div>
                  <p class="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[10px] font-semibold text-ink-600">
                    <span class="inline-flex items-center gap-1"><CalendarBlank size={13} weight="bold" /> {dateLabel(report.date)}</span>
                    <span>Incharge: {report.inchargeName}</span>
                  </p>
                  <p class="mt-2 line-clamp-2 text-xs font-medium leading-5 text-ink-800">
                    {#if report.photoDataUrl}
                      Photographed diary for parents to review.
                    {:else}
                      {report.items.map((item) => subjectName(item.subjectId)).join(' · ')}
                    {/if}
                  </p>
                </div>
                <CaretRight size={19} weight="bold" class="mt-4 hidden shrink-0 text-ink-600 sm:block" />
              </div>
              <div class="grid grid-cols-2 gap-1 border-t border-paper-200 bg-paper-50 p-2 sm:grid-cols-4">
                <Button variant="ghost" size="sm" disabled={saving || exporting} onclick={() => beginEdit(report)}>
                  <NotePencil size={15} weight="bold" /> Edit
                </Button>
                <Button variant="ghost" size="sm" disabled={saving || exporting} onclick={() => void openPrint(report)}>
                  <Printer size={15} weight="bold" /> PDF
                </Button>
                <Button variant="ghost" size="sm" disabled={saving || exporting} onclick={() => void openImage(report)}>
                  <ImageSquare size={15} weight="bold" /> Image
                </Button>
                <Button variant="ghost" size="sm" disabled={saving || exporting} onclick={() => void deleteReport(report)}>
                  <Trash size={15} /> Delete
                </Button>
              </div>
            </Card>
          {:else}
            <Card class="col-span-full grid min-h-60 place-items-center border-dashed p-6 text-center">
              <div>
                <div class="mx-auto grid size-12 place-items-center rounded-xl bg-paper-100 text-ink-600">
                  <Notebook size={23} />
                </div>
                <h3 class="mt-4 font-bold">No homework reports match</h3>
                <p class="mt-1 text-sm text-ink-600">Clear the filters or create today’s diary.</p>
                <Button class="mt-4" onclick={beginCreate}><Plus size={16} /> New report</Button>
              </div>
            </Card>
          {/each}
        </div>
      </section>
    {/if}
  </div>
</main>

<Modal bind:open={subjectsOpen} title="Manage Subjects" description="Add a Subject and it becomes a new homework row immediately. Renames update every Test and report." size="lg">
  <form class="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-end" onsubmit={(event) => { event.preventDefault(); void createSubject() }}>
    <TextField label="New Subject" bind:value={newSubjectName} placeholder="e.g. Computer Science" required />
    <Button type="submit"><Plus size={16} weight="bold" /> Add & use</Button>
  </form>
  {#if subjectError}<p role="alert" class="mt-3 rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-800">{subjectError}</p>{/if}
  <div class="mt-5 max-h-[55svh] divide-y divide-paper-200 overflow-y-auto rounded-2xl border border-paper-200 bg-white">
    {#each appState.subjects as subject (subject.id)}
      <div class="flex items-center gap-2 px-3 py-2.5 sm:px-4">
        <div class={`grid size-9 shrink-0 place-items-center rounded-xl ${subject.archivedAt ? 'bg-paper-100 text-ink-600' : 'bg-register-50 text-register-800'}`}><BookOpen size={17} weight="bold" /></div>
        {#if editingSubjectId === subject.id}
          <input bind:value={editingSubjectName} aria-label={`Rename ${subject.name}`} onkeydown={renameSubjectOnEnter} class="min-h-10 min-w-0 flex-1 rounded-xl border border-register-600 bg-white px-3 text-sm font-bold outline-none ring-4 ring-register-100" />
          <Button type="button" size="sm" onclick={() => void renameSubject()}><Check size={15} weight="bold" /> Save</Button>
        {:else}
          <div class="min-w-0 flex-1">
            <p class="truncate text-sm font-bold">{subject.name}</p>
            <p class="mt-0.5 text-[9px] font-semibold text-ink-600">{subject.archivedAt ? 'Archived' : 'Active'} · {appState.dailyHomeworkReports.filter((report) => report.items.some((item) => item.subjectId === subject.id)).length} homework report(s)</p>
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
      <p class="px-4 py-10 text-center text-sm font-semibold text-ink-600">No Subjects yet. Add the first one above.</p>
    {/each}
  </div>
</Modal>

{#if printReport}
  <PrintHomeworkReport state={appState} report={printReport} />
{/if}
