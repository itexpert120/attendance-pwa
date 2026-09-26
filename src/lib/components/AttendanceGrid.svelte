<script lang="ts">
  import CalendarOff from 'phosphor-svelte/lib/CalendarX'
  import CaretDown from 'phosphor-svelte/lib/CaretDown'
  import ChevronLeft from 'phosphor-svelte/lib/CaretLeft'
  import ChevronRight from 'phosphor-svelte/lib/CaretRight'
  import CheckCheck from 'phosphor-svelte/lib/Checks'
  import Eraser from 'phosphor-svelte/lib/Eraser'
  import Info from 'phosphor-svelte/lib/Info'
  import Lock from 'phosphor-svelte/lib/LockSimple'
  import type { AttendanceState } from '../app-state.svelte'
  import { SvelteMap } from 'svelte/reactivity'
  import {
    ATTENDANCE_MARK_VALUE,
    customHolidayForDay,
    dateKey,
    daysForRegister,
    isEnrollmentActiveOn,
    isAttendanceDateEditable,
    isHolidayDay,
    isRegisterEarlierInAcademicYear,
    isWeekend,
    presentAttendanceByEnrollment,
    weekdayLabel,
  } from '../calculations'
  import type { AttendanceStatus, SessionNumber } from '../types'
  import Badge from './ui/Badge.svelte'
  import Button from './ui/Button.svelte'
  import Modal from './ui/Modal.svelte'
  import Segmented from './ui/Segmented.svelte'
  import TextField from './ui/TextField.svelte'

  let {
    state: appState,
    onmanagestudents,
  }: {
    state: AttendanceState
    onmanagestudents: () => void
  } = $props()

  let selectedDay = $state(1)
  let selectedSession = $state<SessionNumber>(1)
  let initializedRegisterId = $state('')
  let holidayReasonOpen = $state(false)
  let holidayReason = $state('')
  let holidayError = $state('')

  let register = $derived(appState.selectedRegister!)
  let rows = $derived(appState.attendanceRowsForRegister(register))
  let visibleEnrollmentIds = $derived(new Set(rows.map((row) => row.enrollment.id)))
  let days = $derived(daysForRegister(register))
  let selectedDateLabel = $derived(
    new Intl.DateTimeFormat('en', { weekday: 'long', day: 'numeric', month: 'long' }).format(
      new Date(register.year, register.month - 1, selectedDay),
    ),
  )
  let markMap = $derived(
    new Map(
      appState.marks
        .filter((mark) => mark.registerId === register.id)
        .map((mark) => [`${mark.enrollmentId}:${mark.day}:${mark.session}`, mark.status]),
    ),
  )
  let currentPresentByEnrollment = $derived(
    presentAttendanceByEnrollment(appState.marks, new Set([register.id])),
  )
  let previousRegisterIds = $derived(
    new Set(
      appState.settings
        ? appState.registers
            .filter((item) =>
              isRegisterEarlierInAcademicYear(item, register, appState.settings!),
            )
            .map((item) => item.id)
        : [],
    ),
  )
  let broughtForwardByEnrollment = $derived(
    presentAttendanceByEnrollment(appState.marks, previousRegisterIds),
  )
  let currentPresentTotal = $derived(
    rows.reduce((sum, row) => sum + (currentPresentByEnrollment.get(row.enrollment.id) ?? 0), 0),
  )
  let broughtForwardTotal = $derived(
    rows.reduce((sum, row) => sum + (broughtForwardByEnrollment.get(row.enrollment.id) ?? 0), 0),
  )
  let presentByDaySession = $derived.by(() => {
    const totals = new SvelteMap<string, number>()
    for (const mark of appState.marks) {
      if (mark.registerId !== register.id || mark.status !== 'P' || !visibleEnrollmentIds.has(mark.enrollmentId)) continue
      const key = `${mark.day}:${mark.session}`
      totals.set(key, (totals.get(key) ?? 0) + ATTENDANCE_MARK_VALUE)
    }
    return totals
  })
  let activeRowsForDay = $derived(
    rows.filter((row) =>
      isEnrollmentActiveOn(
        row.enrollment,
        dateKey(register.year, register.month, selectedDay),
      ),
    ),
  )
  let markedTimingCount = $derived(
    activeRowsForDay.reduce(
      (count, row) =>
        count +
        (cellStatus(row.enrollment.id, selectedDay, 1) ? 1 : 0) +
        (cellStatus(row.enrollment.id, selectedDay, 2) ? 1 : 0),
      0,
    ),
  )
  let selectedDateEditable = $derived(isAttendanceDateEditable(register, selectedDay))
  let selectedCustomHoliday = $derived(
    customHolidayForDay(appState.holidays, register.id, selectedDay),
  )

  $effect(() => {
    if (initializedRegisterId === register.id) return
    const today = new Date()
    selectedDay =
      register.year === today.getFullYear() && register.month === today.getMonth() + 1
        ? Math.min(today.getDate(), days.length)
        : 1
    initializedRegisterId = register.id
  })

  const statuses: Array<{ value: AttendanceStatus; label: string; class: string }> = [
    { value: 'P', label: 'Present', class: 'border-transparent bg-primary-container text-on-primary-container' },
    { value: 'A', label: 'Absent', class: 'border-transparent bg-error-container text-on-error-container' },
    { value: 'L', label: 'Leave', class: 'border-transparent bg-warning-container text-on-warning-container' },
  ]

  function cellStatus(enrollmentId: string, day: number, session: SessionNumber) {
    return markMap.get(`${enrollmentId}:${day}:${session}`) ?? null
  }

  function cycleStatus(status: AttendanceStatus | null): AttendanceStatus | null {
    if (!status) return 'P'
    if (status === 'P') return 'A'
    if (status === 'A') return 'L'
    return null
  }

  function cellClass(status: AttendanceStatus | null, disabled: boolean, holiday: boolean) {
    if (holiday) return 'border-transparent bg-surface-container-highest text-on-surface-variant'
    if (disabled) return 'border-transparent bg-surface-container text-on-surface/30'
    if (status === 'P') return 'border-transparent bg-primary text-on-primary'
    if (status === 'A') return 'border-transparent bg-error text-on-error'
    if (status === 'L') return 'border-transparent bg-warning-container text-on-warning-container'
    return 'border-outline bg-transparent text-on-surface-variant'
  }

  function moveFocus(row: number, column: number) {
    document.querySelector<HTMLButtonElement>(`[data-attendance-cell="${row}:${column}"]`)?.focus()
  }

  function handleCellKeydown(
    event: KeyboardEvent,
    rowIndex: number,
    columnIndex: number,
    day: number,
    session: SessionNumber,
  ) {
    const key = event.key.toLowerCase()
    if (['p', 'a', 'l', 'delete', 'backspace'].includes(key)) {
      event.preventDefault()
      const status = key === 'delete' || key === 'backspace' ? null : (key.toUpperCase() as AttendanceStatus)
      const enrollment = rows[rowIndex]?.enrollment
      if (enrollment) void appState.setMark(register, enrollment, day, session, status)
      return
    }
    const movement: Record<string, [number, number]> = {
      ArrowUp: [rowIndex - 1, columnIndex],
      ArrowDown: [rowIndex + 1, columnIndex],
      ArrowLeft: [rowIndex, columnIndex - 1],
      ArrowRight: [rowIndex, columnIndex + 1],
    }
    if (movement[event.key]) {
      event.preventDefault()
      moveFocus(...movement[event.key])
    }
  }

  function attendanceForSession(day: number, session: SessionNumber) {
    return presentByDaySession.get(`${day}:${session}`) ?? 0
  }

  function moveSelectedDay(direction: -1 | 1) {
    selectedDay = Math.max(1, Math.min(days.length, selectedDay + direction))
  }

  async function requestHolidayChange() {
    if (isWeekend(register.year, register.month, selectedDay)) return
    if (selectedCustomHoliday) {
      await appState.toggleHoliday(register, selectedDay)
      return
    }
    const hasMarks = appState.marks.some(
      (mark) => mark.registerId === register.id && mark.day === selectedDay,
    )
    if (hasMarks && !window.confirm('Making this day a holiday will clear its attendance marks. Continue?')) return
    holidayReason = ''
    holidayError = ''
    holidayReasonOpen = true
  }

  async function saveHoliday(event: SubmitEvent) {
    event.preventDefault()
    holidayError = ''
    if (!holidayReason.trim()) {
      holidayError = 'Enter a reason for the holiday.'
      return
    }
    await appState.toggleHoliday(register, selectedDay, holidayReason)
    holidayReasonOpen = false
  }
</script>

<section class="space-y-3">
  {#if selectedDateEditable && rows.length > 0 && activeRowsForDay.length === 0}
    <div class="flex flex-col gap-2 rounded-xl border border-on-warning-container/20 bg-warning-container px-4 py-3 text-on-warning-container sm:flex-row sm:items-center sm:justify-between">
      <div class="flex items-start gap-2"><Info size={16} class="mt-0.5 shrink-0" /><div><p class="text-xs font-medium">No students were enrolled on {selectedDateLabel}</p><p class="mt-0.5 text-[12px] font-medium leading-4 text-on-warning-container">The date is editable, but each student’s admission date is later. Update the admission date to enable these timings.</p></div></div>
      <Button variant="secondary" size="sm" onclick={onmanagestudents}>Edit student dates</Button>
    </div>
  {/if}
  <div class="hidden flex-col gap-3 rounded-2xl bg-surface-container-lowest p-3 md:flex lg:flex-row lg:items-end">
    <div class="grid grid-cols-2 gap-2 sm:flex sm:items-end">
      <label class="grid gap-1 text-xs font-medium text-on-surface">
        Day
        <select bind:value={selectedDay} class="min-h-10 rounded-lg border border-outline-variant bg-surface-container-lowest px-3 text-sm font-medium outline-none focus:border-primary">
          {#each days as day (day)}<option value={day}>{day} · {weekdayLabel(register.year, register.month, day)}</option>{/each}
        </select>
      </label>
      <label class="grid gap-1 text-xs font-medium text-on-surface">
        Timing
        <select bind:value={selectedSession} class="min-h-10 rounded-lg border border-outline-variant bg-surface-container-lowest px-3 text-sm font-medium outline-none focus:border-primary">
          <option value={1}>First time</option><option value={2}>Second time</option>
        </select>
      </label>
    </div>
    <div class="flex min-w-0 flex-1 flex-wrap items-center gap-2">
      {#each statuses as status (status.value)}
        <Button
          variant="secondary"
          size="sm"
          class={status.class}
          disabled={isHolidayDay(appState.holidays, register, selectedDay) || !selectedDateEditable}
          onclick={() => void appState.bulkSetMarks(register, selectedDay, selectedSession, status.value)}
        >
          <CheckCheck size={15} /> All {status.label}
        </Button>
      {/each}
      <Button variant="ghost" size="sm" disabled={isHolidayDay(appState.holidays, register, selectedDay) || !selectedDateEditable} onclick={() => void appState.bulkSetMarks(register, selectedDay, selectedSession, null)}><Eraser size={15} /> Clear</Button>
      <Button
        variant="secondary"
        size="sm"
        class="border-error/40 bg-error-container text-on-error-container hover:bg-error-container"
        disabled={isWeekend(register.year, register.month, selectedDay) || !selectedDateEditable}
        onclick={() => void requestHolidayChange()}
      >
        <CalendarOff size={15} /> {selectedCustomHoliday ? 'Remove holiday' : 'Mark holiday'}
      </Button>
      {#if selectedCustomHoliday}<Badge tone="danger">{selectedCustomHoliday.title}</Badge>{/if}
    </div>
    {#if selectedDateEditable}
      <Badge tone="info"><Info size={12} /> Tap a cell to cycle P → A → L</Badge>
    {:else}
      <Badge tone="warning"><Lock size={12} /> View only · edit today or the previous 7 days</Badge>
    {/if}
  </div>

  <div class="space-y-4 md:hidden">
    <div class="flex items-center gap-1 rounded-2xl bg-surface-container-lowest p-2">
      <button
        class="state-layer grid size-12 shrink-0 place-items-center rounded-full text-on-surface-variant disabled:opacity-38"
        disabled={selectedDay === 1}
        aria-label="Previous date"
        onclick={() => moveSelectedDay(-1)}
      ><ChevronLeft size={19} weight="bold" /></button>
      <label class="relative flex min-h-11 min-w-0 flex-1 cursor-pointer flex-col items-center justify-center text-center">
        <span class="type-title-medium flex items-center gap-1 truncate text-on-surface">{selectedDateLabel}<CaretDown size={13} weight="bold" class="shrink-0 text-on-surface-variant" /></span>
        <span class="type-body-small text-on-surface-variant">
          {#if isHolidayDay(appState.holidays, register, selectedDay)}Holiday{:else if !selectedDateEditable}View only{:else}{markedTimingCount} of {activeRowsForDay.length * 2} timings marked{/if}
        </span>
        <select
          bind:value={selectedDay}
          class="absolute inset-0 size-full cursor-pointer opacity-0"
          aria-label="Attendance date"
        >
          {#each days as day (day)}<option value={day}>{day} · {weekdayLabel(register.year, register.month, day)}</option>{/each}
        </select>
      </label>
      <button
        class="state-layer grid size-12 shrink-0 place-items-center rounded-full text-on-surface-variant disabled:opacity-38"
        disabled={selectedDay === days.length}
        aria-label="Next date"
        onclick={() => moveSelectedDay(1)}
      ><ChevronRight size={19} weight="bold" /></button>
    </div>

    {#if !selectedDateEditable}
      <div class="type-body-medium flex items-start gap-3 rounded-2xl bg-warning-container px-4 py-3 text-on-warning-container"><Lock size={17} weight="bold" class="mt-0.5 shrink-0" />This date is view only. Attendance can be edited for today and the previous 7 days.</div>
    {/if}
    {#if selectedCustomHoliday}
      <div class="type-body-medium flex items-start gap-3 rounded-2xl bg-surface-container-highest px-4 py-3 text-on-surface"><CalendarOff size={17} weight="bold" class="mt-0.5 shrink-0" /><span><span class="block font-medium">Holiday</span>{selectedCustomHoliday.title}</span></div>
    {/if}

    <section class="rounded-2xl bg-surface-container-lowest p-4">
      <div class="flex items-center justify-between gap-3 pb-3">
        <p class="type-title-small text-on-surface">Mark everyone</p>
        <button
          class="state-layer type-label-large -my-1 -mr-2 inline-flex h-10 items-center gap-2 rounded-full px-3 text-primary disabled:text-on-surface/38"
          disabled={isHolidayDay(appState.holidays, register, selectedDay) || !selectedDateEditable}
          onclick={() => void appState.bulkSetMarks(register, selectedDay, selectedSession, null)}
        ><Eraser size={14} weight="bold" />Clear</button>
      </div>
      <Segmented label="Timing" bind:value={selectedSession} options={[{ value: 1 as SessionNumber, label: 'First timing' }, { value: 2 as SessionNumber, label: 'Second timing' }]} />
      <div class="mt-3 grid grid-cols-3 gap-2">
        {#each statuses as status (status.value)}
          <button
            class={`state-layer type-label-large h-10 rounded-full disabled:opacity-38 ${status.class}`}
            disabled={isHolidayDay(appState.holidays, register, selectedDay) || !selectedDateEditable}
            onclick={() => { navigator.vibrate?.(8); void appState.bulkSetMarks(register, selectedDay, selectedSession, status.value) }}
          >All {status.label}</button>
        {/each}
      </div>
      <button
        class="state-layer type-label-large mt-2 flex h-10 w-full items-center justify-center gap-2 rounded-full text-error disabled:text-on-surface/38"
        disabled={isWeekend(register.year, register.month, selectedDay) || !selectedDateEditable}
        onclick={() => void requestHolidayChange()}
      ><CalendarOff size={16} weight="bold" />{isWeekend(register.year, register.month, selectedDay) ? 'Weekend holiday' : selectedCustomHoliday ? 'Remove school holiday' : 'Mark this date as a holiday'}</button>
    </section>

    <section>
      <div class="type-title-small flex min-h-10 items-center justify-between pb-1 pl-4 pr-2.5 text-primary">
        <span>Students · {rows.length}</span>
        <span class="type-label-medium flex gap-2 text-on-surface-variant"><span class="w-12 text-center">1st</span><span class="w-12 text-center">2nd</span></span>
      </div>
      <div class="flex flex-col gap-0.5 [&>*]:rounded-[4px] [&>*]:bg-surface-container-lowest [&>*:first-child]:rounded-t-[20px] [&>*:last-child]:rounded-b-[20px]">
        {#each rows as row (row.enrollment.id)}
          {@const date = dateKey(register.year, register.month, selectedDay)}
          {@const inactive = !isEnrollmentActiveOn(row.enrollment, date)}
          {@const holiday = isHolidayDay(appState.holidays, register, selectedDay)}
          {@const locked = !selectedDateEditable}
          {@const current = currentPresentByEnrollment.get(row.enrollment.id) ?? 0}
          {@const brought = broughtForwardByEnrollment.get(row.enrollment.id) ?? 0}
          <div class="flex min-h-[4.5rem] items-center gap-4 py-2 pl-4 pr-2.5">
            {#if row.student.photoDataUrl}<img src={row.student.photoDataUrl} alt="" class="size-10 shrink-0 rounded-full object-cover" />{:else}<span class="type-title-medium grid size-10 shrink-0 place-items-center rounded-full bg-secondary-container text-on-secondary-container">{row.enrollment.rollNumber}</span>{/if}
            <div class="min-w-0 flex-1">
              <p class="type-body-large truncate text-on-surface">{row.student.name}</p>
              <p class="type-body-small truncate text-on-surface-variant">{inactive ? `Enrolled from ${row.enrollment.admittedOn}` : `Roll ${row.enrollment.rollNumber} · Month ${current} · Total ${current + brought}`}</p>
            </div>
            <div class="flex shrink-0 gap-2">
              {#each [1, 2] as session (session)}
                {@const status = cellStatus(row.enrollment.id, selectedDay, session as SessionNumber)}
                <button
                  class={`state-layer type-title-medium grid size-12 place-items-center rounded-xl border outline-none transition-[background-color,border-radius] duration-200 focus-visible:ring-2 focus-visible:ring-primary ${status ? 'rounded-3xl' : ''} ${cellClass(status, inactive || locked, holiday)}`}
                  disabled={holiday || inactive || locked}
                  aria-label={`${row.student.name}, ${session === 1 ? 'first' : 'second'} timing, ${holiday ? 'holiday' : inactive ? 'not enrolled' : locked ? 'view only' : status ?? 'unmarked'}`}
                  onclick={() => { navigator.vibrate?.(6); void appState.setMark(register, row.enrollment, selectedDay, session as SessionNumber, cycleStatus(status)) }}
                >{holiday ? 'H' : inactive ? '–' : status ?? ''}</button>
              {/each}
            </div>
          </div>
        {:else}
          <div class="px-6 py-14 text-center text-[14px] text-on-surface-variant">No students are enrolled for this month.</div>
        {/each}
        {#if rows.length}
          <div class="type-title-small flex items-center gap-3 py-3 pl-4 pr-2.5 text-on-surface">
            <span class="flex-1">Present totals</span>
            <span class="flex gap-2"><span class="w-12 text-center">{isHolidayDay(appState.holidays, register, selectedDay) ? 'H' : attendanceForSession(selectedDay, 1)}</span><span class="w-12 text-center">{isHolidayDay(appState.holidays, register, selectedDay) ? 'H' : attendanceForSession(selectedDay, 2)}</span></span>
          </div>
        {/if}
      </div>
      <p class="type-body-small px-4 pt-2 text-on-surface-variant">Tap a timing to cycle Present → Absent → Leave → blank. Today and the previous 7 days are editable.</p>
    </section>
  </div>

  <div class="hidden overflow-auto rounded-2xl bg-surface-container-lowest md:block" role="region" aria-label="Attendance register table">
    <table class="w-max min-w-full border-separate border-spacing-0 text-center text-[12px]">
      <thead class="sticky top-0 z-30 font-medium text-on-surface">
        <tr>
          <th rowspan="2" class="sticky left-0 z-40 min-w-28 border-b border-r border-outline-variant bg-surface-container px-3 py-2 text-left md:min-w-32">Admission</th>
          <th rowspan="2" class="sticky left-28 z-40 hidden min-w-20 border-b border-r border-outline-variant bg-surface-container px-2 py-2 md:table-cell md:left-32">Roll</th>
          <th rowspan="2" class="sticky left-28 z-40 min-w-44 border-b border-r border-outline-variant bg-surface-container px-3 py-2 text-left md:left-52 md:min-w-52">Name with parentage</th>
          {#each days as day (day)}
            {@const holiday = isHolidayDay(appState.holidays, register, day)}
            <th colspan="2" class={`min-w-20 border-b border-r border-outline-variant px-1 py-1.5 ${holiday ? 'bg-error-container text-on-error-container' : selectedDay === day ? 'bg-primary-container text-on-primary-container' : 'bg-surface-container'}`}>
              <button class="w-full" title={customHolidayForDay(appState.holidays, register.id, day)?.title} onclick={() => (selectedDay = day)}><span class="block text-xs font-medium">{day}</span><span class="text-[12px] uppercase">{weekdayLabel(register.year, register.month, day)}</span></button>
            </th>
          {/each}
          <th rowspan="2" class="min-w-16 border-b border-r border-outline-variant bg-primary-container/40 px-2">Month</th>
          <th rowspan="2" class="min-w-16 border-b border-r border-outline-variant bg-primary-container/40 px-2">B/F</th>
          <th rowspan="2" class="min-w-16 border-b border-outline-variant bg-primary-container px-2">Total</th>
        </tr>
        <tr>
          {#each days as day (day)}
            {@const holiday = isHolidayDay(appState.holidays, register, day)}
            <th class={`border-b border-r border-outline-variant px-1 py-1 ${holiday ? 'bg-error-container text-on-error-container' : 'bg-surface-container'}`}>F</th>
            <th class={`border-b border-r border-outline-variant px-1 py-1 ${holiday ? 'bg-error-container text-on-error-container' : 'bg-surface-container'}`}>S</th>
          {/each}
        </tr>
      </thead>
      <tbody>
        {#each rows as row, rowIndex (row.enrollment.id)}
          {@const current = currentPresentByEnrollment.get(row.enrollment.id) ?? 0}
          {@const brought = broughtForwardByEnrollment.get(row.enrollment.id) ?? 0}
          <tr class="group">
            <td class="sticky left-0 z-20 border-b border-r border-outline-variant bg-surface-container-lowest px-3 py-2 text-left font-medium text-on-surface group-hover:bg-surface-container-low">{row.student.admissionNumber}</td>
            <td class="sticky left-28 z-20 hidden border-b border-r border-outline-variant bg-surface-container-lowest px-2 py-2 font-medium text-on-surface group-hover:bg-surface-container-low md:table-cell md:left-32">{row.enrollment.rollNumber}</td>
            <td class="sticky left-28 z-20 border-b border-r border-outline-variant bg-surface-container-lowest px-3 py-2 text-left group-hover:bg-surface-container-low md:left-52">
              <div class="flex items-center gap-2">{#if row.student.photoDataUrl}<img src={row.student.photoDataUrl} alt="" class="size-7 shrink-0 rounded-lg border border-outline-variant object-cover" />{/if}<span class="block max-w-44 truncate font-medium text-on-surface">{row.student.name}</span></div>
              <span class="mt-0.5 block text-[12px] text-on-surface-variant md:hidden">Roll {row.enrollment.rollNumber}</span>
            </td>
            {#each days as day (day)}
              {@const holiday = isHolidayDay(appState.holidays, register, day)}
              {@const date = dateKey(register.year, register.month, day)}
              {@const inactive = !isEnrollmentActiveOn(row.enrollment, date)}
              {@const locked = !isAttendanceDateEditable(register, day)}
              {#each [1, 2] as session (session)}
                {@const status = cellStatus(row.enrollment.id, day, session as SessionNumber)}
                <td class="border-b border-r border-outline-variant p-0.5">
                  <button
                    data-attendance-cell={`${rowIndex}:${(day - 1) * 2 + session - 1}`}
                    class={`grid size-8 place-items-center rounded-md border text-[12px] font-medium outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 ${cellClass(status, inactive || locked, holiday)}`}
                    disabled={holiday || inactive || locked}
                    aria-label={`${row.student.name}, day ${day}, ${session === 1 ? 'first' : 'second'} timing, ${holiday ? 'holiday' : inactive ? 'not enrolled' : locked ? 'view only' : status ?? 'unmarked'}`}
                    onclick={() => void appState.setMark(register, row.enrollment, day, session as SessionNumber, cycleStatus(status))}
                    onkeydown={(event) => handleCellKeydown(event, rowIndex, (day - 1) * 2 + session - 1, day, session as SessionNumber)}
                  >
                    {holiday ? 'H' : inactive ? '–' : status ?? ''}
                  </button>
                </td>
              {/each}
            {/each}
            <td class="border-b border-r border-outline-variant bg-primary-container/40 px-2 font-medium text-on-primary-container">{current}</td>
            <td class="border-b border-r border-outline-variant bg-primary-container/40 px-2 font-medium text-on-primary-container">{brought}</td>
            <td class="border-b border-outline-variant bg-primary-container px-2 font-medium text-on-primary-container">{current + brought}</td>
          </tr>
        {:else}
          <tr><td colspan={days.length * 2 + 6} class="px-8 py-16 text-center text-sm text-on-surface-variant">No students are enrolled for this month. Add them from the Students menu.</td></tr>
        {/each}
      </tbody>
      {#if rows.length}
        <tfoot class="sticky bottom-0 z-30 font-medium text-on-surface">
          <tr>
            <td class="sticky left-0 z-40 border-r border-t border-outline-variant bg-surface-container px-3 py-2 text-left" colspan="1">Column totals</td>
            <td class="sticky left-28 z-40 hidden border-r border-t border-outline-variant bg-surface-container md:table-cell md:left-32"></td>
            <td class="sticky left-28 z-40 border-r border-t border-outline-variant bg-surface-container md:left-52"></td>
            {#each days as day (day)}
              {#each [1, 2] as session (session)}
                <td class="border-r border-t border-outline-variant bg-surface-container px-1 py-2">{isHolidayDay(appState.holidays, register, day) ? 'H' : attendanceForSession(day, session as SessionNumber)}</td>
              {/each}
            {/each}
            <td class="border-r border-t border-outline-variant bg-primary-container/40 px-2">{currentPresentTotal}</td>
            <td class="border-r border-t border-outline-variant bg-primary-container/40 px-2">{broughtForwardTotal}</td>
            <td class="border-t border-outline-variant bg-primary-container px-2">{currentPresentTotal + broughtForwardTotal}</td>
          </tr>
        </tfoot>
      {/if}
    </table>
  </div>
</section>

<Modal bind:open={holidayReasonOpen} title="Mark school holiday" description={`Add the reason for ${selectedDateLabel}. Attendance already recorded for this date will be cleared.`} size="sm">
  <form class="grid gap-4" onsubmit={saveHoliday}>
    <TextField label="Holiday reason" bind:value={holidayReason} required placeholder="e.g. Independence Day" autocomplete="off" />
    {#if holidayError}<p class="rounded-2xl bg-error-container px-4 py-3 text-[13px] font-medium text-on-error-container">{holidayError}</p>{/if}
    <Button type="submit" variant="danger" class="w-full"><CalendarOff size={16} /> Mark as holiday</Button>
  </form>
</Modal>
