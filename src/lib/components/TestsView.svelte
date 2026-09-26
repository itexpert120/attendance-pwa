<script lang="ts">
  import Archive from 'phosphor-svelte/lib/Archive'
  import ArrowCounterClockwise from 'phosphor-svelte/lib/ArrowCounterClockwise'
  import BookOpen from 'phosphor-svelte/lib/BookOpen'
  import Check from 'phosphor-svelte/lib/Check'
  import ClipboardText from 'phosphor-svelte/lib/ClipboardText'
  import FadersHorizontal from 'phosphor-svelte/lib/FadersHorizontal'
  import MagnifyingGlass from 'phosphor-svelte/lib/MagnifyingGlass'
  import NotePencil from 'phosphor-svelte/lib/NotePencil'
  import Plus from 'phosphor-svelte/lib/Plus'
  import PresentationChart from 'phosphor-svelte/lib/PresentationChart'
  import { SvelteSet } from 'svelte/reactivity'
  import type { AttendanceState } from '../app-state.svelte'
  import {
    academicYearStartYearForDate,
    dateKey,
    testCountsBySubject,
  } from '../calculations'
  import type { Subject, TestProgress, TestRecord } from '../types'
  import { navigate, paths } from '../navigation'
  import Badge from './ui/Badge.svelte'
  import BarButton from './ui/BarButton.svelte'
  import EmptyState from './ui/EmptyState.svelte'
  import Fab from './ui/Fab.svelte'
  import ListGroup from './ui/ListGroup.svelte'
  import ListRow from './ui/ListRow.svelte'
  import Screen from './ui/Screen.svelte'
  import Button from './ui/Button.svelte'
  import Chip from './ui/Chip.svelte'
  import SubjectForm from './SubjectForm.svelte'
  import Modal from './ui/Modal.svelte'
  import SelectField from './ui/SelectField.svelte'
  import TextField from './ui/TextField.svelte'

  let { state: appState }: { state: AttendanceState } = $props()

  const currentDate = new Date()
  const today = dateKey(currentDate.getFullYear(), currentDate.getMonth() + 1, currentDate.getDate())
  let startMonth = $derived(appState.settings?.academicYearStartMonth ?? 1)
  let currentAcademicYear = $derived(
    currentDate.getMonth() + 1 >= startMonth
      ? currentDate.getFullYear()
      : currentDate.getFullYear() - 1,
  )

  function initialAcademicYear() {
    return currentDate.getMonth() + 1 >= (appState.settings?.academicYearStartMonth ?? 1)
      ? currentDate.getFullYear()
      : currentDate.getFullYear() - 1
  }

  let createOpen = $state(false)
  let subjectsOpen = $state(false)
  let filtersOpen = $state(false)
  let academicYear = $state(initialAcademicYear())
  let appliedAcademicYear = $state<number | null>(null)
  let fromDate = $state('')
  let toDate = $state('')
  let classFilter = $state('')
  let subjectFilter = $state('')
  let progressFilter = $state('')
  let query = $state('')

  let testName = $state('')
  let testSubjectId = $state('')
  let testClassGroupId = $state('')
  let testDate = $state(today)
  let totalMarks = $state<string | number>('')
  let createError = $state('')
  let quickSubjectOpen = $state(false)

  let newSubjectName = $state('')
  let subjectError = $state('')
  let editingSubjectId = $state<string | null>(null)
  let editingSubjectName = $state('')

  let activeSubjects = $derived(appState.subjects.filter((subject) => !subject.archivedAt))
  let classOptions = $derived([
    { value: '', label: 'All Class Groups' },
    ...appState.classGroups.map((group) => ({ value: group.id, label: `${group.className} · Section ${group.section}` })),
  ])
  let createClassOptions = $derived(classOptions.filter((option) => option.value))
  let subjectOptions = $derived([
    { value: '', label: 'All Subjects' },
    ...appState.subjects.map((subject) => ({ value: subject.id, label: `${subject.name}${subject.archivedAt ? ' · Archived' : ''}` })),
  ])
  let createSubjectOptions = $derived(
    activeSubjects.map((subject) => ({ value: subject.id, label: subject.name })),
  )
  let academicYearOptions = $derived.by(() => {
    const years = new SvelteSet<number>()
    for (let offset = -3; offset <= 3; offset += 1) years.add(currentAcademicYear + offset)
    for (const test of appState.tests) {
      if (appState.settings) years.add(academicYearStartYearForDate(test.date, appState.settings))
    }
    return [...years]
      .sort((a, b) => b - a)
      .map((year) => ({ value: year, label: `${year}–${String(year + 1).slice(-2)}` }))
  })
  const progressOptions = [
    { value: '', label: 'All progress' },
    { value: 'not-started', label: 'Not Started' },
    { value: 'in-progress', label: 'In Progress' },
    { value: 'complete', label: 'Complete' },
  ]

  let filteredTests = $derived.by(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase()
    return appState.tests.filter((test) => {
      const summary = appState.summaryForTest(test.id)
      return (
        (!fromDate || test.date >= fromDate) &&
        (!toDate || test.date <= toDate) &&
        (!classFilter || test.classGroupId === classFilter) &&
        (!subjectFilter || test.subjectId === subjectFilter) &&
        (!progressFilter || summary?.progress === progressFilter) &&
        (!normalizedQuery || test.name.toLocaleLowerCase().includes(normalizedQuery))
      )
    })
  })
  let counts = $derived(testCountsBySubject(appState.subjects, filteredTests))
  let activeFilterCount = $derived(
    [classFilter, progressFilter, academicYear !== currentAcademicYear ? 'year' : ''].filter(Boolean).length,
  )

  $effect(() => {
    if (appliedAcademicYear === academicYear) return
    const range = academicYearRange(academicYear)
    fromDate = range.start
    toDate = range.end
    appliedAcademicYear = academicYear
  })

  $effect(() => {
    if (!testClassGroupId && appState.classGroups[0]) testClassGroupId = appState.classGroups[0].id
    if (!testSubjectId && activeSubjects[0]) testSubjectId = activeSubjects[0].id
  })

  function academicYearRange(year: number) {
    const endDate = new Date(year + 1, startMonth - 1, 0)
    return {
      start: dateKey(year, startMonth, 1),
      end: dateKey(endDate.getFullYear(), endDate.getMonth() + 1, endDate.getDate()),
    }
  }

  function openCreate() {
    testName = ''
    testSubjectId = activeSubjects[0]?.id ?? ''
    testClassGroupId = appState.classGroups[0]?.id ?? ''
    testDate = today
    totalMarks = ''
    createError = ''
    quickSubjectOpen = false
    createOpen = true
  }

  async function createTest(event: SubmitEvent) {
    event.preventDefault()
    createError = ''
    try {
      const test = await appState.createTest({
        name: testName,
        subjectId: testSubjectId,
        classGroupId: testClassGroupId,
        date: testDate,
        totalMarks: Number(totalMarks),
      })
      createOpen = false
      navigate(paths.test(test.id))
    } catch (caught) {
      createError = caught instanceof Error ? caught.message : 'Could not create this Test.'
    }
  }

  async function createSubject(event: SubmitEvent) {
    event.preventDefault()
    subjectError = ''
    try {
      await appState.saveSubject(newSubjectName)
      newSubjectName = ''
    } catch (caught) {
      subjectError = caught instanceof Error ? caught.message : 'Could not create this Subject.'
    }
  }

  function beginRename(subject: Subject) {
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

  function dateLabel(value: string) {
    return new Intl.DateTimeFormat('en', { day: 'numeric', month: 'short', year: 'numeric' }).format(
      new Date(`${value}T00:00:00`),
    )
  }

  function groupLabel(test: TestRecord) {
    const group = appState.classGroups.find((item) => item.id === test.classGroupId)
    return group ? `${group.className} · ${group.section}` : 'Class Group'
  }

  function subjectLabel(test: TestRecord) {
    return appState.subjects.find((item) => item.id === test.subjectId)?.name ?? 'Subject'
  }

  function progressLabel(progress?: TestProgress) {
    if (progress === 'complete') return 'Complete'
    if (progress === 'in-progress') return 'In Progress'
    return 'Not Started'
  }

  function progressTone(progress?: TestProgress): 'success' | 'warning' | 'neutral' {
    if (progress === 'complete') return 'success'
    if (progress === 'in-progress') return 'warning'
    return 'neutral'
  }

  function resetFilters() {
    classFilter = ''
    subjectFilter = ''
    progressFilter = ''
    query = ''
    academicYear = currentAcademicYear
    appliedAcademicYear = null
  }
</script>

  <Screen title="Tests" subtitle="Results across every Subject">
    {#snippet actions()}
      <BarButton label="Test reports" onclick={() => navigate(paths.testReports())}><PresentationChart /></BarButton>
      <BarButton label="Manage Subjects" onclick={() => (subjectsOpen = true)}><BookOpen /></BarButton>
    {/snippet}

    <div class="space-y-6">
      <div class="space-y-3">
        <label class="flex h-14 items-center gap-1 rounded-full bg-surface-container-high pl-4 pr-1 focus-within:bg-surface-container-highest">
          <MagnifyingGlass size={24} class="shrink-0 text-on-surface-variant" />
          <span class="sr-only">Search Tests</span>
          <input bind:value={query} type="search" enterkeyhint="search" placeholder="Search Tests" class="type-body-large h-full min-w-0 flex-1 bg-transparent px-3 text-on-surface caret-primary outline-none placeholder:text-on-surface-variant" />
          <span class="relative">
            <BarButton label="Filters" onclick={() => (filtersOpen = true)}><FadersHorizontal /></BarButton>
            {#if activeFilterCount}<span class="type-label-small pointer-events-none absolute right-0.5 top-0.5 grid size-4 place-items-center rounded-full bg-error text-[10px] text-on-error">{activeFilterCount}</span>{/if}
          </span>
        </label>
        <div class="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 md:mx-0 md:flex-wrap md:px-0">
          <Chip selected={!subjectFilter} onclick={() => (subjectFilter = '')}>All · {counts.total}</Chip>
          {#each counts.bySubject as count (count.subjectId)}
            {@const item = activeSubjects.find((subject) => subject.id === count.subjectId)}
            <Chip selected={subjectFilter === count.subjectId} onclick={() => (subjectFilter = subjectFilter === count.subjectId ? '' : count.subjectId)}>{item?.name} · {count.count}</Chip>
          {/each}
        </div>
      </div>

      {#if filteredTests.length}
        <ListGroup header={`${filteredTests.length} Test${filteredTests.length === 1 ? '' : 's'} · ${academicYearOptions.find((option) => option.value === academicYear)?.label ?? ''}`} footer="Newest Test date first.">
          {#each filteredTests as test (test.id)}
            {@const summary = appState.summaryForTest(test.id)}
            {@const entered = summary?.numericCount ?? 0}
            {@const total = entered + (summary?.absentCount ?? 0) + (summary?.notEnteredCount ?? 0)}
            <ListRow label={test.name} detail={`${subjectLabel(test)} · ${groupLabel(test)} · ${dateLabel(test.date)}`} onclick={() => navigate(paths.test(test.id))}>
              {#snippet leading()}
                <span class="grid size-10 shrink-0 place-items-center rounded-full bg-tertiary-container text-on-tertiary-container"><ClipboardText size={20} /></span>
              {/snippet}
              {#snippet trailing()}
                <span class="shrink-0 text-right">
                  <Badge tone={progressTone(summary?.progress)}>{progressLabel(summary?.progress)}</Badge>
                  <span class="mt-1 block text-[12px] font-medium tabular-nums text-on-surface-variant">{entered}/{total} · {test.totalMarks} marks</span>
                </span>
              {/snippet}
            </ListRow>
          {/each}
        </ListGroup>
      {:else}
        <div class="rounded-2xl bg-surface-container-lowest">
          <EmptyState icon={ClipboardText} title="No Tests found" text="Change the filters or create a new Test.">
            <Button onclick={openCreate}><Plus size={17} weight="bold" /> New Test</Button>
          </EmptyState>
        </div>
      {/if}
    </div>
  </Screen>

  <Fab icon={Plus} text="New Test" onclick={openCreate} />

<Modal bind:open={filtersOpen} title="Filter Tests" description="Counts and the list update as you change filters.">
  <div class="grid gap-4">
    <SelectField label="Academic year" bind:value={academicYear} options={academicYearOptions} />
    <SelectField label="Class Group" bind:value={classFilter} options={classOptions} />
    <SelectField label="Subject" bind:value={subjectFilter} options={subjectOptions} />
    <SelectField label="Progress" bind:value={progressFilter} options={progressOptions} />
    <div class="grid grid-cols-2 gap-3"><TextField label="From date" bind:value={fromDate} type="date" /><TextField label="To date" bind:value={toDate} type="date" /></div>
    <div class="mt-2 flex justify-end gap-2">
      <Button variant="ghost" onclick={resetFilters}>Reset</Button>
      <Button onclick={() => (filtersOpen = false)}>Show {filteredTests.length} Tests</Button>
    </div>
  </div>
</Modal>

<Modal bind:open={createOpen} title="New Test" description="Students enrolled in the class on the Test date are added automatically." size="lg">
  <form id="create-test" class="grid gap-4" onsubmit={createTest}>
    <TextField label="Test name" bind:value={testName} placeholder="e.g. Midterm or Weekly Test 3" required />
    {#if createSubjectOptions.length}
      <div class="flex items-end gap-2">
        <SelectField class="flex-1" label="Subject" bind:value={testSubjectId} options={createSubjectOptions} />
        <Button variant="outlined" class="h-14! rounded-xl!" title="New Subject" onclick={() => (quickSubjectOpen = true)}><Plus size={20} /></Button>
      </div>
    {:else}
      <div class="flex items-center gap-3 rounded-xl bg-warning-container p-4 text-on-warning-container">
        <p class="type-body-medium min-w-0 flex-1">Add a Subject first. Subjects are shared by all classes.</p>
        <Button size="sm" variant="secondary" onclick={() => (quickSubjectOpen = true)}><Plus size={18} /> Subject</Button>
      </div>
    {/if}
    <SelectField label="Class & section" bind:value={testClassGroupId} options={createClassOptions} />
    <div class="grid grid-cols-2 gap-3"><TextField label="Test date" bind:value={testDate} type="date" required /><TextField label="Total marks" bind:value={totalMarks} type="number" min="0.01" step="0.01" placeholder="40" required /></div>
    {#if createError}<p role="alert" class="type-body-medium rounded-xl bg-error-container px-4 py-3 text-on-error-container">{createError}</p>{/if}
  </form>
  {#snippet footer()}
    <Button variant="ghost" onclick={() => (createOpen = false)}>Cancel</Button>
    <Button type="submit" form="create-test" disabled={!createSubjectOptions.length}>Create & enter marks</Button>
  {/snippet}
</Modal>

<SubjectForm state={appState} bind:open={quickSubjectOpen} oncreated={(id) => (testSubjectId = id)} />

<Modal bind:open={subjectsOpen} title="Manage Subjects" description="Subjects are shared across every Class Group. Archive instead of deleting history." size="lg">
  <form class="flex flex-col gap-2 sm:flex-row sm:items-end" onsubmit={createSubject}><TextField label="New Subject" bind:value={newSubjectName} placeholder="e.g. Mathematics" class="flex-1" /><Button type="submit"><Plus size={16} /> Add Subject</Button></form>
  {#if subjectError}<p class="mt-3 rounded-2xl bg-error-container px-4 py-3 text-[13px] font-medium text-on-error-container">{subjectError}</p>{/if}
  <div class="mt-5 divide-y divide-outline-variant overflow-hidden rounded-2xl border border-outline-variant bg-surface-container-lowest">
    {#each appState.subjects as subject (subject.id)}
      <div class="flex items-center gap-3 px-3 py-3">
        <div class={`grid size-10 shrink-0 place-items-center rounded-xl ${subject.archivedAt ? 'bg-surface-container text-on-surface-variant' : 'bg-primary-container/40 text-on-primary-container'}`}><BookOpen size={19} weight="bold" /></div>
        {#if editingSubjectId === subject.id}
          <input bind:value={editingSubjectName} aria-label={`Rename ${subject.name}`} class="min-h-10 min-w-0 flex-1 rounded-xl border border-primary bg-surface-container-lowest px-3 text-sm font-medium outline-none ring-4 ring-primary/20" />
          <Button size="sm" onclick={renameSubject}><Check size={15} /> Save</Button>
        {:else}
          <div class="min-w-0 flex-1"><p class="truncate text-sm font-medium">{subject.name}</p><p class="mt-0.5 type-label-medium text-on-surface-variant">{appState.tests.filter((test) => test.subjectId === subject.id).length} Test{appState.tests.filter((test) => test.subjectId === subject.id).length === 1 ? '' : 's'}{subject.archivedAt ? ' · Archived' : ''}</p></div>
          <Button variant="ghost" size="sm" title={`Rename ${subject.name}`} onclick={() => beginRename(subject)}><NotePencil size={15} /></Button>
          <Button variant={subject.archivedAt ? 'soft' : 'ghost'} size="sm" onclick={() => toggleSubjectArchive(subject)}>{#if subject.archivedAt}<ArrowCounterClockwise size={15} /> Restore{:else}<Archive size={15} /> Archive{/if}</Button>
        {/if}
      </div>
    {:else}
      <p class="px-4 py-10 text-center text-sm font-medium text-on-surface-variant">No Subjects yet. Add the first one above.</p>
    {/each}
  </div>
</Modal>

