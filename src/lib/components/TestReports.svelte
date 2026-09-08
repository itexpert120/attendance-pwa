<script lang="ts">
  import ArrowLeft from 'phosphor-svelte/lib/ArrowLeft'
  import BookOpen from 'phosphor-svelte/lib/BookOpen'
  import Calendar from 'phosphor-svelte/lib/Calendar'
  import CalendarBlank from 'phosphor-svelte/lib/CalendarBlank'
  import CalendarDots from 'phosphor-svelte/lib/CalendarDots'
  import CaretRight from 'phosphor-svelte/lib/CaretRight'
  import ClipboardText from 'phosphor-svelte/lib/ClipboardText'
  import Printer from 'phosphor-svelte/lib/Printer'
  import User from 'phosphor-svelte/lib/User'
  import { tick } from 'svelte'
  import { SvelteSet } from 'svelte/reactivity'
  import type { AttendanceState } from '../app-state.svelte'
  import {
    dateKey,
    marksPercentage,
    subjectReportPeriod,
    testReportAggregate,
  } from '../calculations'
  import type { SubjectReportPeriodType, TestRecord } from '../types'
  import { printDocument } from '../print'
  import PrintPeriodicTestReport from './PrintPeriodicTestReport.svelte'
  import Badge from './ui/Badge.svelte'
  import Button from './ui/Button.svelte'
  import Card from './ui/Card.svelte'
  import SelectField from './ui/SelectField.svelte'
  import TextField from './ui/TextField.svelte'

  let {
    state: appState,
    onback,
    onopentest,
  }: {
    state: AttendanceState
    onback: () => void
    onopentest: (testId: string) => void
  } = $props()

  const now = new Date()
  const today = dateKey(now.getFullYear(), now.getMonth() + 1, now.getDate())
  let mode = $state<'subject' | 'student'>('subject')
  let periodType = $state<SubjectReportPeriodType>('monthly')
  let anchorDate = $state(today)
  let subjectId = $state('')
  let classGroupId = $state('')
  let studentId = $state('')

  const periodOptions: Array<{
    id: SubjectReportPeriodType
    label: string
    description: string
    icon: typeof Calendar
  }> = [
    { id: 'daily', label: 'Daily', description: 'One calendar date', icon: CalendarBlank },
    { id: 'weekly', label: 'Weekly', description: 'Monday to Sunday', icon: Calendar },
    { id: 'monthly', label: 'Monthly', description: 'Calendar month', icon: CalendarDots },
  ]

  let subjectOptions = $derived([
    { value: '', label: 'All Subjects' },
    ...appState.subjects.map((subject) => ({
      value: subject.id,
      label: `${subject.name}${subject.archivedAt ? ' · Archived' : ''}`,
    })),
  ])
  let studentOptions = $derived(
    appState.students
      .filter((student) =>
        appState.enrollments.some(
          (enrollment) =>
            enrollment.studentId === student.id &&
            enrollment.classGroupId === classGroupId,
        ),
      )
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((student) => ({
        value: student.id,
        label: `${student.name} · ${student.admissionNumber}`,
      })),
  )
  let classOptions = $derived([
    ...(mode === 'subject' ? [{ value: '', label: 'All Class Groups' }] : []),
    ...appState.classGroups.map((group) => ({
      value: group.id,
      label: `${group.className} · Section ${group.section}`,
    })),
  ])
  let period = $derived(subjectReportPeriod(periodType, anchorDate))
  let studentEnrollmentIds = $derived(
    new SvelteSet(
      appState.enrollments
        .filter(
          (enrollment) =>
            enrollment.studentId === studentId &&
            enrollment.classGroupId === classGroupId,
        )
        .map((enrollment) => enrollment.id),
    ),
  )
  let periodTests = $derived(
    appState.tests.filter(
      (test) =>
        test.date >= period.startDate &&
        test.date <= period.endDate &&
        (!subjectId || test.subjectId === subjectId) &&
        (!classGroupId || test.classGroupId === classGroupId),
    ),
  )
  let reportTests = $derived(
    periodTests.filter(
      (test) =>
        mode === 'subject' ||
        appState.testRoster.some(
          (entry) => entry.testId === test.id && studentEnrollmentIds.has(entry.enrollmentId),
        ),
    ),
  )
  let reportTestIds = $derived(new SvelteSet(reportTests.map((test) => test.id)))
  let reportRoster = $derived(
    appState.testRoster.filter(
      (entry) =>
        reportTestIds.has(entry.testId) &&
        (mode === 'subject' || studentEnrollmentIds.has(entry.enrollmentId)),
    ),
  )
  let aggregate = $derived(testReportAggregate(reportTests, reportRoster, appState.testResults))
  let reportSubjects = $derived(
    appState.subjects
      .filter((subject) => reportTests.some((test) => test.subjectId === subject.id))
      .map((subject) => ({
        subject,
        tests: reportTests.filter((test) => test.subjectId === subject.id),
      })),
  )

  $effect(() => {
    if (mode === 'student' && !classGroupId && appState.classGroups[0]) {
      classGroupId = appState.classGroups[0].id
    }
  })

  $effect(() => {
    if (!studentOptions.some((option) => option.value === studentId)) {
      studentId = studentOptions[0]?.value ?? ''
    }
  })

  function dateLabel(value: string) {
    return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(
      new Date(`${value}T00:00:00`),
    )
  }

  function groupName(test: TestRecord) {
    const group = appState.classGroups.find((item) => item.id === test.classGroupId)
    return group ? `${group.className} · ${group.section}` : 'Class Group'
  }

  function resultForStudent(test: TestRecord) {
    const member = reportRoster.find((entry) => entry.testId === test.id)
    return member
      ? appState.testResults.find(
          (result) => result.testId === test.id && result.enrollmentId === member.enrollmentId,
        )
      : undefined
  }

  function resultLabel(test: TestRecord) {
    const result = resultForStudent(test)
    if (!result) return 'Not Entered'
    if (result.status === 'absent') return 'Absent'
    return `${result.marks ?? 0} / ${test.totalMarks}`
  }

  function resultTone(test: TestRecord): 'success' | 'danger' | 'neutral' {
    const result = resultForStudent(test)
    if (!result) return 'neutral'
    return result.status === 'absent' ? 'danger' : 'success'
  }

  async function printReport() {
    await tick()
    await printDocument()
  }
</script>

<main class="min-h-svh bg-paper-100 text-ink-950 print:hidden">
  <header class="border-b border-paper-200 bg-white/95 backdrop-blur">
    <div class="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3.5 sm:px-6">
      <Button variant="ghost" size="icon" title="Back to Tests" onclick={onback}><ArrowLeft size={19} weight="bold" /></Button>
      <div class="min-w-0 flex-1"><h1 class="font-display text-xl font-semibold tracking-[-0.025em] sm:text-2xl">Test Reports</h1><p class="mt-0.5 hidden text-[10px] font-bold uppercase tracking-[0.11em] text-ink-600 sm:block">Daily, weekly, and monthly views</p></div>
      <div class="hidden sm:block"><Button disabled={!reportTests.length || (mode === 'student' && !studentId)} onclick={printReport}><Printer size={17} weight="bold" /> Print report</Button></div>
    </div>
  </header>

  <div class="mx-auto max-w-7xl px-4 py-5 sm:px-6 sm:py-8">
    <Button class="mb-3 w-full sm:hidden" disabled={!reportTests.length || (mode === 'student' && !studentId)} onclick={printReport}><Printer size={17} weight="bold" /> Print report</Button>
    <Card class="overflow-hidden">
      <div class="grid grid-cols-2 border-b border-paper-200 bg-paper-100 p-1.5">
        <button class={`min-h-12 rounded-xl px-3 text-sm font-extrabold transition ${mode === 'subject' ? 'bg-white text-ink-950 shadow-sm ring-1 ring-paper-200' : 'text-ink-600'}`} aria-pressed={mode === 'subject'} onclick={() => (mode = 'subject')}><span class="inline-flex items-center gap-2"><BookOpen size={17} weight="bold" /> Subject Report</span></button>
        <button class={`min-h-12 rounded-xl px-3 text-sm font-extrabold transition ${mode === 'student' ? 'bg-white text-ink-950 shadow-sm ring-1 ring-paper-200' : 'text-ink-600'}`} aria-pressed={mode === 'student'} onclick={() => (mode = 'student')}><span class="inline-flex items-center gap-2"><User size={17} weight="bold" /> Student Report</span></button>
      </div>
      <div class="grid grid-cols-3 border-b border-paper-200 bg-white p-1.5">
        {#each periodOptions as option (option.id)}
          <button class={`min-h-16 rounded-xl px-2 py-2 text-center transition ${periodType === option.id ? 'bg-register-50 text-register-900 ring-1 ring-register-100' : 'text-ink-600 hover:text-ink-950'}`} aria-pressed={periodType === option.id} onclick={() => (periodType = option.id)}><option.icon size={17} weight="bold" class="mx-auto" /><span class="mt-1 block text-[11px] font-extrabold">{option.label}</span><span class="mt-0.5 hidden text-[9px] font-semibold sm:block">{option.description}</span></button>
        {/each}
      </div>
      <div class="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
        <TextField label={periodType === 'daily' ? 'Report date' : periodType === 'weekly' ? 'Choose a date in the week' : 'Choose a date in the month'} bind:value={anchorDate} type="date" />
        <SelectField label="Subject" bind:value={subjectId} options={subjectOptions} />
        <SelectField label="Class Group" bind:value={classGroupId} options={classOptions} />
        {#if mode === 'student'}<SelectField label="Student" bind:value={studentId} options={studentOptions} />{:else}<div class="flex items-end rounded-xl bg-register-50 px-4 py-3"><div><p class="text-[10px] font-extrabold uppercase tracking-[0.08em] text-register-800">Report period</p><p class="mt-1 text-sm font-bold text-register-900">{period.label}</p></div></div>{/if}
      </div>
    </Card>

    <section class="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-5">
      {#each [
        { label: 'Tests', value: aggregate.totalTests, surface: 'bg-white' },
        { label: 'Results', value: aggregate.numericCount, surface: 'bg-register-50' },
        { label: 'Absent', value: aggregate.absentCount, surface: 'bg-red-50' },
        { label: 'Not entered', value: aggregate.notEnteredCount, surface: 'bg-amber-50' },
        { label: 'Average', value: aggregate.averagePercentage == null ? '—' : `${aggregate.averagePercentage.toFixed(2)}%`, surface: 'col-span-2 bg-sky-50 lg:col-span-1' },
      ] as stat (stat.label)}
        <Card class={`p-4 ${stat.surface}`}><p class="font-display text-2xl font-semibold tracking-tight">{stat.value}</p><p class="mt-1 text-[10px] font-extrabold uppercase tracking-[0.08em] text-ink-600">{stat.label}</p></Card>
      {/each}
    </section>

    <section class="mt-7 space-y-4">
      <div><p class="text-[10px] font-extrabold uppercase tracking-[0.1em] text-register-700">{mode === 'student' ? 'Individual results' : 'Subject breakdown'}</p><h2 class="mt-1 font-display text-2xl font-semibold">{period.label}</h2></div>
      {#each reportSubjects as group (group.subject.id)}
        <Card class="overflow-hidden">
          <div class="flex items-center justify-between gap-3 border-b border-paper-200 bg-white px-4 py-3"><div class="flex min-w-0 items-center gap-3"><div class="grid size-10 shrink-0 place-items-center rounded-xl bg-register-50 text-register-800"><BookOpen size={19} weight="bold" /></div><div class="min-w-0"><h3 class="truncate text-sm font-extrabold">{group.subject.name}</h3><p class="mt-0.5 text-[10px] font-semibold text-ink-600">{group.tests.length} Test{group.tests.length === 1 ? '' : 's'}</p></div></div><Badge tone="info">{mode === 'student' ? 'Student results' : 'Subject'}</Badge></div>
          <div class="divide-y divide-paper-200 bg-white">
            {#each group.tests as test (test.id)}
              {@const summary = appState.summaryForTest(test.id)}
              {@const result = resultForStudent(test)}
              <button class="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-register-50/50" onclick={() => onopentest(test.id)}>
                <div class="grid size-11 shrink-0 place-items-center rounded-xl bg-paper-100 text-ink-600"><ClipboardText size={20} weight="duotone" /></div>
                <div class="min-w-0 flex-1"><div class="flex flex-wrap items-center gap-2"><p class="truncate text-sm font-bold">{test.name}</p>{#if mode === 'student'}<Badge tone={resultTone(test)}>{resultLabel(test)}</Badge>{/if}</div><p class="mt-1 text-[10px] font-semibold text-ink-600">{dateLabel(test.date)} · Class {groupName(test)} · {test.totalMarks} total marks</p>{#if mode === 'subject'}<p class="mt-1 text-[10px] font-semibold text-ink-600">{summary?.numericCount ?? 0} results · {summary?.absentCount ?? 0} absent · {summary?.notEnteredCount ?? 0} not entered · {summary?.average == null ? 'No average' : `${marksPercentage(summary.average, test.totalMarks).toFixed(2)}% average`}</p>{:else if result?.status === 'marks'}<p class="mt-1 text-[10px] font-semibold text-ink-600">{marksPercentage(result.marks ?? 0, test.totalMarks).toFixed(2)}%</p>{/if}</div>
                <CaretRight size={18} weight="bold" class="shrink-0 text-ink-600" />
              </button>
            {/each}
          </div>
        </Card>
      {:else}
        <Card class="grid min-h-60 place-items-center border-dashed p-6 text-center"><div><div class="mx-auto grid size-12 place-items-center rounded-xl bg-paper-100 text-ink-600">{#if mode === 'student'}<User size={23} />{:else}<BookOpen size={23} />{/if}</div><h3 class="mt-4 font-bold">No Test Results in this period</h3><p class="mt-1 text-sm text-ink-600">Choose another date, Subject, or Student.</p></div></Card>
      {/each}
    </section>
  </div>
</main>

<PrintPeriodicTestReport state={appState} {mode} periodLabel={period.label} tests={reportTests} roster={reportRoster} {aggregate} {subjectId} {studentId} {classGroupId} />
