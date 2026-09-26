<script lang="ts">
  import ArrowCounterClockwise from 'phosphor-svelte/lib/ArrowCounterClockwise'
  import type { AttendanceState } from '../app-state.svelte'
  import { goBack, paths } from '../navigation'
  import {
    ABSENCE_MESSAGE_TOKENS,
    DEFAULT_ABSENCE_MESSAGE_TEMPLATE,
    formatAbsenceMessage,
    resolveAbsenceMessageTemplate,
  } from '../messages'
  import LogoPicker from './LogoPicker.svelte'
  import Button from './ui/Button.svelte'
  import Screen from './ui/Screen.svelte'
  import SelectField from './ui/SelectField.svelte'
  import TextareaField from './ui/TextareaField.svelte'
  import TextField from './ui/TextField.svelte'
  import Card from './ui/Card.svelte'

  let { state: appState }: { state: AttendanceState } = $props()

  let schoolName = $state('')
  let academicYearStartMonth = $state(4)
  let currencyLabel = $state('Rs.')
  let classInchargeName = $state('')
  let logoDataUrl = $state('')
  let absenceMessageTemplate = $state(DEFAULT_ABSENCE_MESSAGE_TEMPLATE)
  let initialized = $state(false)
  let saving = $state(false)
  let error = $state('')

  const monthOptions = Array.from({ length: 12 }, (_, index) => ({
    value: index + 1,
    label: new Intl.DateTimeFormat('en', { month: 'long' }).format(new Date(2024, index, 1)),
  }))
  const messageTemplateHelp = `Available placeholders: ${ABSENCE_MESSAGE_TOKENS.map((token) => `{${token}}`).join(', ')}.`
  let messagePreview = $derived(
    formatAbsenceMessage(absenceMessageTemplate, {
      student: 'Ayaan Khan',
      date: 'August 31, 2026',
      session: 'the first timing',
      school: schoolName.trim() || 'Your School',
      className: 'Class 7, Section A',
      roll: '12',
      incharge: classInchargeName.trim()
        ? `${classInchargeName.trim()}, the class incharge`
        : 'the class incharge',
    }),
  )

  $effect(() => {
    if (initialized || !appState.settings) return

    schoolName = appState.settings.schoolName
    academicYearStartMonth = appState.settings.academicYearStartMonth
    currencyLabel = appState.settings.currencyLabel
    classInchargeName = appState.settings.classInchargeName
    logoDataUrl = appState.settings.logoDataUrl ?? ''
    absenceMessageTemplate = resolveAbsenceMessageTemplate(
      appState.settings.absenceMessageTemplate,
    )
    error = ''
    initialized = true
  })

  async function save(event: SubmitEvent) {
    event.preventDefault()
    if (saving) return

    error = ''
    saving = true
    try {
      await appState.saveSettings({
        schoolName,
        academicYearStartMonth: Number(academicYearStartMonth),
        currencyLabel,
        classInchargeName,
        logoDataUrl: logoDataUrl || undefined,
        absenceMessageTemplate: resolveAbsenceMessageTemplate(absenceMessageTemplate),
      })
      goBack(paths.settings())
    } catch (caught) {
      error = caught instanceof Error ? caught.message : 'Could not save settings.'
    } finally {
      saving = false
    }
  }
</script>

<Screen title="School" subtitle="Details printed on reports" back={paths.settings()}>
  {#snippet actions()}
    <Button variant="ghost" size="sm" type="submit" form="school-settings" disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
  {/snippet}
  <form id="school-settings" class="grid gap-6" onsubmit={save}>
    <Card class="grid gap-4 p-4">
    <LogoPicker bind:value={logoDataUrl} />
    <TextField label="School name" bind:value={schoolName} required />
    <div class="grid gap-3 sm:grid-cols-2">
      <SelectField
        label="Academic year starts"
        bind:value={academicYearStartMonth}
        options={monthOptions}
      />
      <TextField label="Currency label" bind:value={currencyLabel} required />
    </div>
    <TextField
      label="Class incharge name"
      bind:value={classInchargeName}
      placeholder="e.g. Ms. Sana Ali"
    />
    </Card>

    <section class="grid gap-2" aria-labelledby="message-heading">
      <div class="flex min-h-10 items-center justify-between gap-3 px-4">
        <h2 id="message-heading" class="type-title-small text-primary">Absence message</h2>
        <Button type="button" variant="ghost" size="sm" onclick={() => (absenceMessageTemplate = DEFAULT_ABSENCE_MESSAGE_TEMPLATE)}>
          <ArrowCounterClockwise size={18} /> Reset
        </Button>
      </div>
      <Card class="grid gap-4 p-4">
        <p class="type-body-medium text-on-surface-variant">Prefilled when you message a parent by SMS or WhatsApp from the absentee list.</p>
        <TextareaField label="Message template" bind:value={absenceMessageTemplate} required maxlength={1000} help={messageTemplateHelp} />
        <div class="rounded-xl bg-surface-container-high p-4">
          <p class="type-label-medium text-on-surface-variant">Preview</p>
          <p class="type-body-medium mt-1 whitespace-pre-wrap text-on-surface">{messagePreview}</p>
        </div>
      </Card>
    </section>

    {#if error}
      <p role="alert" class="rounded-2xl bg-error-container px-4 py-3 text-[13px] font-medium text-on-error-container">
        {error}
      </p>
    {/if}
    <Button type="submit" disabled={saving} class="w-full sm:w-auto sm:justify-self-end">
      {saving ? 'Saving…' : 'Save changes'}
    </Button>
  </form>
</Screen>
