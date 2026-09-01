<script lang="ts">
  import Copy from 'phosphor-svelte/lib/CopySimple'
  import Pencil from 'phosphor-svelte/lib/PencilSimple'
  import Plus from 'phosphor-svelte/lib/Plus'
  import UserPlus from 'phosphor-svelte/lib/UserPlus'
  import Users from 'phosphor-svelte/lib/Users'
  import type { AttendanceState } from '../app-state.svelte'
  import { dateKey, rowsForClass } from '../calculations'
  import type { EnrollmentRow } from '../types'
  import { displayPhoneNumber } from '../phone'
  import Button from './ui/Button.svelte'
  import Modal from './ui/Modal.svelte'
  import SelectField from './ui/SelectField.svelte'
  import StudentPhotoPicker from './StudentPhotoPicker.svelte'
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
  let showDuplicateForm = $state(false)
  let className = $state('')
  let section = $state('')
  let duplicateClassName = $state('')
  let duplicateSection = $state('')
  let duplicateAdmittedOn = $state(new Date().toISOString().slice(0, 10))
  let admissionNumber = $state('')
  let rollNumber = $state('')
  let studentName = $state('')
  let phone = $state('')
  let dateOfBirth = $state('')
  let photoDataUrl = $state('')
  let admittedOn = $state('')
  let struckOffOn = $state('')
  let error = $state('')
  let saving = $state(false)
  let studentFormOpen = $state(false)
  let duplicateFormOpen = $state(false)

  let effectiveClassId = $derived(classGroupId || appState.classGroups[0]?.id || '')
  let rows = $derived(rowsForClass(appState.enrollments, appState.students, effectiveClassId))
  let classOptions = $derived(
    appState.classGroups.map((group) => ({ value: group.id, label: `${group.className} · ${group.section}` })),
  )

  $effect(() => {
    if (open && !classGroupId && appState.classGroups[0]) classGroupId = appState.classGroups[0].id
  })

  $effect(() => {
    if (open) {
      if (!editing) admittedOn = defaultAdmissionDate()
    } else {
      studentFormOpen = false
      duplicateFormOpen = false
    }
  })

  function defaultAdmissionDate() {
    const register = appState.selectedRegister
    return register
      ? dateKey(register.year, register.month, 1)
      : new Date().toISOString().slice(0, 10)
  }

  function resetForm() {
    editing = null
    admissionNumber = ''
    rollNumber = ''
    studentName = ''
    phone = ''
    dateOfBirth = ''
    photoDataUrl = ''
    admittedOn = defaultAdmissionDate()
    struckOffOn = ''
    error = ''
  }

  function loadStudent(row: EnrollmentRow) {
    editing = row
    admissionNumber = row.student.admissionNumber
    rollNumber = row.enrollment.rollNumber
    studentName = row.student.name
    phone = row.student.phone
    dateOfBirth = row.student.dateOfBirth ?? ''
    photoDataUrl = row.student.photoDataUrl ?? ''
    admittedOn = row.enrollment.admittedOn
    struckOffOn = row.enrollment.struckOffOn ?? ''
  }

  function editInModal(row: EnrollmentRow) {
    loadStudent(row)
    studentFormOpen = true
  }

  function editOnDesktop(row: EnrollmentRow) {
    loadStudent(row)
    studentFormOpen = false
  }

  function startAddStudent() {
    resetForm()
    studentFormOpen = true
  }

  function openDuplicateModal() {
    error = ''
    showClassForm = false
    showDuplicateForm = false
    duplicateFormOpen = true
  }

  function toggleDuplicateDesktop() {
    error = ''
    showDuplicateForm = !showDuplicateForm
    showClassForm = false
    duplicateFormOpen = false
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
        dateOfBirth: dateOfBirth || undefined,
        photoDataUrl: photoDataUrl || undefined,
        admittedOn,
        struckOffOn: struckOffOn || undefined,
      })
      resetForm()
      studentFormOpen = false
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

  async function duplicateClass(event: SubmitEvent) {
    event.preventDefault()
    saving = true
    error = ''
    try {
      const group = await appState.duplicateClass(
        effectiveClassId,
        duplicateClassName,
        duplicateSection,
        duplicateAdmittedOn,
      )
      classGroupId = group.id
      duplicateClassName = ''
      duplicateSection = ''
      showDuplicateForm = false
      duplicateFormOpen = false
    } catch (caught) {
      error = caught instanceof Error ? caught.message : 'Could not duplicate class.'
    } finally {
      saving = false
    }
  }
</script>

{#snippet studentEditor(nested = false)}
  <form class={nested ? '' : 'hidden min-w-0 rounded-2xl border border-paper-200 bg-white p-4 shadow-soft lg:block'} onsubmit={saveStudent}>
    {#if !nested}
      <div class="mb-4 flex items-center justify-between">
        <div><p class="text-sm font-bold text-ink-950">{editing ? 'Edit student' : 'Add a student'}</p><p class="mt-0.5 text-[11px] text-ink-600">Admission and roll numbers are required.</p></div>
        {#if editing}<Button variant="ghost" size="sm" onclick={resetForm}>Cancel edit</Button>{/if}
      </div>
    {/if}
    <div class="grid gap-3 sm:grid-cols-2">
      <div class="sm:col-span-2"><StudentPhotoPicker bind:value={photoDataUrl} studentName={studentName} /></div>
      <TextField label="Admission number" bind:value={admissionNumber} required />
      <TextField label="Roll number" bind:value={rollNumber} required />
      <TextField class="sm:col-span-2" label="Name with parentage" bind:value={studentName} required autocomplete="name" placeholder="Ayaan S/O Awaan" />
      <TextField label="Phone number (optional)" bind:value={phone} type="tel" autocomplete="tel" placeholder="0300 1234567" />
      <TextField label="Date of birth (optional)" bind:value={dateOfBirth} type="date" max={new Date().toISOString().slice(0, 10)} />
      <TextField label="Admission date" bind:value={admittedOn} type="date" required />
      <TextField label="Struck-off date" bind:value={struckOffOn} type="date" />
    </div>
    {#if error}<p class="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-800">{error}</p>{/if}
    <Button type="submit" class="mt-4 w-full" disabled={saving}>{saving ? 'Saving…' : editing ? 'Save changes' : 'Add student'}</Button>
  </form>
{/snippet}

{#snippet duplicateEditor(nested = false)}
  <form class={`grid gap-2 ${nested ? '' : 'rounded-xl border border-register-200 bg-register-50 p-3 sm:grid-cols-2'}`} onsubmit={duplicateClass}>
    {#if !nested}
      <div class="sm:col-span-2">
        <p class="text-xs font-bold text-register-900">Duplicate selected class</p>
        <p class="mt-0.5 text-[10px] leading-4 text-register-800">Creates a new class with the active students, roll numbers, and contact details. Registers and attendance are not copied.</p>
      </div>
    {/if}
    <TextField label="New class" bind:value={duplicateClassName} required />
    <TextField label="New section" bind:value={duplicateSection} required />
    <TextField class="sm:col-span-2" label="Enrollment date in new class" bind:value={duplicateAdmittedOn} type="date" required />
    {#if error}<p class="rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-800 sm:col-span-2">{error}</p>{/if}
    <Button type="submit" size="sm" class="w-full sm:col-span-2" disabled={saving}><Copy size={16} />{saving ? 'Duplicating…' : `Duplicate ${rows.length} students`}</Button>
  </form>
{/snippet}

<Modal bind:open title="Students & classes" description="Phone numbers stay in student details and are never printed." size="xl">
  <div class="grid min-w-0 max-w-full gap-5 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
    <section class="min-w-0 space-y-4">
      <div class="flex min-w-0 items-end gap-2">
        <SelectField class="min-w-0 flex-1" label="Class & section" bind:value={classGroupId} options={classOptions} />
        <Button variant="secondary" size="icon" title="Add class" onclick={() => { showClassForm = !showClassForm; showDuplicateForm = false }}><Plus size={18} weight="bold" /></Button>
        <span class="lg:hidden"><Button variant="secondary" size="icon" title="Duplicate selected class" onclick={openDuplicateModal}><Copy size={18} weight="bold" /></Button></span>
        <span class="hidden lg:inline"><Button variant="secondary" size="icon" title="Duplicate selected class" onclick={toggleDuplicateDesktop}><Copy size={18} weight="bold" /></Button></span>
      </div>
      {#if showClassForm}
        <form class="grid gap-2 rounded-xl border border-paper-200 bg-paper-100 p-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end" onsubmit={addClass}>
          <TextField label="Class" bind:value={className} required />
          <TextField label="Section" bind:value={section} required />
          <Button type="submit" size="sm" class="w-full sm:w-auto">Add</Button>
        </form>
      {/if}
      {#if showDuplicateForm}
        {@render duplicateEditor()}
      {/if}
      <Button class="w-full lg:hidden" onclick={startAddStudent}><UserPlus size={17} weight="bold" /> Add student</Button>

      <div class="space-y-2 sm:hidden">
        {#each rows as row (row.enrollment.id)}
          <button class:opacity-50={Boolean(row.enrollment.struckOffOn)} class="flex min-h-18 w-full items-center gap-3 rounded-2xl border border-paper-200 bg-white p-3 text-left shadow-soft" onclick={() => editInModal(row)}>
            {#if row.student.photoDataUrl}<img src={row.student.photoDataUrl} alt="" class="size-10 shrink-0 rounded-xl border border-paper-200 object-cover" />{:else}<span class="grid size-10 shrink-0 place-items-center rounded-xl bg-paper-100 text-xs font-extrabold text-ink-800">{row.enrollment.rollNumber}</span>{/if}
            <span class="min-w-0 flex-1"><span class="block truncate text-sm font-bold text-ink-950">{row.student.name}</span><span class="mt-1 block truncate text-[10px] font-semibold text-ink-600">Adm. {row.student.admissionNumber}{row.student.phone ? ` · ${displayPhoneNumber(row.student.phone)}` : ''}</span></span>
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
              <tr><th class="px-3 py-2">Roll</th><th class="px-3 py-2">Name with parentage</th><th class="px-3 py-2">Admission</th><th class="w-12 px-2 py-2"><span class="sr-only">Edit</span></th></tr>
            </thead>
            <tbody class="divide-y divide-paper-200 bg-white">
              {#each rows as row (row.enrollment.id)}
                <tr class:opacity-50={Boolean(row.enrollment.struckOffOn)}>
                  <td class="px-3 py-3 font-bold text-ink-950">{row.enrollment.rollNumber}</td>
                  <td class="px-3 py-3"><div class="flex items-center gap-2">{#if row.student.photoDataUrl}<img src={row.student.photoDataUrl} alt="" class="size-8 shrink-0 rounded-lg border border-paper-200 object-cover" />{/if}<div><p class="font-semibold text-ink-950">{row.student.name}</p><p class="mt-0.5 text-[11px] text-ink-600">{row.student.phone ? displayPhoneNumber(row.student.phone) : 'No phone'}{row.student.dateOfBirth ? ` · DOB ${row.student.dateOfBirth}` : ''}</p></div></div></td>
                  <td class="px-3 py-3 text-ink-600">{row.student.admissionNumber}</td>
                  <td class="px-2 py-2">
                    <span class="lg:hidden"><Button variant="ghost" size="icon" title="Edit student" onclick={() => editInModal(row)}><Pencil size={15} /></Button></span>
                    <span class="hidden lg:inline"><Button variant="ghost" size="icon" title="Edit student" onclick={() => editOnDesktop(row)}><Pencil size={15} /></Button></span>
                  </td>
                </tr>
              {:else}
                <tr><td colspan="4" class="px-4 py-10 text-center text-ink-600"><Users size={24} class="mx-auto mb-2 opacity-60" />No students in this class yet.</td></tr>
              {/each}
            </tbody>
          </table>
        </div>
      </div>
    </section>

    {@render studentEditor()}
  </div>
</Modal>

<Modal bind:open={studentFormOpen} title={editing ? 'Edit student' : 'Add student'} description="Student details and photos remain on this device." size="lg">
  {@render studentEditor(true)}
</Modal>

<Modal bind:open={duplicateFormOpen} title="Duplicate class" description="Copy active students and their contact details into a new class. Attendance and registers are not copied." size="md">
  {@render duplicateEditor(true)}
</Modal>
