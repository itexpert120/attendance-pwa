<script lang="ts">
  import {
    Archive,
    CalendarPlus,
    CaretRight as ChevronRight,
    DownloadSimple as Download,
    Gear as Settings,
    Plus,
    Student as GraduationCap,
    UploadSimple as Upload,
    Users,
  } from 'phosphor-svelte'
  import type { AttendanceState } from '../app-state.svelte'
  import { registerLabel, shortMonthLabel } from '../calculations'
  import RosterManager from './RosterManager.svelte'
  import SchoolMark from './SchoolMark.svelte'
  import Button from './ui/Button.svelte'
  import Card from './ui/Card.svelte'
  import Modal from './ui/Modal.svelte'
  import SelectField from './ui/SelectField.svelte'
  import TextField from './ui/TextField.svelte'

  let {
    state: appState,
    onopenregister,
  }: {
    state: AttendanceState
    onopenregister: (registerId: string) => void
  } = $props()

  let createOpen = $state(false)
  let rosterOpen = $state(false)
  let settingsOpen = $state(false)
  let classGroupId = $state('')
  let month = $state(new Date().getMonth() + 1)
  let year = $state(new Date().getFullYear())
  let error = $state('')
  let restoreInput: HTMLInputElement

  let schoolName = $state('')
  let academicYearStartMonth = $state(4)
  let currencyLabel = $state('Rs.')
  let headmasterName = $state('')

  let classOptions = $derived(appState.classGroups.map((group) => ({ value: group.id, label: `${group.className} · Section ${group.section}` })))
  const monthOptions = Array.from({ length: 12 }, (_, index) => ({ value: index + 1, label: new Intl.DateTimeFormat('en', { month: 'long' }).format(new Date(2024, index, 1)) }))
  const yearOptions = Array.from({ length: 9 }, (_, index) => ({ value: new Date().getFullYear() - 4 + index, label: String(new Date().getFullYear() - 4 + index) }))

  $effect(() => {
    if (!classGroupId && appState.classGroups[0]) classGroupId = appState.classGroups[0].id
  })

  function openSettings() {
    if (!appState.settings) return
    schoolName = appState.settings.schoolName
    academicYearStartMonth = appState.settings.academicYearStartMonth
    currencyLabel = appState.settings.currencyLabel
    headmasterName = appState.settings.headmasterName
    settingsOpen = true
  }

  async function createRegister(event: SubmitEvent) {
    event.preventDefault()
    error = ''
    try {
      const register = await appState.createRegister(classGroupId, Number(year), Number(month))
      createOpen = false
      onopenregister(register.id)
    } catch (caught) {
      error = caught instanceof Error ? caught.message : 'Could not create register.'
    }
  }

  async function saveSettings(event: SubmitEvent) {
    event.preventDefault()
    await appState.saveSettings({ schoolName, academicYearStartMonth: Number(academicYearStartMonth), currencyLabel, headmasterName })
    settingsOpen = false
  }

  async function backup() {
    const blob = await appState.backup()
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `attendance-backup-${new Date().toISOString().slice(0, 10)}.json`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  async function restore(event: Event) {
    const file = (event.currentTarget as HTMLInputElement).files?.[0]
    if (!file) return
    try {
      const info = await appState.inspectBackup(file)
      const rows = info.data?.tables?.reduce((sum, table) => sum + table.rowCount, 0) ?? 0
      if (!window.confirm(`Replace all local data with this backup (${rows} records)? This cannot be undone.`)) return
      await appState.restore(file)
    } catch (caught) {
      window.alert(caught instanceof Error ? caught.message : 'This is not a valid attendance backup.')
    } finally {
      restoreInput.value = ''
    }
  }
</script>

<main class="min-h-svh bg-paper-100 text-ink-950 print:hidden">
  <header class="border-b border-paper-200 bg-paper-50/95 backdrop-blur">
    <div class="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3.5 sm:px-6">
      <SchoolMark compact />
      <div class="min-w-0 flex-1">
        <p class="truncate font-display text-lg font-semibold leading-none tracking-[-0.02em] sm:text-xl">{appState.settings?.schoolName}</p>
        <p class="mt-1 hidden text-[10px] font-bold uppercase tracking-[0.12em] text-ink-600 sm:block">Students attendance register</p>
      </div>
      <Button variant="ghost" size="icon" title="School settings" onclick={openSettings}><Settings size={19} /></Button>
    </div>
  </header>

  <div class="mx-auto max-w-7xl px-4 py-5 sm:px-6 sm:py-8">
    <section class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <h1 class="text-xl font-bold tracking-[-0.02em] text-ink-950 sm:text-2xl">Registers</h1>
      <div class="grid grid-cols-2 gap-2 sm:flex">
        <Button variant="secondary" onclick={() => (rosterOpen = true)}><Users size={17} weight="bold" /> Students</Button>
        <Button onclick={() => (createOpen = true)}><CalendarPlus size={17} weight="bold" /> New register</Button>
      </div>
    </section>

    <section class="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
      {#each [
        { icon: GraduationCap, label: 'Classes', value: appState.classGroups.length },
        { icon: Users, label: 'Students', value: appState.students.length },
        { icon: Archive, label: 'Monthly registers', value: appState.registers.length },
        { icon: CalendarPlus, label: 'Current month', value: shortMonthLabel(new Date().getMonth() + 1, new Date().getFullYear()) },
      ] as stat (stat.label)}
        <Card class="p-4 sm:p-5">
          <div class="flex items-start justify-between gap-2"><p class="text-[10px] font-extrabold uppercase leading-4 tracking-[0.08em] text-ink-600">{stat.label}</p><stat.icon size={18} weight="bold" class="shrink-0 text-register-700" /></div>
          <p class="mt-5 font-display text-3xl font-semibold leading-none tracking-[-0.03em] text-ink-950">{stat.value}</p>
        </Card>
      {/each}
    </section>

    <section class="mt-8">
      <div class="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div><h2 class="font-display text-2xl font-semibold tracking-tight text-ink-950">Recent registers</h2><p class="mt-0.5 text-xs font-medium text-ink-600">Continue a month or keep a portable offline backup.</p></div>
        <div class="flex items-center gap-1">
          <Button variant="ghost" size="sm" onclick={backup}><Download size={15} weight="bold" /> Backup</Button>
          <Button variant="ghost" size="sm" onclick={() => restoreInput.click()}><Upload size={15} weight="bold" /> Restore</Button>
          <input class="hidden" bind:this={restoreInput} type="file" accept="application/json,.json" onchange={restore} />
        </div>
      </div>
      <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {#each appState.registers as register (register.id)}
          <button class="group flex min-h-30 items-center gap-4 rounded-2xl border border-paper-200 bg-white p-4 text-left shadow-soft transition hover:-translate-y-0.5 hover:border-register-100 hover:shadow-lifted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-register-600" onclick={() => onopenregister(register.id)}>
            <div class="grid size-14 shrink-0 place-items-center rounded-2xl border border-register-100 bg-register-50 text-center text-register-800">
              <span class="text-[9px] font-extrabold uppercase tracking-[0.08em]">{new Intl.DateTimeFormat('en', { month: 'short' }).format(new Date(register.year, register.month - 1))}</span>
              <span class="-mt-2 font-display text-2xl font-semibold leading-none">{String(register.year).slice(-2)}</span>
            </div>
            <div class="min-w-0 flex-1"><p class="font-display text-xl font-semibold leading-tight text-ink-950">{registerLabel(register, appState.classGroups)}</p><p class="mt-1.5 text-[11px] font-semibold text-ink-600">{appState.rowsForRegister(register).length} students · two daily timings</p></div>
            <ChevronRight size={19} weight="bold" class="text-ink-600 transition group-hover:translate-x-1 group-hover:text-register-700" />
          </button>
        {:else}
          <Card class="col-span-full grid min-h-52 place-items-center border-dashed p-6 text-center">
            <div><div class="mx-auto grid size-12 place-items-center rounded-xl bg-paper-100 text-ink-600"><CalendarPlus size={23} /></div><h3 class="mt-4 font-bold">No monthly registers yet</h3><p class="mt-1 text-sm text-ink-600">Add students, then create your first month.</p><Button class="mt-4" onclick={() => (createOpen = true)}><Plus size={16} /> Create register</Button></div>
          </Card>
        {/each}
      </div>
    </section>
  </div>
</main>

<Modal bind:open={createOpen} title="Create monthly register" description="Students active in this month are included automatically.">
  <form class="grid gap-4" onsubmit={createRegister}>
    <SelectField label="Class & section" bind:value={classGroupId} options={classOptions} />
    <div class="grid grid-cols-2 gap-3"><SelectField label="Month" bind:value={month} options={monthOptions} /><SelectField label="Year" bind:value={year} options={yearOptions} /></div>
    {#if error}<p class="rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-800">{error}</p>{/if}
    <Button type="submit" class="w-full">Open register <ChevronRight size={17} /></Button>
  </form>
</Modal>

<Modal bind:open={settingsOpen} title="School settings" description="These details appear at the top of every printed register.">
  <form class="grid gap-4" onsubmit={saveSettings}>
    <TextField label="School name" bind:value={schoolName} required />
    <div class="grid grid-cols-2 gap-3"><SelectField label="Academic year starts" bind:value={academicYearStartMonth} options={monthOptions} /><TextField label="Currency label" bind:value={currencyLabel} required /></div>
    <TextField label="Headmaster name" bind:value={headmasterName} />
    <Button type="submit" class="w-full">Save settings</Button>
  </form>
</Modal>

<RosterManager state={appState} bind:open={rosterOpen} />
