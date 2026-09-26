<script lang="ts">
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
  import { navigate, paths } from '../navigation'
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
  import BarButton from './ui/BarButton.svelte'
  import Card from './ui/Card.svelte'
  import Screen from './ui/Screen.svelte'
  import Segmented from './ui/Segmented.svelte'
  import SelectField from './ui/SelectField.svelte'
  import TextField from './ui/TextField.svelte'

  let { state: appState }: { state: AttendanceState } = $props()

  const onopentest = (testId: string) => navigate(paths.test(testId))

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

<Screen title="Test Reports" subtitle={period.label} back={paths.tests()} backLabel="Back to Tests" width="lg">
  {#snippet actions()}
    <BarButton label="Print report" disabled={!reportTests.length || (mode === 'student' && !studentId)} onclick={printReport}><Printer /></BarButton>
  {/snippet}
  <div class="space-y-4">
    <Card class="overflow-hidden">
      <div class="grid gap-2 p-3 pb-1">
        <Segmented label="Report type" bind:value={mode} options={[{ value: 'subject' as const, label: 'By Subject', icon: BookOpen }, { value: 'student' as const, label: 'By Student', icon: User }]} />
        <Segmented label="Report period" bind:value={periodType} options={periodOptions.map((option) => ({ value: option.id, label: option.label }))} />
      </div>
      <div class="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
        <TextField label={periodType === 'daily' ? 'Report date' : periodType === 'weekly' ? 'Choose a date in the week' : 'Choose a date in the month'} bind:value={anchorDate} type="date" />
        <SelectField label="Subject" bind:value={subjectId} options={subjectOptions} />
        <SelectField label="Class Group" bind:value={classGroupId} options={classOptions} />
        {#if mode === 'student'}<SelectField label="Student" bind:value={studentId} options={studentOptions} />{:else}<div class="flex items-end rounded-xl bg-primary-container/40 px-4 py-3"><div><p class="text-[12px] font-medium text-on-primary-container">Report period</p><p class="mt-1 text-sm font-medium text-on-primary-container">{period.label}</p></div></div>{/if}
      </div>
    </Card>

    <section class="grid grid-cols-2 gap-3 lg:grid-cols-5">
      {#each [
        { label: 'Tests', value: aggregate.totalTests, surface: 'bg-surface-container-lowest' },
        { label: 'Results', value: aggregate.numericCount, surface: 'bg-primary-container/40' },
        { label: 'Absent', value: aggregate.absentCount, surface: 'bg-error-container' },
        { label: 'Not entered', value: aggregate.notEnteredCount, surface: 'bg-warning-container' },
        { label: 'Average', value: aggregate.averagePercentage == null ? '—' : `${aggregate.averagePercentage.toFixed(2)}%`, surface: 'col-span-2 bg-tertiary-container lg:col-span-1' },
      ] as stat (stat.label)}
        <Card class={`p-4 ${stat.surface}`}><p class="text-[24px] font-medium">{stat.value}</p><p class="mt-0.5 type-label-medium text-on-surface-variant">{stat.label}</p></Card>
      {/each}
    </section>

    <section class="space-y-4 pt-3">
      <div class="px-1"><p class="text-[13px] font-medium text-on-surface-variant">{mode === 'student' ? 'Individual results' : 'Subject breakdown'}</p><h2 class="mt-1 text-[22px] font-medium">{period.label}</h2></div>
      {#each reportSubjects as group (group.subject.id)}
        <Card class="overflow-hidden">
          <div class="flex items-center justify-between gap-3 border-b border-outline-variant bg-surface-container-lowest px-4 py-3"><div class="flex min-w-0 items-center gap-3"><div class="grid size-10 shrink-0 place-items-center rounded-xl bg-primary-container/40 text-on-primary-container"><BookOpen size={19} weight="bold" /></div><div class="min-w-0"><h3 class="truncate text-sm font-medium">{group.subject.name}</h3><p class="mt-0.5 type-label-medium text-on-surface-variant">{group.tests.length} Test{group.tests.length === 1 ? '' : 's'}</p></div></div><Badge tone="info">{mode === 'student' ? 'Student results' : 'Subject'}</Badge></div>
          <div class="divide-y divide-outline-variant bg-surface-container-lowest">
            {#each group.tests as test (test.id)}
              {@const summary = appState.summaryForTest(test.id)}
              {@const result = resultForStudent(test)}
              <button class="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-primary-container/40" onclick={() => onopentest(test.id)}>
                <div class="grid size-11 shrink-0 place-items-center rounded-2xl bg-surface-container text-on-surface-variant"><ClipboardText size={20} weight="duotone" /></div>
                <div class="min-w-0 flex-1"><div class="flex flex-wrap items-center gap-2"><p class="truncate text-sm font-medium">{test.name}</p>{#if mode === 'student'}<Badge tone={resultTone(test)}>{resultLabel(test)}</Badge>{/if}</div><p class="mt-1 type-label-medium text-on-surface-variant">{dateLabel(test.date)} · Class {groupName(test)} · {test.totalMarks} total marks</p>{#if mode === 'subject'}<p class="mt-1 type-label-medium text-on-surface-variant">{summary?.numericCount ?? 0} results · {summary?.absentCount ?? 0} absent · {summary?.notEnteredCount ?? 0} not entered · {summary?.average == null ? 'No average' : `${marksPercentage(summary.average, test.totalMarks).toFixed(2)}% average`}</p>{:else if result?.status === 'marks'}<p class="mt-1 type-label-medium text-on-surface-variant">{marksPercentage(result.marks ?? 0, test.totalMarks).toFixed(2)}%</p>{/if}</div>
                <CaretRight size={18} weight="bold" class="shrink-0 text-on-surface-variant" />
              </button>
            {/each}
          </div>
        </Card>
      {:else}
        <Card class="grid min-h-60 place-items-center border-dashed p-6 text-center"><div><div class="mx-auto grid size-12 place-items-center rounded-2xl bg-surface-container text-on-surface-variant">{#if mode === 'student'}<User size={23} />{:else}<BookOpen size={23} />{/if}</div><h3 class="mt-4 font-medium">No Test Results in this period</h3><p class="mt-1 text-sm text-on-surface-variant">Choose another date, Subject, or Student.</p></div></Card>
      {/each}
    </section>
  </div>
</Screen>

<PrintPeriodicTestReport state={appState} {mode} periodLabel={period.label} tests={reportTests} roster={reportRoster} {aggregate} {subjectId} {studentId} {classGroupId} />
