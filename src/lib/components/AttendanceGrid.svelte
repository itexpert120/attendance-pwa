<script lang="ts">
  import CalendarOff from 'phosphor-svelte/lib/CalendarX'
  import CaretDown from 'phosphor-svelte/lib/CaretDown'
  import ChevronLeft from 'phosphor-svelte/lib/CaretLeft'
  import ChevronRight from 'phosphor-svelte/lib/CaretRight'
  import CheckCheck from 'phosphor-svelte/lib/Checks'
  import Eraser from 'phosphor-svelte/lib/Eraser'
  import Info from 'phosphor-svelte/lib/Info'
  import type { AttendanceState } from '../app-state.svelte'
  import { SvelteMap } from 'svelte/reactivity'
  import {
    customHolidayForDay,
    dateKey,
    daysForRegister,
    isEnrollmentActiveOn,
    isHolidayDay,
    isRegisterEarlierInAcademicYear,
    isWeekend,
    presentAttendanceByEnrollment,
    weekdayLabel,
  } from '../calculations'
  import type { AttendanceStatus, SessionNumber } from '../types'
  import Badge from './ui/Badge.svelte'
  import Button from './ui/Button.svelte'

  let { state: appState }: { state: AttendanceState } = $props()

  let selectedDay = $state(1)
  let selectedSession = $state<SessionNumber>(1)
  let initializedRegisterId = $state('')

  let register = $derived(appState.selectedRegister!)
  let rows = $derived(appState.rowsForRegister(register))
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
    [...currentPresentByEnrollment.values()].reduce((sum, value) => sum + value, 0),
  )
  let broughtForwardTotal = $derived(
    [...broughtForwardByEnrollment.values()].reduce((sum, value) => sum + value, 0),
  )
  let presentByDaySession = $derived.by(() => {
    const totals = new SvelteMap<string, number>()
    for (const mark of appState.marks) {
      if (mark.registerId !== register.id || mark.status !== 'P') continue
      const key = `${mark.day}:${mark.session}`
      totals.set(key, (totals.get(key) ?? 0) + 1)
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
    { value: 'P', label: 'Present', class: 'border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100' },
    { value: 'A', label: 'Absent', class: 'border-red-300 bg-red-50 text-red-800 hover:bg-red-100' },
    { value: 'L', label: 'Leave', class: 'border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100' },
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
    if (holiday) return 'border-paper-200 bg-paper-100 text-ink-600'
    if (disabled) return 'border-paper-200 bg-slate-50 text-slate-300'
    if (status === 'P') return 'border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
    if (status === 'A') return 'border-red-300 bg-red-50 text-red-800 hover:bg-red-100'
    if (status === 'L') return 'border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100'
    return 'border-paper-200 bg-white text-ink-600 hover:bg-register-50'
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

  async function toggleSelectedHoliday() {
    if (isWeekend(register.year, register.month, selectedDay)) return
    const existing = customHolidayForDay(appState.holidays, register.id, selectedDay)
    if (!existing) {
      const hasMarks = appState.marks.some(
        (mark) => mark.registerId === register.id && mark.day === selectedDay,
      )
      if (hasMarks && !window.confirm('Making this day a holiday will clear its attendance marks. Continue?')) return
    }
    await appState.toggleHoliday(register, selectedDay)
  }
</script>

<section class="space-y-3">
  <div class="hidden flex-col gap-3 rounded-xl border border-paper-200 bg-white p-3 shadow-sm md:flex lg:flex-row lg:items-end">
    <div class="grid grid-cols-2 gap-2 sm:flex sm:items-end">
      <label class="grid gap-1 text-xs font-bold text-ink-800">
        Day
        <select bind:value={selectedDay} class="min-h-10 rounded-lg border border-paper-200 bg-white px-3 text-sm font-semibold outline-none focus:border-register-600">
          {#each days as day (day)}<option value={day}>{day} · {weekdayLabel(register.year, register.month, day)}</option>{/each}
        </select>
      </label>
      <label class="grid gap-1 text-xs font-bold text-ink-800">
        Timing
        <select bind:value={selectedSession} class="min-h-10 rounded-lg border border-paper-200 bg-white px-3 text-sm font-semibold outline-none focus:border-register-600">
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
          disabled={isHolidayDay(appState.holidays, register, selectedDay)}
          onclick={() => void appState.bulkSetMarks(register, selectedDay, selectedSession, status.value)}
        >
          <CheckCheck size={15} /> All {status.label}
        </Button>
      {/each}
      <Button variant="ghost" size="sm" disabled={isHolidayDay(appState.holidays, register, selectedDay)} onclick={() => void appState.bulkSetMarks(register, selectedDay, selectedSession, null)}><Eraser size={15} /> Clear</Button>
      <Button
        variant={customHolidayForDay(appState.holidays, register.id, selectedDay) ? 'danger' : 'soft'}
        size="sm"
        disabled={isWeekend(register.year, register.month, selectedDay)}
        onclick={() => void toggleSelectedHoliday()}
      >
        <CalendarOff size={15} /> {customHolidayForDay(appState.holidays, register.id, selectedDay) ? 'Remove holiday' : 'Mark holiday'}
      </Button>
    </div>
    <Badge tone="info"><Info size={12} /> Tap a cell to cycle P → A → L</Badge>
  </div>

  <div class="space-y-3 md:hidden">
    <div class="overflow-hidden rounded-2xl border border-paper-200 bg-white shadow-soft">
      <div class="flex items-center gap-2 bg-register-900 p-3 text-white">
        <button
          class="grid size-11 shrink-0 place-items-center rounded-xl bg-white/10 transition active:bg-white/20 disabled:opacity-35"
          disabled={selectedDay === 1}
          aria-label="Previous date"
          onclick={() => moveSelectedDay(-1)}
        ><ChevronLeft size={20} weight="bold" /></button>
        <label class="relative flex min-h-11 min-w-0 flex-1 cursor-pointer flex-col justify-center text-center">
          <span class="block text-[9px] font-extrabold uppercase tracking-[0.16em] text-white/55">Attendance date</span>
          <span class="mt-0.5 flex items-center justify-center gap-1 truncate text-sm font-bold">{selectedDateLabel}<CaretDown size={13} weight="bold" class="shrink-0 text-white/60" /></span>
          <select
            bind:value={selectedDay}
            class="absolute inset-0 size-full cursor-pointer opacity-0"
            aria-label="Attendance date"
          >
            {#each days as day (day)}<option value={day}>{day} · {weekdayLabel(register.year, register.month, day)}</option>{/each}
          </select>
        </label>
        <button
          class="grid size-11 shrink-0 place-items-center rounded-xl bg-white/10 transition active:bg-white/20 disabled:opacity-35"
          disabled={selectedDay === days.length}
          aria-label="Next date"
          onclick={() => moveSelectedDay(1)}
        ><ChevronRight size={20} weight="bold" /></button>
      </div>

      <div class="space-y-4 p-3.5">
        <div>
          <p class="mb-1.5 text-[10px] font-extrabold uppercase tracking-[0.12em] text-ink-600">Bulk timing</p>
          <div class="grid grid-cols-2 gap-1 rounded-xl bg-paper-100 p-1">
          <button
            class={`min-h-11 rounded-lg text-xs font-extrabold transition ${selectedSession === 1 ? 'bg-white text-ink-950 shadow-sm ring-1 ring-paper-200' : 'text-ink-600'}`}
            onclick={() => (selectedSession = 1)}
          >First timing</button>
          <button
            class={`min-h-11 rounded-lg text-xs font-extrabold transition ${selectedSession === 2 ? 'bg-white text-ink-950 shadow-sm ring-1 ring-paper-200' : 'text-ink-600'}`}
            onclick={() => (selectedSession = 2)}
          >Second timing</button>
          </div>
        </div>

        <div>
          <div class="mb-1.5 flex items-center justify-between gap-3">
            <p class="text-[10px] font-extrabold uppercase tracking-[0.12em] text-ink-600">Mark everyone</p>
            <button
              class="min-h-11 rounded-lg px-2.5 text-[10px] font-extrabold text-ink-600 transition active:bg-paper-100 disabled:opacity-40"
              disabled={isHolidayDay(appState.holidays, register, selectedDay)}
              onclick={() => void appState.bulkSetMarks(register, selectedDay, selectedSession, null)}
            ><Eraser size={14} weight="bold" class="mr-1 inline" />Clear</button>
          </div>
          <div class="grid grid-cols-3 gap-2">
          {#each statuses as status (status.value)}
            <button
              class={`min-h-12 rounded-xl border text-xs font-extrabold transition active:translate-y-px disabled:opacity-40 ${status.class}`}
              disabled={isHolidayDay(appState.holidays, register, selectedDay)}
              onclick={() => void appState.bulkSetMarks(register, selectedDay, selectedSession, status.value)}
            ><span class="block text-sm">{status.value}</span><span class="mt-0.5 block text-[9px] opacity-75">{status.label}</span></button>
          {/each}
          </div>
        </div>

        <button
          class={`flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border text-xs font-extrabold transition active:translate-y-px disabled:opacity-45 ${customHolidayForDay(appState.holidays, register.id, selectedDay) ? 'border-red-300 bg-red-50 text-red-800' : 'border-paper-200 bg-paper-50 text-ink-800'}`}
          disabled={isWeekend(register.year, register.month, selectedDay)}
          onclick={() => void toggleSelectedHoliday()}
        ><CalendarOff size={16} weight="bold" />{isWeekend(register.year, register.month, selectedDay) ? 'Weekend holiday' : customHolidayForDay(appState.holidays, register.id, selectedDay) ? 'Remove school holiday' : 'Mark this date as a holiday'}</button>
      </div>
    </div>

    <div class="overflow-hidden rounded-2xl border border-paper-200 bg-white shadow-soft">
      <div class="grid grid-cols-[minmax(0,1fr)_3.75rem_3.75rem] items-center border-b border-paper-200 bg-paper-100 px-3 py-2.5 text-[9px] font-extrabold uppercase tracking-[0.1em] text-ink-600">
        <span>Students <span class="ml-1 normal-case tracking-normal text-register-700">{isHolidayDay(appState.holidays, register, selectedDay) ? 'Holiday' : `${markedTimingCount}/${activeRowsForDay.length * 2} marked`}</span></span><span class="text-center">First</span><span class="text-center">Second</span>
      </div>
      <div class="divide-y divide-paper-200">
        {#each rows as row (row.enrollment.id)}
          {@const date = dateKey(register.year, register.month, selectedDay)}
          {@const inactive = !isEnrollmentActiveOn(row.enrollment, date)}
          {@const holiday = isHolidayDay(appState.holidays, register, selectedDay)}
          {@const current = currentPresentByEnrollment.get(row.enrollment.id) ?? 0}
          {@const brought = broughtForwardByEnrollment.get(row.enrollment.id) ?? 0}
          <div class="grid grid-cols-[minmax(0,1fr)_3.75rem_3.75rem] items-center gap-1 px-3 py-3">
            <div class="min-w-0 pr-2">
              <div class="flex items-center gap-2"><span class="grid size-7 shrink-0 place-items-center rounded-lg bg-paper-100 text-[10px] font-extrabold text-ink-800">{row.enrollment.rollNumber}</span><p class="truncate text-[13px] font-bold text-ink-950">{row.student.name}</p></div>
              <p class="mt-1 truncate pl-9 text-[9px] font-semibold text-ink-600">Adm. {row.student.admissionNumber} · Month {current} · B/F {brought} · Total {current + brought}</p>
            </div>
            {#each [1, 2] as session (session)}
              {@const status = cellStatus(row.enrollment.id, selectedDay, session as SessionNumber)}
              <button
                class={`grid size-13 place-items-center justify-self-center rounded-xl border text-sm font-extrabold outline-none transition active:translate-y-px focus:ring-2 focus:ring-register-600 ${cellClass(status, inactive, holiday)}`}
                disabled={holiday || inactive}
                aria-label={`${row.student.name}, ${session === 1 ? 'first' : 'second'} timing, ${holiday ? 'holiday' : inactive ? 'not enrolled' : status ?? 'unmarked'}`}
                onclick={() => void appState.setMark(register, row.enrollment, selectedDay, session as SessionNumber, cycleStatus(status))}
              >{holiday ? 'H' : inactive ? '–' : status ?? '—'}</button>
            {/each}
          </div>
        {:else}
          <div class="px-6 py-14 text-center text-sm text-ink-600">No students are enrolled for this month.</div>
        {/each}
      </div>
      {#if rows.length}
        <div class="grid grid-cols-[minmax(0,1fr)_3.75rem_3.75rem] items-center border-t border-paper-200 bg-paper-100 px-3 py-3 text-xs font-extrabold text-ink-800">
          <span>Present totals</span><span class="text-center">{isHolidayDay(appState.holidays, register, selectedDay) ? 'H' : attendanceForSession(selectedDay, 1)}</span><span class="text-center">{isHolidayDay(appState.holidays, register, selectedDay) ? 'H' : attendanceForSession(selectedDay, 2)}</span>
        </div>
      {/if}
    </div>
    <p class="px-1 text-center text-[10px] font-semibold leading-4 text-ink-600">Tap a timing to cycle Present → Absent → Leave → blank. Past dates remain editable.</p>
  </div>

  <div class="hidden overflow-auto rounded-xl border border-paper-200 bg-white shadow-sm md:block" role="region" aria-label="Attendance register table">
    <table class="w-max min-w-full border-separate border-spacing-0 text-center text-[11px]">
      <thead class="sticky top-0 z-30 font-bold text-ink-800">
        <tr>
          <th rowspan="2" class="sticky left-0 z-40 min-w-28 border-b border-r border-paper-200 bg-paper-100 px-3 py-2 text-left md:min-w-32">Admission</th>
          <th rowspan="2" class="sticky left-28 z-40 hidden min-w-20 border-b border-r border-paper-200 bg-paper-100 px-2 py-2 md:table-cell md:left-32">Roll</th>
          <th rowspan="2" class="sticky left-28 z-40 min-w-44 border-b border-r border-paper-200 bg-paper-100 px-3 py-2 text-left md:left-52 md:min-w-52">Student</th>
          {#each days as day (day)}
            {@const holiday = isHolidayDay(appState.holidays, register, day)}
            <th colspan="2" class={`min-w-20 border-b border-r border-paper-200 px-1 py-1.5 ${holiday ? 'bg-slate-200 text-slate-600' : selectedDay === day ? 'bg-register-100 text-register-800' : 'bg-paper-100'}`}>
              <button class="w-full" onclick={() => (selectedDay = day)}><span class="block text-xs font-black">{day}</span><span class="text-[9px] uppercase">{weekdayLabel(register.year, register.month, day)}</span></button>
            </th>
          {/each}
          <th rowspan="2" class="min-w-16 border-b border-r border-paper-200 bg-register-50 px-2">Month</th>
          <th rowspan="2" class="min-w-16 border-b border-r border-paper-200 bg-register-50 px-2">B/F</th>
          <th rowspan="2" class="min-w-16 border-b border-paper-200 bg-register-100 px-2">Total</th>
        </tr>
        <tr>
          {#each days as day (day)}
            {@const holiday = isHolidayDay(appState.holidays, register, day)}
            <th class={`border-b border-r border-paper-200 px-1 py-1 ${holiday ? 'bg-slate-200' : 'bg-paper-100'}`}>F</th>
            <th class={`border-b border-r border-paper-200 px-1 py-1 ${holiday ? 'bg-slate-200' : 'bg-paper-100'}`}>S</th>
          {/each}
        </tr>
      </thead>
      <tbody>
        {#each rows as row, rowIndex (row.enrollment.id)}
          {@const current = currentPresentByEnrollment.get(row.enrollment.id) ?? 0}
          {@const brought = broughtForwardByEnrollment.get(row.enrollment.id) ?? 0}
          <tr class="group">
            <td class="sticky left-0 z-20 border-b border-r border-paper-200 bg-white px-3 py-2 text-left font-bold text-ink-950 group-hover:bg-paper-50">{row.student.admissionNumber}</td>
            <td class="sticky left-28 z-20 hidden border-b border-r border-paper-200 bg-white px-2 py-2 font-bold text-ink-950 group-hover:bg-paper-50 md:table-cell md:left-32">{row.enrollment.rollNumber}</td>
            <td class="sticky left-28 z-20 border-b border-r border-paper-200 bg-white px-3 py-2 text-left group-hover:bg-paper-50 md:left-52">
              <span class="block max-w-44 truncate font-semibold text-ink-950">{row.student.name}</span>
              <span class="mt-0.5 block text-[9px] text-ink-600 md:hidden">Roll {row.enrollment.rollNumber}</span>
            </td>
            {#each days as day (day)}
              {@const holiday = isHolidayDay(appState.holidays, register, day)}
              {@const date = dateKey(register.year, register.month, day)}
              {@const inactive = !isEnrollmentActiveOn(row.enrollment, date)}
              {#each [1, 2] as session (session)}
                {@const status = cellStatus(row.enrollment.id, day, session as SessionNumber)}
                <td class="border-b border-r border-paper-200 p-0.5">
                  <button
                    data-attendance-cell={`${rowIndex}:${(day - 1) * 2 + session - 1}`}
                    class={`grid size-8 place-items-center rounded-md border text-[10px] font-black outline-none focus:ring-2 focus:ring-register-600 focus:ring-offset-1 ${cellClass(status, inactive, holiday)}`}
                    disabled={holiday || inactive}
                    aria-label={`${row.student.name}, day ${day}, ${session === 1 ? 'first' : 'second'} timing, ${holiday ? 'holiday' : inactive ? 'not enrolled' : status ?? 'unmarked'}`}
                    onclick={() => void appState.setMark(register, row.enrollment, day, session as SessionNumber, cycleStatus(status))}
                    onkeydown={(event) => handleCellKeydown(event, rowIndex, (day - 1) * 2 + session - 1, day, session as SessionNumber)}
                  >
                    {holiday ? 'H' : inactive ? '–' : status ?? ''}
                  </button>
                </td>
              {/each}
            {/each}
            <td class="border-b border-r border-paper-200 bg-register-50 px-2 font-black text-register-800">{current}</td>
            <td class="border-b border-r border-paper-200 bg-register-50 px-2 font-black text-register-800">{brought}</td>
            <td class="border-b border-paper-200 bg-register-100 px-2 font-black text-register-900">{current + brought}</td>
          </tr>
        {:else}
          <tr><td colspan={days.length * 2 + 6} class="px-8 py-16 text-center text-sm text-ink-600">No students are enrolled for this month. Add them from the Students menu.</td></tr>
        {/each}
      </tbody>
      {#if rows.length}
        <tfoot class="sticky bottom-0 z-30 font-black text-ink-950">
          <tr>
            <td class="sticky left-0 z-40 border-r border-t border-paper-200 bg-paper-100 px-3 py-2 text-left" colspan="1">Column totals</td>
            <td class="sticky left-28 z-40 hidden border-r border-t border-paper-200 bg-paper-100 md:table-cell md:left-32"></td>
            <td class="sticky left-28 z-40 border-r border-t border-paper-200 bg-paper-100 md:left-52"></td>
            {#each days as day (day)}
              {#each [1, 2] as session (session)}
                <td class="border-r border-t border-paper-200 bg-paper-100 px-1 py-2">{isHolidayDay(appState.holidays, register, day) ? 'H' : attendanceForSession(day, session as SessionNumber)}</td>
              {/each}
            {/each}
            <td class="border-r border-t border-paper-200 bg-register-50 px-2">{currentPresentTotal}</td>
            <td class="border-r border-t border-paper-200 bg-register-50 px-2">{broughtForwardTotal}</td>
            <td class="border-t border-paper-200 bg-register-100 px-2">{currentPresentTotal + broughtForwardTotal}</td>
          </tr>
        </tfoot>
      {/if}
    </table>
  </div>
</section>
