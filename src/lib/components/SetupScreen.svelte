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

<main class="min-h-svh bg-paper-100 px-4 py-6 text-ink-950 sm:px-6 sm:py-10 lg:grid lg:place-items-center">
  <div class="mx-auto grid w-full max-w-7xl gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-16">
    <section class="px-1 py-3 sm:px-4 lg:py-8">
      <div class="mb-10 flex items-center gap-3">
        <SchoolMark logoDataUrl={logoDataUrl} />
        <div>
          <p class="text-[11px] font-extrabold uppercase tracking-[0.2em] text-register-700">Students attendance</p>
          <p class="mt-0.5 text-xs font-semibold text-ink-600">A private, offline school register</p>
        </div>
      </div>
      <p class="mb-3 text-xs font-extrabold uppercase tracking-[0.18em] text-register-600">Made for the working school day</p>
      <h1 class="max-w-2xl font-display text-5xl font-semibold leading-[0.96] tracking-[-0.045em] text-ink-950 sm:text-6xl lg:text-7xl">
        Your school register, always at hand.
      </h1>
      <p class="mt-6 max-w-xl text-[15px] font-medium leading-7 text-ink-600 sm:text-base">
        Set up once, then manage attendance, student details, fees, and printable monthly records without relying on a connection.
      </p>
      <div class="mt-8 max-w-2xl divide-y divide-paper-200 border-y border-paper-200 sm:grid sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        {#each [
          { icon: CloudOff, title: 'Offline-first', text: 'Open and edit without a connection.' },
          { icon: Database, title: 'Device storage', text: 'IndexedDB keeps every register local.' },
          { icon: ShieldCheck, title: 'No accounts', text: 'No cloud sync or student-data upload.' },
        ] as item (item.title)}
          <div class="flex gap-3 py-4 sm:block sm:px-4 sm:first:pl-0 sm:last:pr-0">
            <div class="grid size-9 shrink-0 place-items-center rounded-xl bg-register-50 text-register-700"><item.icon size={18} weight="bold" /></div>
            <div><p class="text-xs font-extrabold text-ink-950 sm:mt-3">{item.title}</p><p class="mt-1 text-[11px] font-medium leading-5 text-ink-600">{item.text}</p></div>
          </div>
        {/each}
      </div>
    </section>

    <Card class="overflow-hidden">
      <div class="bg-register-800 px-5 py-6 text-white sm:px-7">
        <p class="text-[10px] font-extrabold uppercase tracking-[0.2em] text-register-100">Quick setup · about one minute</p>
        <h2 class="mt-2 font-display text-3xl font-semibold tracking-[-0.025em]">Create your first register</h2>
        <p class="mt-2 text-xs font-medium leading-5 text-white/70">You can add more classes and change these details later.</p>
      </div>
      <form class="grid gap-4 p-5 sm:p-7" onsubmit={submit}>
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
        {#if error}<p class="rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-800">{error}</p>{/if}
        <Button type="submit" disabled={saving} class="mt-2 w-full">
          {saving ? 'Saving…' : 'Set up attendance register'} <ArrowRight size={17} weight="bold" />
        </Button>
      </form>
    </Card>
  </div>
</main>
