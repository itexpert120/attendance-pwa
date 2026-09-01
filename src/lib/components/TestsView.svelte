<script lang="ts">
  import Archive from 'phosphor-svelte/lib/Archive'
  import ArrowCounterClockwise from 'phosphor-svelte/lib/ArrowCounterClockwise'
  import ArrowLeft from 'phosphor-svelte/lib/ArrowLeft'
  import BookOpen from 'phosphor-svelte/lib/BookOpen'
  import CalendarBlank from 'phosphor-svelte/lib/CalendarBlank'
  import CaretRight from 'phosphor-svelte/lib/CaretRight'
  import ChartBar from 'phosphor-svelte/lib/ChartBar'
  import Check from 'phosphor-svelte/lib/Check'
  import ClipboardText from 'phosphor-svelte/lib/ClipboardText'
  import FadersHorizontal from 'phosphor-svelte/lib/FadersHorizontal'
  import MagnifyingGlass from 'phosphor-svelte/lib/MagnifyingGlass'
  import NotePencil from 'phosphor-svelte/lib/NotePencil'
  import Plus from 'phosphor-svelte/lib/Plus'
  import PresentationChart from 'phosphor-svelte/lib/PresentationChart'
  import { tick } from 'svelte'
  import { SvelteSet } from 'svelte/reactivity'
  import type { AttendanceState } from '../app-state.svelte'
  import {
    academicYearStartYearForDate,
    dateKey,
    testCountsBySubject,
  } from '../calculations'
  import type { Subject, TestProgress, TestRecord } from '../types'
  import PrintTestReport from './PrintTestReport.svelte'
  import SchoolMark from './SchoolMark.svelte'
  import TestDetail from './TestDetail.svelte'
  import TestReports from './TestReports.svelte'
  import Badge from './ui/Badge.svelte'
  import Button from './ui/Button.svelte'
  import Card from './ui/Card.svelte'
  import Modal from './ui/Modal.svelte'
  import SelectField from './ui/SelectField.svelte'
  import TextField from './ui/TextField.svelte'

  let {
    state: appState,
    onback,
  }: {
    state: AttendanceState
    onback: () => void
  } = $props()

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
  let reportsOpen = $state(false)
  let filtersOpen = $state(false)
  let printTestId = $state<string | null>(null)
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
  let quickSubjectName = $state('')

  let newSubjectName = $state('')
  let subjectError = $state('')
  let editingSubjectId = $state<string | null>(null)
  let editingSubjectName = $state('')

  let selectedTest = $derived(appState.selectedTest)
  let printTest = $derived(appState.tests.find((test) => test.id === printTestId) ?? null)
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
    quickSubjectName = ''
    createOpen = true
  }

  async function createTest(event: SubmitEvent) {
    event.preventDefault()
    createError = ''
    try {
      await appState.createTest({
        name: testName,
        subjectId: testSubjectId,
        classGroupId: testClassGroupId,
        date: testDate,
        totalMarks: Number(totalMarks),
      })
      createOpen = false
    } catch (caught) {
      createError = caught instanceof Error ? caught.message : 'Could not create this Test.'
    }
  }

  async function quickAddSubject() {
    createError = ''
    try {
      const subject = await appState.saveSubject(quickSubjectName)
      testSubjectId = subject.id
      quickSubjectName = ''
      quickSubjectOpen = false
    } catch (caught) {
      createError = caught instanceof Error ? caught.message : 'Could not create this Subject.'
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

  async function printReport(test: TestRecord) {
    printTestId = test.id
    await tick()
    window.print()
    printTestId = null
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

  function openReportedTest(testId: string) {
    reportsOpen = false
    appState.selectTest(testId)
  }
</script>

{#if selectedTest}
  <TestDetail state={appState} test={selectedTest} onback={() => appState.selectTest(null)} onprint={printReport} ondeleted={() => appState.selectTest(null)} />
{:else if reportsOpen}
  <TestReports state={appState} onback={() => (reportsOpen = false)} onopentest={openReportedTest} />
{:else}
  <main class="min-h-svh bg-paper-100 text-ink-950 print:hidden">
    <header class="border-b border-paper-200 bg-white/95 backdrop-blur">
      <div class="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3.5 sm:px-6">
        <Button variant="ghost" size="icon" title="Back to Dashboard" onclick={onback}><ArrowLeft size={19} weight="bold" /></Button>
        <div class="hidden sm:block"><SchoolMark compact logoDataUrl={appState.settings?.logoDataUrl} alt={`${appState.settings?.schoolName ?? 'School'} logo`} /></div>
        <div class="min-w-0 flex-1"><h1 class="font-display text-xl font-semibold tracking-[-0.025em] sm:text-2xl">Tests</h1><p class="mt-0.5 hidden text-[10px] font-bold uppercase tracking-[0.11em] text-ink-600 sm:block">Results across every Subject</p></div>
        <div class="hidden items-center gap-2 sm:flex"><Button variant="secondary" onclick={() => (reportsOpen = true)}><PresentationChart size={17} weight="bold" /> Reports</Button><div class="hidden md:block"><Button variant="secondary" onclick={() => (subjectsOpen = true)}><BookOpen size={17} weight="bold" /> Subjects</Button></div><Button onclick={openCreate}><Plus size={17} weight="bold" /> New Test</Button></div>
      </div>
    </header>

    <div class="mx-auto max-w-7xl px-4 py-5 sm:px-6 sm:py-8">
      <section class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div><p class="text-[10px] font-extrabold uppercase tracking-[0.12em] text-register-700">Academic record</p><h2 class="mt-1 font-display text-2xl font-semibold tracking-tight sm:text-3xl">Test overview</h2><p class="mt-1 text-xs font-medium text-ink-600">Counts and progress update with every active filter.</p></div>
        <div class="grid grid-cols-2 gap-2 sm:hidden"><Button onclick={openCreate}><Plus size={17} weight="bold" /> New Test</Button><Button variant="secondary" onclick={() => (reportsOpen = true)}><PresentationChart size={17} weight="bold" /> Reports</Button><Button variant="secondary" onclick={() => (subjectsOpen = true)}><BookOpen size={17} weight="bold" /> Subjects</Button><Button variant="secondary" onclick={() => (filtersOpen = !filtersOpen)}><FadersHorizontal size={17} weight="bold" /> Filters</Button></div>
      </section>

      <section class="mt-5 grid snap-x grid-flow-col auto-cols-[minmax(9rem,1fr)] gap-3 overflow-x-auto pb-2 lg:grid-flow-row lg:grid-cols-4 lg:overflow-visible">
        <button class={`snap-start rounded-2xl border p-4 text-left shadow-soft transition hover:-translate-y-0.5 ${!subjectFilter ? 'border-register-200 bg-register-800 text-white' : 'border-paper-200 bg-white text-ink-950'}`} onclick={() => (subjectFilter = '')}>
          <div class="flex items-start justify-between gap-2"><p class={`text-[10px] font-extrabold uppercase tracking-[0.08em] ${!subjectFilter ? 'text-register-100' : 'text-ink-600'}`}>All Subjects</p><ClipboardText size={18} weight="bold" /></div><p class="mt-5 font-display text-3xl font-semibold">{counts.total}</p>
        </button>
        {#each counts.bySubject as count (count.subjectId)}
          {@const item = activeSubjects.find((subject) => subject.id === count.subjectId)}
          <button class={`snap-start rounded-2xl border p-4 text-left shadow-soft transition hover:-translate-y-0.5 ${subjectFilter === count.subjectId ? 'border-register-200 bg-register-800 text-white' : 'border-paper-200 bg-white text-ink-950'}`} onclick={() => (subjectFilter = count.subjectId)}>
            <div class="flex items-start justify-between gap-2"><p class={`truncate text-[10px] font-extrabold uppercase tracking-[0.08em] ${subjectFilter === count.subjectId ? 'text-register-100' : 'text-ink-600'}`}>{item?.name}</p><BookOpen size={18} weight="bold" /></div><p class="mt-5 font-display text-3xl font-semibold">{count.count}</p>
          </button>
        {/each}
      </section>

      <Card class={`mt-5 p-4 ${filtersOpen ? 'block' : 'hidden sm:block'}`}>
        <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label class="grid gap-1.5 sm:col-span-2 lg:col-span-1"><span class="text-[11px] font-bold text-ink-800">Search Tests</span><span class="relative"><MagnifyingGlass size={17} class="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-600" /><input bind:value={query} placeholder="Name…" class="min-h-11 w-full rounded-xl border border-paper-200 bg-paper-50 pl-10 pr-3 text-sm font-medium outline-none focus:border-register-600 focus:bg-white focus:ring-4 focus:ring-register-100" /></span></label>
          <SelectField label="Academic year" bind:value={academicYear} options={academicYearOptions} />
          <SelectField label="Class Group" bind:value={classFilter} options={classOptions} />
          <SelectField label="Progress" bind:value={progressFilter} options={progressOptions} />
          <TextField label="From date" bind:value={fromDate} type="date" />
          <TextField label="To date" bind:value={toDate} type="date" />
          <SelectField label="Subject" bind:value={subjectFilter} options={subjectOptions} class="sm:col-span-2" />
        </div>
      </Card>

      <section class="mt-7">
        <div class="mb-3 flex items-center justify-between gap-3"><div><h2 class="font-display text-xl font-semibold">{filteredTests.length} Test{filteredTests.length === 1 ? '' : 's'}</h2><p class="mt-0.5 text-[11px] font-medium text-ink-600">Newest Test date first</p></div><ChartBar size={22} weight="bold" class="text-register-700" /></div>
        <div class="grid gap-3 lg:grid-cols-2">
          {#each filteredTests as test (test.id)}
            {@const summary = appState.summaryForTest(test.id)}
            <button class="group flex min-h-32 items-center gap-4 rounded-2xl border border-paper-200 bg-white p-4 text-left shadow-soft transition hover:-translate-y-0.5 hover:border-register-200 hover:shadow-lifted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-register-600" onclick={() => appState.selectTest(test.id)}>
              <div class="grid size-14 shrink-0 place-items-center rounded-2xl border border-register-100 bg-register-50 text-register-800"><ClipboardText size={26} weight="duotone" /></div>
              <div class="min-w-0 flex-1"><div class="flex flex-wrap items-center gap-2"><p class="truncate font-display text-xl font-semibold">{test.name}</p><Badge tone={progressTone(summary?.progress)}>{progressLabel(summary?.progress)}</Badge></div><p class="mt-1.5 truncate text-xs font-bold text-ink-800">{subjectLabel(test)} · {groupLabel(test)}</p><p class="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[10px] font-semibold text-ink-600"><span class="inline-flex items-center gap-1"><CalendarBlank size={13} weight="bold" /> {dateLabel(test.date)}</span><span>{test.totalMarks} marks</span><span>{summary?.numericCount ?? 0}/{(summary?.numericCount ?? 0) + (summary?.absentCount ?? 0) + (summary?.notEnteredCount ?? 0)} entered</span></p></div>
              <CaretRight size={19} weight="bold" class="shrink-0 text-ink-600 transition group-hover:translate-x-1 group-hover:text-register-700" />
            </button>
          {:else}
            <Card class="col-span-full grid min-h-60 place-items-center border-dashed p-6 text-center"><div><div class="mx-auto grid size-12 place-items-center rounded-xl bg-paper-100 text-ink-600"><ClipboardText size={23} /></div><h3 class="mt-4 font-bold">No Tests match these filters</h3><p class="mt-1 text-sm text-ink-600">Change the date range or create a new Test.</p><Button class="mt-4" onclick={openCreate}><Plus size={16} /> New Test</Button></div></Card>
          {/each}
        </div>
      </section>
    </div>
  </main>
{/if}

<Modal bind:open={createOpen} title="Create Test" description="Eligible Students are captured from the selected Class Group and date." size="lg">
  <form class="grid gap-4" onsubmit={createTest}>
    <TextField label="Test Name" bind:value={testName} placeholder="e.g. Midterm or Weekly Test 3" required />
    {#if createSubjectOptions.length}
      <SelectField label="Subject" bind:value={testSubjectId} options={createSubjectOptions} />
    {:else}
      <p class="rounded-xl bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">Create an active Subject before saving this Test.</p>
    {/if}
    {#if quickSubjectOpen}
      <div class="grid gap-2 rounded-2xl border border-register-100 bg-register-50 p-3 sm:grid-cols-[1fr_auto] sm:items-end"><TextField label="Quick-add Subject" bind:value={quickSubjectName} placeholder="Subject name" /><Button type="button" variant="soft" onclick={quickAddSubject}><Check size={16} /> Add Subject</Button></div>
    {:else}
      <button type="button" class="w-fit text-xs font-bold text-register-800 hover:underline" onclick={() => (quickSubjectOpen = true)}>+ Quick-add a Subject</button>
    {/if}
    <SelectField label="Class & section" bind:value={testClassGroupId} options={createClassOptions} />
    <div class="grid grid-cols-2 gap-3"><TextField label="Test date" bind:value={testDate} type="date" required /><TextField label="Total Marks" bind:value={totalMarks} type="number" min="0.01" step="0.01" placeholder="40" required /></div>
    {#if createError}<p class="rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-800">{createError}</p>{/if}
    <Button type="submit" class="w-full" disabled={!createSubjectOptions.length}>Create and enter Marks <CaretRight size={17} /></Button>
  </form>
</Modal>

<Modal bind:open={subjectsOpen} title="Manage Subjects" description="Subjects are shared across every Class Group. Archive instead of deleting history." size="lg">
  <form class="flex flex-col gap-2 sm:flex-row sm:items-end" onsubmit={createSubject}><TextField label="New Subject" bind:value={newSubjectName} placeholder="e.g. Mathematics" class="flex-1" /><Button type="submit"><Plus size={16} /> Add Subject</Button></form>
  {#if subjectError}<p class="mt-3 rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-800">{subjectError}</p>{/if}
  <div class="mt-5 divide-y divide-paper-200 overflow-hidden rounded-2xl border border-paper-200 bg-white">
    {#each appState.subjects as subject (subject.id)}
      <div class="flex items-center gap-3 px-3 py-3">
        <div class={`grid size-10 shrink-0 place-items-center rounded-xl ${subject.archivedAt ? 'bg-paper-100 text-ink-600' : 'bg-register-50 text-register-800'}`}><BookOpen size={19} weight="bold" /></div>
        {#if editingSubjectId === subject.id}
          <input bind:value={editingSubjectName} aria-label={`Rename ${subject.name}`} class="min-h-10 min-w-0 flex-1 rounded-xl border border-register-600 bg-white px-3 text-sm font-bold outline-none ring-4 ring-register-100" />
          <Button size="sm" onclick={renameSubject}><Check size={15} /> Save</Button>
        {:else}
          <div class="min-w-0 flex-1"><p class="truncate text-sm font-bold">{subject.name}</p><p class="mt-0.5 text-[10px] font-semibold text-ink-600">{appState.tests.filter((test) => test.subjectId === subject.id).length} Test{appState.tests.filter((test) => test.subjectId === subject.id).length === 1 ? '' : 's'}{subject.archivedAt ? ' · Archived' : ''}</p></div>
          <Button variant="ghost" size="sm" title={`Rename ${subject.name}`} onclick={() => beginRename(subject)}><NotePencil size={15} /></Button>
          <Button variant={subject.archivedAt ? 'soft' : 'ghost'} size="sm" onclick={() => toggleSubjectArchive(subject)}>{#if subject.archivedAt}<ArrowCounterClockwise size={15} /> Restore{:else}<Archive size={15} /> Archive{/if}</Button>
        {/if}
      </div>
    {:else}
      <p class="px-4 py-10 text-center text-sm font-semibold text-ink-600">No Subjects yet. Add the first one above.</p>
    {/each}
  </div>
</Modal>

{#if printTest}<PrintTestReport state={appState} test={printTest} />{/if}
