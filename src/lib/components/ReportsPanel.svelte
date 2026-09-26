<script lang="ts">
  import Calendar from 'phosphor-svelte/lib/Calendar'
  import CalendarBlank from 'phosphor-svelte/lib/CalendarBlank'
  import CalendarDots from 'phosphor-svelte/lib/CalendarDots'
  import ChatText from 'phosphor-svelte/lib/ChatText'
  import Phone from 'phosphor-svelte/lib/Phone'
  import Printer from 'phosphor-svelte/lib/Printer'
  import WhatsappLogo from 'phosphor-svelte/lib/WhatsappLogo'
  import type { AttendanceState } from '../app-state.svelte'
  import { attendanceReport, dateKey, daysInMonth } from '../calculations'
  import { formatAbsenceMessage } from '../messages'
  import type { AttendanceReport, AttendanceReportStudent, ReportPeriodType } from '../types'
  import { displayPhoneNumber, normalizePhoneNumber, phoneCallHref } from '../phone'
  import Badge from './ui/Badge.svelte'
  import BarButton from './ui/BarButton.svelte'
  import Button from './ui/Button.svelte'
  import Card from './ui/Card.svelte'
  import Segmented from './ui/Segmented.svelte'
  import TextField from './ui/TextField.svelte'

  let {
    state: appState,
    onprint,
    onprintabsentees,
  }: {
    state: AttendanceState
    onprint: (report: AttendanceReport) => void
    onprintabsentees: (report: AttendanceReport) => void
  } = $props()

  let type = $state<ReportPeriodType>('daily')
  let reportDate = $state('')
  let initializedRegisterId = $state('')
  let register = $derived(appState.selectedRegister!)
  let rows = $derived(appState.rowsForRegister(register))
  let selectedDay = $derived(Number(reportDate.slice(-2)) || 1)
  let report = $derived(
    attendanceReport(rows, appState.marks, appState.holidays, register, type, selectedDay),
  )
  let absentees = $derived(report.students.filter((student) => student.absent > 0))
  let marked = $derived(report.present + report.absent + report.leave)
  let attendanceRate = $derived(marked ? (report.present / marked) * 100 : 0)
  let minDate = $derived(dateKey(register.year, register.month, 1))
  let maxDate = $derived(
    dateKey(register.year, register.month, daysInMonth(register.year, register.month)),
  )

  const periodOptions: Array<{
    id: ReportPeriodType
    label: string
    description: string
    icon: typeof Calendar
  }> = [
    { id: 'daily', label: 'Daily', description: 'Absentees & messaging', icon: CalendarBlank },
    { id: 'weekly', label: 'Weekly', description: 'Monday to Sunday', icon: Calendar },
    { id: 'monthly', label: 'Monthly', description: 'Full register month', icon: CalendarDots },
  ]

  $effect(() => {
    if (initializedRegisterId === register.id) return
    const today = new Date()
    const isCurrentMonth =
      register.year === today.getFullYear() && register.month === today.getMonth() + 1
    reportDate = dateKey(
      register.year,
      register.month,
      isCurrentMonth ? today.getDate() : daysInMonth(register.year, register.month),
    )
    initializedRegisterId = register.id
  })

  function attendancePercent(student: AttendanceReportStudent) {
    const total = student.present + student.absent + student.leave
    return total ? `${Math.round((student.present / total) * 100)}%` : '—'
  }

  function sessionLabel(student: AttendanceReportStudent) {
    if (student.absentSessions.length === 2) return 'both timings'
    return student.absentSessions[0] === 1 ? 'the first timing' : 'the second timing'
  }

  function messageText(student: AttendanceReportStudent) {
    const schoolName = appState.settings?.schoolName ?? 'school'
    const incharge = appState.settings?.classInchargeName
    const group = appState.classGroups.find((item) => item.id === register.classGroupId)
    return formatAbsenceMessage(appState.settings?.absenceMessageTemplate, {
      student: student.student.name,
      date: report.label,
      session: sessionLabel(student),
      school: schoolName,
      className: group ? `Class ${group.className}, Section ${group.section}` : 'the class',
      roll: student.enrollment.rollNumber,
      incharge: incharge ? `${incharge}, the class incharge` : 'the class incharge',
    })
  }

  function openSms(student: AttendanceReportStudent) {
    const phone = normalizePhoneNumber(student.student.phone)
    window.location.href = `sms:${phone}?body=${encodeURIComponent(messageText(student))}`
  }

  function callStudent(student: AttendanceReportStudent) {
    window.location.href = phoneCallHref(student.student.phone)
  }

  function openWhatsapp(student: AttendanceReportStudent) {
    const recipient = normalizePhoneNumber(student.student.phone).replace('+', '')
    window.open(
      `https://wa.me/${recipient}?text=${encodeURIComponent(messageText(student))}`,
      '_blank',
      'noopener,noreferrer',
    )
  }

  function hasValidPhone(value: string) {
    try {
      return Boolean(normalizePhoneNumber(value))
    } catch {
      return false
    }
  }
</script>

<section class="space-y-4">
  <Segmented label="Report period" bind:value={type} options={periodOptions.map((option) => ({ value: option.id, label: option.label }))} />

  <Card class="p-4">
    <div class="flex items-end gap-3">
      <div class="min-w-0 flex-1">
        {#if type !== 'monthly'}
          <TextField label={type === 'daily' ? 'Report date' : 'Any date in the week'} bind:value={reportDate} type="date" min={minDate} max={maxDate} />
        {:else}
          <p class="type-label-medium text-on-surface-variant">Report period</p>
          <p class="type-title-medium text-on-surface">{report.label}</p>
        {/if}
      </div>
      <Button variant="secondary" class="h-14! rounded-xl!" onclick={() => onprint(report)}><Printer size={20} /> Print</Button>
    </div>
    {#if type !== 'monthly'}<p class="type-body-small mt-2 px-1 text-on-surface-variant">{report.label}</p>{/if}

    <div class="mt-4 flex items-end justify-between gap-3 border-t border-outline-variant pt-4">
      <div>
        <p class="type-display-small leading-none text-on-surface">{attendanceRate.toFixed(1)}<span class="type-title-large text-on-surface-variant">%</span></p>
        <p class="type-label-medium mt-1 text-on-surface-variant">Attendance</p>
      </div>
      <div class="grid grid-cols-4 gap-3 text-center">
        {#each [
          { label: 'Present', value: report.present, dot: 'bg-primary' },
          { label: 'Absent', value: report.absent, dot: 'bg-error' },
          { label: 'Leave', value: report.leave, dot: 'bg-amber-500' },
          { label: 'Blank', value: report.unmarked, dot: 'bg-outline' },
        ] as stat (stat.label)}
          <div>
            <p class="type-title-medium text-on-surface">{stat.value}</p>
            <p class="type-label-small flex items-center justify-center gap-1 text-on-surface-variant"><span class={`size-1.5 rounded-full ${stat.dot}`}></span>{stat.label}</p>
          </div>
        {/each}
      </div>
    </div>
  </Card>

  {#if type === 'daily'}
    <section>
      <div class="flex min-h-10 items-center justify-between gap-3 pb-1 pl-4">
        <h2 class="type-title-small text-primary">Absent · {absentees.length}</h2>
        <Button variant="ghost" size="sm" disabled={!absentees.length} onclick={() => onprintabsentees(report)}><Printer size={18} /> Print list</Button>
      </div>
      {#if absentees.length}
        <div class="flex flex-col gap-0.5 [&>*]:rounded-[4px] [&>*]:bg-surface-container-lowest [&>*:first-child]:rounded-t-[20px] [&>*:last-child]:rounded-b-[20px]">
          {#each absentees as student (student.enrollment.id)}
            <div class="flex min-h-[4.5rem] items-center gap-3 py-2 pl-4 pr-2">
              {#if student.student.photoDataUrl}
                <img src={student.student.photoDataUrl} alt="" class="size-10 shrink-0 rounded-full object-cover" />
              {:else}
                <span class="type-title-medium grid size-10 shrink-0 place-items-center rounded-full bg-error-container text-on-error-container">{student.enrollment.rollNumber}</span>
              {/if}
              <div class="min-w-0 flex-1">
                <p class="type-body-large truncate text-on-surface">{student.student.name}</p>
                <p class="type-body-small truncate text-on-surface-variant">Absent {sessionLabel(student)} · {student.student.phone ? displayPhoneNumber(student.student.phone) : 'No phone'}</p>
              </div>
              {#if hasValidPhone(student.student.phone)}
                <div class="flex shrink-0">
                  <BarButton label={`Call ${student.student.name}`} onclick={() => callStudent(student)}><Phone /></BarButton>
                  <BarButton label={`SMS ${student.student.name}`} onclick={() => openSms(student)}><ChatText /></BarButton>
                  <BarButton label={`WhatsApp ${student.student.name}`} class="text-primary!" onclick={() => openWhatsapp(student)}><WhatsappLogo /></BarButton>
                </div>
              {:else}
                <Badge tone="warning">No phone</Badge>
              {/if}
            </div>
          {/each}
        </div>
        <p class="type-body-small px-4 pt-2 text-on-surface-variant">Messages open prefilled in SMS or WhatsApp. Nothing is sent automatically.</p>
      {:else}
        <Card><p class="type-body-medium px-4 py-8 text-center text-on-surface-variant">No students are marked absent on this date.</p></Card>
      {/if}
    </section>
  {/if}

  <section>
    <h2 class="type-title-small flex min-h-10 items-center px-4 pb-1 text-primary">Students</h2>
    <div class="flex flex-col gap-0.5 md:hidden [&>*]:rounded-[4px] [&>*]:bg-surface-container-lowest [&>*:first-child]:rounded-t-[20px] [&>*:last-child]:rounded-b-[20px]">
      {#each report.students as student (student.enrollment.id)}
        <div class="flex min-h-14 items-center gap-3 px-4 py-2">
          <span class="type-label-large w-7 shrink-0 text-on-surface-variant">{student.enrollment.rollNumber}</span>
          <div class="min-w-0 flex-1">
            <p class="type-body-large truncate text-on-surface">{student.student.name}</p>
            <p class="type-body-small text-on-surface-variant">P {student.present} · A {student.absent} · L {student.leave}{student.unmarked ? ` · blank ${student.unmarked}` : ''}</p>
          </div>
          <span class="type-title-medium shrink-0 tabular-nums text-on-surface">{attendancePercent(student)}</span>
        </div>
      {:else}
        <p class="type-body-medium px-4 py-8 text-center text-on-surface-variant">No students are enrolled in this register.</p>
      {/each}
    </div>
    <Card class="hidden overflow-hidden md:block">
      <table class="w-full text-sm">
        <thead class="type-label-medium bg-surface-container-high text-on-surface-variant">
          <tr><th class="px-4 py-3 text-left">Roll</th><th class="px-4 py-3 text-left">Name with parentage</th><th class="px-3 py-3 text-center">Present</th><th class="px-3 py-3 text-center">Absent</th><th class="px-3 py-3 text-center">Leave</th><th class="px-3 py-3 text-center">Unmarked</th><th class="px-4 py-3 text-right">Attendance</th></tr>
        </thead>
        <tbody class="divide-y divide-outline-variant">
          {#each report.students as student (student.enrollment.id)}
            <tr><td class="px-4 py-3 text-on-surface-variant">{student.enrollment.rollNumber}</td><td class="px-4 py-3 text-on-surface">{student.student.name}</td><td class="px-3 py-3 text-center">{student.present}</td><td class="px-3 py-3 text-center text-error">{student.absent}</td><td class="px-3 py-3 text-center">{student.leave}</td><td class="px-3 py-3 text-center text-on-surface-variant">{student.unmarked}</td><td class="px-4 py-3 text-right font-medium text-primary">{attendancePercent(student)}</td></tr>
          {/each}
        </tbody>
      </table>
    </Card>
    <p class="type-body-small px-4 pt-2 text-on-surface-variant">Each timing counts as 0.5. Weekends, holidays and dates before enrollment are excluded.</p>
  </section>
</section>
