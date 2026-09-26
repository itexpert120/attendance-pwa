<script lang="ts">
  import ArrowRight from 'phosphor-svelte/lib/ArrowRight'
  import CloudOff from 'phosphor-svelte/lib/CloudSlash'
  import Database from 'phosphor-svelte/lib/Database'
  import ShieldCheck from 'phosphor-svelte/lib/ShieldCheck'
  import type { AttendanceState } from '../app-state.svelte'
  import SchoolMark from './SchoolMark.svelte'
  import LogoPicker from './LogoPicker.svelte'
  import Button from './ui/Button.svelte'
  import Card from './ui/Card.svelte'
  import ListGroup from './ui/ListGroup.svelte'
  import ListRow from './ui/ListRow.svelte'
  import SelectField from './ui/SelectField.svelte'
  import TextField from './ui/TextField.svelte'

  let { state: appState }: { state: AttendanceState } = $props()

  let schoolName = $state('')
  let className = $state('')
  let section = $state('')
  let academicYearStartMonth = $state(4)
  let currencyLabel = $state('Rs.')
  let classInchargeName = $state('')
  let logoDataUrl = $state('')
  let saving = $state(false)
  let error = $state('')

  const months = Array.from({ length: 12 }, (_, index) => ({
    value: index + 1,
    label: new Intl.DateTimeFormat('en', { month: 'long' }).format(new Date(2024, index, 1)),
  }))

  async function submit(event: SubmitEvent) {
    event.preventDefault()
    error = ''
    saving = true
    try {
      await appState.completeSetup({
        schoolName,
        className,
        section,
        academicYearStartMonth,
        currencyLabel,
        classInchargeName,
        logoDataUrl: logoDataUrl || undefined,
      })
    } catch (caught) {
      error = caught instanceof Error ? caught.message : 'Could not save your school.'
    } finally {
      saving = false
    }
  }
</script>

<main class="min-h-svh bg-canvas pb-[calc(var(--safe-bottom)+1.5rem)] pt-[calc(var(--safe-top)+1.5rem)] text-on-surface lg:grid lg:place-items-center">
  <div class="mx-auto grid w-full max-w-6xl gap-8 px-4 md:px-6 lg:grid-cols-[1fr_1fr] lg:items-center lg:gap-16">
    <section class="px-1 pt-4">
      <SchoolMark logoDataUrl={logoDataUrl} />
      <h1 class="mt-6 max-w-xl text-[36px] font-medium leading-[1.05] text-on-surface sm:text-5xl">Your school register, always at hand.</h1>
      <p class="mt-3 max-w-lg text-[16px] leading-6 text-on-surface-variant">Attendance, students, fees, tests and homework — all on this device, working without a connection.</p>
      <div class="mt-6 max-w-lg">
        <ListGroup>
          <ListRow icon={CloudOff} tone="blue" label="Offline-first" detail="Open and edit without internet" />
          <ListRow icon={Database} tone="purple" label="Stored on this device" detail="Every register stays local" />
          <ListRow icon={ShieldCheck} tone="green" label="No accounts" detail="No cloud sync or student-data upload" />
        </ListGroup>
      </div>
    </section>

    <form class="grid gap-5" onsubmit={submit}>
      <div class="px-1">
        <p class="text-[13px] font-medium text-primary">Quick setup · about a minute</p>
        <h2 class="mt-1 text-[24px] font-medium">Create your first register</h2>
        <p class="mt-1 text-[14px] text-on-surface-variant">You can add more classes and change these later.</p>
      </div>
      <Card class="grid gap-4 p-4">
        <LogoPicker bind:value={logoDataUrl} />
        <TextField label="School name" bind:value={schoolName} required placeholder="e.g. Crescent Public School" autocomplete="organization" />
        <div class="grid grid-cols-2 gap-3">
          <TextField label="Class" bind:value={className} required placeholder="e.g. 7" />
          <TextField label="Section" bind:value={section} required placeholder="e.g. A" />
        </div>
        <div class="grid grid-cols-2 gap-3">
          <SelectField label="Academic year starts" bind:value={academicYearStartMonth} options={months} />
          <TextField label="Currency label" bind:value={currencyLabel} required placeholder="Rs." />
        </div>
        <TextField label="Class incharge name (optional)" bind:value={classInchargeName} autocomplete="name" placeholder="e.g. Ms. Sana Ali" />
      </Card>
      {#if error}<p class="rounded-2xl bg-error-container px-4 py-3 text-[13px] font-medium text-on-error-container">{error}</p>{/if}
      <div class="sticky bottom-0 -mx-4 bg-canvas/90 px-4 pb-[calc(var(--safe-bottom)+0.75rem)] pt-3 backdrop-blur-xl lg:static lg:mx-0 lg:bg-transparent lg:p-0">
        <Button type="submit" disabled={saving} class="w-full">
          {saving ? 'Saving…' : 'Get started'} <ArrowRight size={17} weight="bold" />
        </Button>
      </div>
    </form>
  </div>
</main>
