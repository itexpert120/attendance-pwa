<script lang="ts">
  import ArrowLeft from 'phosphor-svelte/lib/ArrowLeft'
  import Pencil from 'phosphor-svelte/lib/PencilSimple'
  import Plus from 'phosphor-svelte/lib/Plus'
  import UserPlus from 'phosphor-svelte/lib/UserPlus'
  import Users from 'phosphor-svelte/lib/Users'
  import type { AttendanceState } from '../app-state.svelte'
  import { rowsForClass } from '../calculations'
  import type { EnrollmentRow } from '../types'
  import Button from './ui/Button.svelte'
  import Modal from './ui/Modal.svelte'
  import SelectField from './ui/SelectField.svelte'
  import TextField from './ui/TextField.svelte'

  let {
    state: appState,
    open = $bindable(false),
  }: {
    state: AttendanceState
    open: boolean
  } = $props()

  let classGroupId = $state('')
  let editing = $state<EnrollmentRow | null>(null)
  let showClassForm = $state(false)
  let className = $state('')
  let section = $state('')
  let admissionNumber = $state('')
  let rollNumber = $state('')
  let studentName = $state('')
  let phone = $state('')
  let admittedOn = $state(new Date().toISOString().slice(0, 10))
  let struckOffOn = $state('')
  let error = $state('')
  let saving = $state(false)
  let mobilePanel = $state<'list' | 'form'>('list')

  let effectiveClassId = $derived(classGroupId || appState.classGroups[0]?.id || '')
  let rows = $derived(rowsForClass(appState.enrollments, appState.students, effectiveClassId))
  let classOptions = $derived(
    appState.classGroups.map((group) => ({ value: group.id, label: `${group.className} · ${group.section}` })),
  )

  $effect(() => {
    if (open && !classGroupId && appState.classGroups[0]) classGroupId = appState.classGroups[0].id
  })

  $effect(() => {
    if (open) mobilePanel = 'list'
  })

  function resetForm() {
    editing = null
    admissionNumber = ''
    rollNumber = ''
    studentName = ''
    phone = ''
    admittedOn = new Date().toISOString().slice(0, 10)
    struckOffOn = ''
    error = ''
  }

  function edit(row: EnrollmentRow) {
    editing = row
    admissionNumber = row.student.admissionNumber
    rollNumber = row.enrollment.rollNumber
    studentName = row.student.name
    phone = row.student.phone
    admittedOn = row.enrollment.admittedOn
    struckOffOn = row.enrollment.struckOffOn ?? ''
    mobilePanel = 'form'
  }

  function startAddStudent() {
    resetForm()
    mobilePanel = 'form'
  }

  async function saveStudent(event: SubmitEvent) {
    event.preventDefault()
    saving = true
    error = ''
    try {
      await appState.saveStudent({
        studentId: editing?.student.id,
        enrollmentId: editing?.enrollment.id,
        classGroupId: effectiveClassId,
        admissionNumber,
        rollNumber,
        name: studentName,
        phone,
        admittedOn,
        struckOffOn: struckOffOn || undefined,
      })
      resetForm()
      mobilePanel = 'list'
    } catch (caught) {
      error = caught instanceof Error ? caught.message : 'Could not save student.'
    } finally {
      saving = false
    }
  }

  async function addClass(event: SubmitEvent) {
    event.preventDefault()
    error = ''
    try {
      await appState.addClass(className, section)
      const group = appState.classGroups.find(
        (item) => item.className === className.trim() && item.section === section.trim(),
      )
      if (group) classGroupId = group.id
      className = ''
      section = ''
      showClassForm = false
    } catch (caught) {
      error = caught instanceof Error ? caught.message : 'Could not add class.'
    }
  }
</script>

<Modal bind:open title="Students & classes" description="Phone numbers stay in student details and are never printed." size="xl">
  <div class="grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
    <section class={`space-y-4 ${mobilePanel === 'list' ? 'block' : 'hidden'} lg:block`}>
      <div class="flex items-end gap-2">
        <SelectField class="min-w-0 flex-1" label="Class & section" bind:value={classGroupId} options={classOptions} />
        <Button variant="secondary" size="icon" title="Add class" onclick={() => (showClassForm = !showClassForm)}><Plus size={18} weight="bold" /></Button>
      </div>
      {#if showClassForm}
        <form class="grid gap-2 rounded-xl border border-paper-200 bg-paper-100 p-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end" onsubmit={addClass}>
          <TextField label="Class" bind:value={className} required />
          <TextField label="Section" bind:value={section} required />
          <Button type="submit" size="sm" class="w-full sm:w-auto">Add</Button>
        </form>
      {/if}
      <Button class="w-full sm:hidden" onclick={startAddStudent}><UserPlus size={17} weight="bold" /> Add student</Button>

      <div class="space-y-2 sm:hidden">
        {#each rows as row (row.enrollment.id)}
          <button class:opacity-50={Boolean(row.enrollment.struckOffOn)} class="flex min-h-18 w-full items-center gap-3 rounded-2xl border border-paper-200 bg-white p-3 text-left shadow-soft" onclick={() => edit(row)}>
            <span class="grid size-10 shrink-0 place-items-center rounded-xl bg-paper-100 text-xs font-extrabold text-ink-800">{row.enrollment.rollNumber}</span>
            <span class="min-w-0 flex-1"><span class="block truncate text-sm font-bold text-ink-950">{row.student.name}</span><span class="mt-1 block truncate text-[10px] font-semibold text-ink-600">Adm. {row.student.admissionNumber}{row.student.phone ? ` · ${row.student.phone}` : ''}</span></span>
            <Pencil size={16} weight="bold" class="shrink-0 text-ink-600" />
          </button>
        {:else}
          <div class="rounded-2xl border border-dashed border-paper-200 px-4 py-10 text-center text-sm text-ink-600"><Users size={24} class="mx-auto mb-2 opacity-60" />No students in this class yet.</div>
        {/each}
      </div>

      <div class="hidden overflow-hidden rounded-xl border border-paper-200 sm:block">
        <div class="max-h-100 overflow-auto">
          <table class="w-full text-left text-xs">
            <thead class="sticky top-0 bg-paper-100 text-ink-600">
              <tr><th class="px-3 py-2">Roll</th><th class="px-3 py-2">Student</th><th class="px-3 py-2">Admission</th><th class="w-12 px-2 py-2"><span class="sr-only">Edit</span></th></tr>
            </thead>
            <tbody class="divide-y divide-paper-200 bg-white">
              {#each rows as row (row.enrollment.id)}
                <tr class:opacity-50={Boolean(row.enrollment.struckOffOn)}>
                  <td class="px-3 py-3 font-bold text-ink-950">{row.enrollment.rollNumber}</td>
                  <td class="px-3 py-3"><p class="font-semibold text-ink-950">{row.student.name}</p><p class="mt-0.5 text-[11px] text-ink-600">{row.student.phone || 'No phone'}</p></td>
                  <td class="px-3 py-3 text-ink-600">{row.student.admissionNumber}</td>
                  <td class="px-2 py-2"><Button variant="ghost" size="icon" title="Edit student" onclick={() => edit(row)}><Pencil size={15} /></Button></td>
                </tr>
              {:else}
                <tr><td colspan="4" class="px-4 py-10 text-center text-ink-600"><Users size={24} class="mx-auto mb-2 opacity-60" />No students in this class yet.</td></tr>
              {/each}
            </tbody>
          </table>
        </div>
      </div>
    </section>

    <form class={`rounded-2xl border border-paper-200 bg-white p-4 shadow-soft ${mobilePanel === 'form' ? 'block' : 'hidden'} lg:block`} onsubmit={saveStudent}>
      <div class="mb-4 flex items-center justify-between">
        <div class="flex min-w-0 items-center gap-2">
          <Button class="lg:hidden" variant="ghost" size="icon" title="Back to students" onclick={() => (mobilePanel = 'list')}><ArrowLeft size={18} weight="bold" /></Button>
          <div><p class="text-sm font-bold text-ink-950">{editing ? 'Edit student' : 'Add a student'}</p><p class="mt-0.5 text-[11px] text-ink-600">Admission and roll numbers are required.</p></div>
        </div>
        {#if editing}<Button variant="ghost" size="sm" onclick={() => { resetForm(); mobilePanel = 'list' }}>Cancel edit</Button>{/if}
      </div>
      <div class="grid gap-3 sm:grid-cols-2">
        <TextField label="Admission number" bind:value={admissionNumber} required />
        <TextField label="Roll number" bind:value={rollNumber} required />
        <TextField class="sm:col-span-2" label="Student name" bind:value={studentName} required autocomplete="name" />
        <TextField class="sm:col-span-2" label="Phone number (optional)" bind:value={phone} type="tel" autocomplete="tel" />
        <TextField label="Admission date" bind:value={admittedOn} type="date" required />
        <TextField label="Struck-off date" bind:value={struckOffOn} type="date" />
      </div>
      {#if error}<p class="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-800">{error}</p>{/if}
      <Button type="submit" class="mt-4 w-full" disabled={saving}>{saving ? 'Saving…' : editing ? 'Save changes' : 'Add student'}</Button>
    </form>
  </div>
</Modal>
