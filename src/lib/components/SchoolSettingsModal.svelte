<script lang="ts">
  import ArrowCounterClockwise from 'phosphor-svelte/lib/ArrowCounterClockwise'
  import type { AttendanceState } from '../app-state.svelte'
  import {
    ABSENCE_MESSAGE_TOKENS,
    DEFAULT_ABSENCE_MESSAGE_TEMPLATE,
    formatAbsenceMessage,
    resolveAbsenceMessageTemplate,
  } from '../messages'
  import LogoPicker from './LogoPicker.svelte'
  import Button from './ui/Button.svelte'
  import Modal from './ui/Modal.svelte'
  import SelectField from './ui/SelectField.svelte'
  import TextareaField from './ui/TextareaField.svelte'
  import TextField from './ui/TextField.svelte'

  let {
    state: appState,
    open = $bindable(false),
  }: {
    state: AttendanceState
    open: boolean
  } = $props()

  let schoolName = $state('')
  let academicYearStartMonth = $state(4)
  let currencyLabel = $state('Rs.')
  let classInchargeName = $state('')
  let logoDataUrl = $state('')
  let absenceMessageTemplate = $state(DEFAULT_ABSENCE_MESSAGE_TEMPLATE)
  let initializedForOpen = $state(false)
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
    if (!open) {
      initializedForOpen = false
      return
    }
    if (initializedForOpen || !appState.settings) return

    schoolName = appState.settings.schoolName
    academicYearStartMonth = appState.settings.academicYearStartMonth
    currencyLabel = appState.settings.currencyLabel
    classInchargeName = appState.settings.classInchargeName
    logoDataUrl = appState.settings.logoDataUrl ?? ''
    absenceMessageTemplate = resolveAbsenceMessageTemplate(
      appState.settings.absenceMessageTemplate,
    )
    error = ''
    initializedForOpen = true
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
      open = false
    } catch (caught) {
      error = caught instanceof Error ? caught.message : 'Could not save settings.'
    } finally {
      saving = false
    }
  }
</script>

<Modal
  bind:open
  title="School settings"
  description="Update school details and the message prefilled for absent students."
>
  <form class="grid gap-4" onsubmit={save}>
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

    <section class="grid gap-3 border-t border-paper-200 pt-4" aria-labelledby="message-heading">
      <div class="flex items-center justify-between gap-3">
        <div>
          <h3 id="message-heading" class="text-xs font-extrabold text-ink-950">
            Absence message
          </h3>
          <p class="mt-0.5 text-[10px] font-semibold text-ink-600">Used for both SMS and WhatsApp.</p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onclick={() => (absenceMessageTemplate = DEFAULT_ABSENCE_MESSAGE_TEMPLATE)}
        >
          <ArrowCounterClockwise size={15} weight="bold" /> Default
        </Button>
      </div>
      <TextareaField
        label="Message template"
        bind:value={absenceMessageTemplate}
        required
        maxlength={1000}
        help={messageTemplateHelp}
      />
      <div class="rounded-xl border border-register-100 bg-register-50 px-3.5 py-3">
        <p class="text-[9px] font-extrabold uppercase tracking-[0.1em] text-register-800">
          Example preview
        </p>
        <p class="mt-1.5 whitespace-pre-wrap text-xs font-medium leading-5 text-ink-800">
          {messagePreview}
        </p>
      </div>
    </section>

    {#if error}
      <p role="alert" class="rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-800">
        {error}
      </p>
    {/if}
    <Button type="submit" disabled={saving} class="w-full">
      {saving ? 'Saving…' : 'Save settings'}
    </Button>
  </form>
</Modal>
