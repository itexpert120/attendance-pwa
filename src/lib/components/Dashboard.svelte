<script lang="ts">
  import CalendarCheck from 'phosphor-svelte/lib/CalendarCheck'
  import CalendarPlus from 'phosphor-svelte/lib/CalendarPlus'
  import Plus from 'phosphor-svelte/lib/Plus'
  import Users from 'phosphor-svelte/lib/Users'
  import type { AttendanceState } from '../app-state.svelte'
  import { academicYearStartYearForDate, dateKey, monthLabel } from '../calculations'
  import { navigate, paths } from '../navigation'
  import ClassForm from './ClassForm.svelte'
  import SchoolMark from './SchoolMark.svelte'
  import BarButton from './ui/BarButton.svelte'
  import Button from './ui/Button.svelte'
  import Card from './ui/Card.svelte'
  import EmptyState from './ui/EmptyState.svelte'
  import Fab from './ui/Fab.svelte'
  import ListGroup from './ui/ListGroup.svelte'
  import ListRow from './ui/ListRow.svelte'
  import Modal from './ui/Modal.svelte'
  import Screen from './ui/Screen.svelte'
  import SelectField from './ui/SelectField.svelte'

  let { state: appState }: { state: AttendanceState } = $props()

  let createOpen = $state(false)
  let classFormOpen = $state(false)
  let classGroupId = $state('')
  let month = $state(new Date().getMonth() + 1)
  let year = $state(new Date().getFullYear())
  let error = $state('')

  const currentDate = new Date()
  const today = dateKey(currentDate.getFullYear(), currentDate.getMonth() + 1, currentDate.getDate())
  const todayLabel = new Intl.DateTimeFormat('en', { weekday: 'long', day: 'numeric', month: 'long' }).format(currentDate)
  let currentAcademicYearStart = $derived(
    appState.settings ? academicYearStartYearForDate(today, appState.settings) : currentDate.getFullYear(),
  )
  let currentAcademicYearTests = $derived(
    appState.settings
      ? appState.tests.filter(
          (test) => academicYearStartYearForDate(test.date, appState.settings!) === currentAcademicYearStart,
        ).length
      : 0,
  )
  let currentRegisters = $derived(
    appState.registers.filter(
      (register) => register.year === currentDate.getFullYear() && register.month === currentDate.getMonth() + 1,
    ),
  )

  let classOptions = $derived(appState.classGroups.map((group) => ({ value: group.id, label: `${group.className} · Section ${group.section}` })))
  const monthOptions = Array.from({ length: 12 }, (_, index) => ({ value: index + 1, label: new Intl.DateTimeFormat('en', { month: 'long' }).format(new Date(2024, index, 1)) }))
  const yearOptions = Array.from({ length: 9 }, (_, index) => ({ value: new Date().getFullYear() - 4 + index, label: String(new Date().getFullYear() - 4 + index) }))

  $effect(() => {
    if (!classGroupId && appState.classGroups[0]) classGroupId = appState.classGroups[0].id
  })

  const onopenregister = (registerId: string) => navigate(paths.register(registerId))
  const openStudents = () => navigate(paths.students())
  const onopentests = () => navigate(paths.tests())
  const onopenhomework = () => navigate(paths.homework())

  function groupLabel(classGroupId: string) {
    const group = appState.classGroups.find((item) => item.id === classGroupId)
    return group ? `Class ${group.className} · ${group.section}` : 'Class'
  }

  function openCreate() {
    error = ''
    month = currentDate.getMonth() + 1
    year = currentDate.getFullYear()
    createOpen = true
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
</script>

<Screen title="Registers" subtitle={appState.settings?.schoolName}>
  {#snippet actions()}
    <BarButton label="Students & classes" onclick={openStudents}><Users /></BarButton>
  {/snippet}

  <div class="space-y-6">
    <Card class="bg-primary-container! p-5 text-on-primary-container">
      <div class="flex items-center gap-4">
        <SchoolMark compact logoDataUrl={appState.settings?.logoDataUrl} alt={`${appState.settings?.schoolName ?? 'School'} logo`} />
        <div class="min-w-0">
          <p class="type-label-medium opacity-80">Today</p>
          <p class="type-title-large truncate">{todayLabel}</p>
        </div>
      </div>
      {#if currentRegisters.length}
        <div class="mt-5 flex flex-wrap gap-2">
          {#each currentRegisters.slice(0, 3) as register (register.id)}
            <Button onclick={() => onopenregister(register.id)}><CalendarCheck size={18} /> Take attendance · {groupLabel(register.classGroupId)}</Button>
          {/each}
        </div>
      {:else}
        <p class="type-body-medium mt-4 opacity-80">No register for {monthLabel(currentDate.getMonth() + 1, currentDate.getFullYear())} yet. Create one to start marking attendance.</p>
        <Button class="mt-4" onclick={openCreate}><CalendarPlus size={18} /> Create this month</Button>
      {/if}
    </Card>

    <Card class="grid grid-cols-4 divide-x divide-outline-variant py-4">
      {#each [
        { label: 'Students', value: appState.students.length, onclick: openStudents },
        { label: 'Classes', value: appState.classGroups.length, onclick: openStudents },
        { label: 'Tests', value: currentAcademicYearTests, onclick: onopentests },
        { label: 'Homework', value: appState.dailyHomeworkReports.length, onclick: onopenhomework },
      ] as stat (stat.label)}
        <button class="state-layer mx-1 rounded-xl py-1 text-center" onclick={stat.onclick}>
          <span class="type-headline-small block text-on-surface">{stat.value}</span>
          <span class="type-label-medium block text-on-surface-variant">{stat.label}</span>
        </button>
      {/each}
    </Card>

    {#if appState.registers.length}
      <ListGroup header="Monthly registers" footer="Registers, marks and fees are saved on this device.">
        {#each appState.registers as register (register.id)}
          <ListRow
            label={groupLabel(register.classGroupId)}
            detail={`${monthLabel(register.month, register.year)} · ${appState.attendanceRowsForRegister(register).length} students`}
            onclick={() => onopenregister(register.id)}
          >
            {#snippet leading()}
              <span class="type-label-medium grid size-10 shrink-0 place-items-center rounded-full bg-secondary-container uppercase text-on-secondary-container">{new Intl.DateTimeFormat('en', { month: 'short' }).format(new Date(register.year, register.month - 1))}</span>
            {/snippet}
          </ListRow>
        {/each}
      </ListGroup>
    {:else}
      <Card>
        <EmptyState icon={CalendarPlus} title="No registers yet" text="Add your students, then create the first monthly register.">
          <div class="flex flex-wrap justify-center gap-2">
            <Button variant="outlined" onclick={openStudents}><Users size={18} /> Students</Button>
            <Button onclick={openCreate}><Plus size={18} /> New register</Button>
          </div>
        </EmptyState>
      </Card>
    {/if}
  </div>
</Screen>

<Fab icon={Plus} text="New register" onclick={openCreate} />

<Modal bind:open={createOpen} title="New monthly register" description="Students active in the chosen month are included automatically.">
  <form id="create-register" class="grid gap-4" onsubmit={createRegister}>
    <div class="flex items-end gap-2">
      <SelectField class="flex-1" label="Class & section" bind:value={classGroupId} options={classOptions} />
      <Button variant="outlined" class="h-14! rounded-xl!" title="New class" onclick={() => (classFormOpen = true)}><Plus size={20} /></Button>
    </div>
    <div class="grid grid-cols-2 gap-3"><SelectField label="Month" bind:value={month} options={monthOptions} /><SelectField label="Year" bind:value={year} options={yearOptions} /></div>
    {#if error}<p role="alert" class="type-body-medium rounded-xl bg-error-container px-4 py-3 text-on-error-container">{error}</p>{/if}
  </form>
  {#snippet footer()}
    <Button variant="ghost" onclick={() => (createOpen = false)}>Cancel</Button>
    <Button type="submit" form="create-register">Open register</Button>
  {/snippet}
</Modal>

<ClassForm state={appState} bind:open={classFormOpen} oncreated={(id) => (classGroupId = id)} />

