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
  import type { AttendanceReport, AttendanceReportStudent, ReportPeriodType } from '../types'
  import { displayPhoneNumber, normalizePhoneNumber, phoneCallHref } from '../phone'
  import Badge from './ui/Badge.svelte'
  import Button from './ui/Button.svelte'
  import Card from './ui/Card.svelte'
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
    return `Dear Parent/Guardian, ${student.student.name} was marked absent for ${sessionLabel(student)} on ${report.label} at ${schoolName}. Please contact${incharge ? ` ${incharge}, the class incharge,` : ' the class incharge'} if this is unexpected.`
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
  <Card class="overflow-hidden">
    <div class="grid grid-cols-3 border-b border-paper-200 bg-paper-100 p-1.5">
      {#each periodOptions as option (option.id)}
        <button
          class={`min-h-14 rounded-xl px-2 py-2 text-center transition ${type === option.id ? 'bg-white text-ink-950 shadow-sm ring-1 ring-paper-200' : 'text-ink-600 hover:text-ink-950'}`}
          aria-pressed={type === option.id}
          onclick={() => (type = option.id)}
        >
          <option.icon size={17} weight="bold" class="mx-auto" />
          <span class="mt-1 block text-[11px] font-extrabold">{option.label}</span>
          <span class="mt-0.5 hidden text-[9px] font-semibold sm:block">{option.description}</span>
        </button>
      {/each}
    </div>
    <div class="flex flex-col gap-3 p-4 sm:flex-row sm:items-end sm:justify-between">
      <div class="min-w-0">
        {#if type !== 'monthly'}
          <TextField label={type === 'daily' ? 'Report date' : 'Choose a date in the week'} bind:value={reportDate} type="date" min={minDate} max={maxDate} />
        {:else}
          <p class="text-[10px] font-extrabold uppercase tracking-[0.12em] text-ink-600">Report period</p>
          <p class="mt-1 font-display text-xl font-semibold text-ink-950">{report.label}</p>
        {/if}
      </div>
      <div class="flex items-center justify-between gap-3 sm:justify-end">
        <div class="min-w-0 sm:text-right">
          <p class="text-[10px] font-extrabold uppercase tracking-[0.1em] text-ink-600">{type} report</p>
          <p class="mt-0.5 truncate text-xs font-bold text-ink-950">{report.label}</p>
        </div>
        <Button onclick={() => onprint(report)}><Printer size={17} weight="bold" /> Print</Button>
      </div>
    </div>
  </Card>

  <div class="grid grid-cols-2 gap-3 lg:grid-cols-5">
    {#each [
      { label: 'Present', value: report.present, tone: 'text-register-900', surface: 'bg-register-100' },
      { label: 'Absent', value: report.absent, tone: 'text-red-900', surface: 'bg-red-100' },
      { label: 'Leave', value: report.leave, tone: 'text-yellow-900', surface: 'bg-yellow-100' },
      { label: 'Unmarked', value: report.unmarked, tone: 'text-ink-800', surface: 'bg-paper-100' },
      { label: 'Attendance', value: `${attendanceRate.toFixed(1)}%`, tone: 'text-register-900', surface: 'bg-register-50' },
    ] as stat (stat.label)}
      <Card class={`p-4 ${stat.surface}`}>
        <p class={`text-2xl font-black tracking-tight ${stat.tone}`}>{stat.value}</p>
        <p class="mt-1 text-[10px] font-extrabold uppercase tracking-[0.08em] text-ink-600">{stat.label}</p>
      </Card>
    {/each}
  </div>

  {#if type === 'daily'}
    <Card class="overflow-hidden">
      <div class="flex flex-col gap-2 border-b border-paper-200 bg-red-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div class="flex items-center gap-2"><h2 class="text-sm font-extrabold text-red-950">Absent students</h2><Badge tone={absentees.length ? 'danger' : 'success'}>{absentees.length}</Badge></div>
          <p class="mt-1 text-[10px] font-semibold leading-4 text-red-900/70">Call directly, or open SMS and WhatsApp with the absence message prefilled. Nothing is sent automatically.</p>
        </div>
        <Button variant="secondary" size="sm" disabled={!absentees.length} onclick={() => onprintabsentees(report)}><Printer size={16} weight="bold" /> Print absentee list</Button>
      </div>
      <div class="divide-y divide-paper-200 bg-white">
        {#each absentees as student (student.enrollment.id)}
          <div class="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center">
            <div class="flex min-w-0 items-center gap-3 sm:flex-1">
              {#if student.student.photoDataUrl}
                <img src={student.student.photoDataUrl} alt={`${student.student.name} profile`} class="size-12 shrink-0 rounded-xl border border-paper-200 object-cover shadow-sm" />
              {/if}
              <div class="min-w-0 flex-1">
                <p class="truncate text-sm font-bold text-ink-950">{student.student.name}</p>
                <p class="mt-0.5 text-[10px] font-semibold text-ink-600">Roll {student.enrollment.rollNumber} · Absent for {sessionLabel(student)}</p>
                <p class="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] font-semibold text-ink-600"><span class="inline-flex items-center gap-1"><CalendarBlank size={13} weight="bold" /> {report.label}</span><span>{student.student.phone ? displayPhoneNumber(student.student.phone) : 'No phone number'}</span></p>
              </div>
            </div>
            {#if hasValidPhone(student.student.phone)}
              <div class="grid grid-cols-3 gap-2 sm:flex">
                <Button variant="secondary" size="sm" onclick={() => callStudent(student)}><Phone size={16} weight="bold" /> Call</Button>
                <Button variant="secondary" size="sm" onclick={() => openSms(student)}><ChatText size={16} weight="bold" /> SMS</Button>
                <Button variant="soft" size="sm" onclick={() => openWhatsapp(student)}><WhatsappLogo size={16} weight="bold" /> WhatsApp</Button>
              </div>
            {:else}
              <Badge tone="warning">Add phone in Students</Badge>
            {/if}
          </div>
        {:else}
          <div class="px-5 py-10 text-center">
            <p class="text-sm font-bold text-ink-950">No students are marked absent</p>
            <p class="mt-1 text-xs text-ink-600">Explicit A marks for this date will appear here.</p>
          </div>
        {/each}
      </div>
    </Card>
  {/if}

  <Card class="overflow-hidden">
    <div class="border-b border-paper-200 px-4 py-3">
      <h2 class="text-sm font-extrabold text-ink-950">Student attendance detail</h2>
      <p class="mt-1 text-[10px] font-semibold text-ink-600">Counts are per timing. Weekends, holidays, and inactive enrollment dates are excluded.</p>
    </div>
    <div class="overflow-auto">
      <table class="w-full min-w-160 text-xs">
        <thead class="bg-paper-100 text-ink-600">
          <tr><th class="px-4 py-3 text-left">Roll</th><th class="px-4 py-3 text-left">Name with parentage</th><th class="px-3 py-3 text-center">Present</th><th class="px-3 py-3 text-center">Absent</th><th class="px-3 py-3 text-center">Leave</th><th class="px-3 py-3 text-center">Unmarked</th><th class="px-4 py-3 text-right">Attendance</th></tr>
        </thead>
        <tbody class="divide-y divide-paper-200 bg-white">
          {#each report.students as student (student.enrollment.id)}
            <tr><td class="px-4 py-3 font-bold text-ink-950">{student.enrollment.rollNumber}</td><td class="px-4 py-3 font-semibold text-ink-950">{student.student.name}</td><td class="px-3 py-3 text-center font-bold text-register-900">{student.present}</td><td class="px-3 py-3 text-center font-bold text-red-900">{student.absent}</td><td class="px-3 py-3 text-center font-bold text-yellow-900">{student.leave}</td><td class="px-3 py-3 text-center text-ink-600">{student.unmarked}</td><td class="px-4 py-3 text-right font-black text-register-900">{attendancePercent(student)}</td></tr>
          {:else}
            <tr><td colspan="7" class="px-4 py-12 text-center text-ink-600">No students are enrolled in this register.</td></tr>
          {/each}
        </tbody>
      </table>
    </div>
  </Card>
</section>
