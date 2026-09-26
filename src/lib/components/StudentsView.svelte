<script lang="ts">
  import Copy from 'phosphor-svelte/lib/CopySimple'
  import DotsThreeVertical from 'phosphor-svelte/lib/DotsThreeVertical'
  import MagnifyingGlass from 'phosphor-svelte/lib/MagnifyingGlass'
  import Plus from 'phosphor-svelte/lib/Plus'
  import UserPlus from 'phosphor-svelte/lib/UserPlus'
  import Users from 'phosphor-svelte/lib/Users'
  import { router } from 'svelte-spa-router'
  import type { AttendanceState } from '../app-state.svelte'
  import { dateKey, rowsForClass } from '../calculations'
  import { paths } from '../navigation'
  import { displayPhoneNumber } from '../phone'
  import type { EnrollmentRow } from '../types'
  import ClassForm from './ClassForm.svelte'
  import StudentPhotoPicker from './StudentPhotoPicker.svelte'
  import BarButton from './ui/BarButton.svelte'
  import Button from './ui/Button.svelte'
  import Card from './ui/Card.svelte'
  import Chip from './ui/Chip.svelte'
  import EmptyState from './ui/EmptyState.svelte'
  import Fab from './ui/Fab.svelte'
  import ListGroup from './ui/ListGroup.svelte'
  import ListRow from './ui/ListRow.svelte'
  import Modal from './ui/Modal.svelte'
  import Screen from './ui/Screen.svelte'
  import TextField from './ui/TextField.svelte'

  let { state: appState }: { state: AttendanceState } = $props()

  const today = new Date().toISOString().slice(0, 10)

  let classGroupId = $state(new URLSearchParams(router.querystring ?? '').get('class') ?? '')
  let query = $state('')
  let menuOpen = $state(false)
  let classFormOpen = $state(false)
  let duplicateOpen = $state(false)
  let studentOpen = $state(false)

  let editing = $state<EnrollmentRow | null>(null)
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

  let duplicateClassName = $state('')
  let duplicateSection = $state('')
  let duplicateAdmittedOn = $state(today)
  let duplicateError = $state('')

  let effectiveClassId = $derived(
    appState.classGroups.some((group) => group.id === classGroupId) ? classGroupId : (appState.classGroups[0]?.id ?? ''),
  )
  let group = $derived(appState.classGroups.find((item) => item.id === effectiveClassId))
  let rows = $derived(rowsForClass(appState.enrollments, appState.students, effectiveClassId))
  let matches = $derived.by(() => {
    const needle = query.trim().toLocaleLowerCase()
    if (!needle) return rows
    return rows.filter(
      (row) =>
        row.student.name.toLocaleLowerCase().includes(needle) ||
        row.student.admissionNumber.toLocaleLowerCase().includes(needle) ||
        row.enrollment.rollNumber.toLocaleLowerCase().includes(needle),
    )
  })
  let activeRows = $derived(matches.filter((row) => !row.enrollment.struckOffOn))
  let struckOffRows = $derived(matches.filter((row) => Boolean(row.enrollment.struckOffOn)))

  function defaultAdmissionDate() {
    const register = appState.selectedRegister
    return register ? dateKey(register.year, register.month, 1) : today
  }

  function startAdd() {
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
    studentOpen = true
  }

  function startEdit(row: EnrollmentRow) {
    editing = row
    admissionNumber = row.student.admissionNumber
    rollNumber = row.enrollment.rollNumber
    studentName = row.student.name
    phone = row.student.phone
    dateOfBirth = row.student.dateOfBirth ?? ''
    photoDataUrl = row.student.photoDataUrl ?? ''
    admittedOn = row.enrollment.admittedOn
    struckOffOn = row.enrollment.struckOffOn ?? ''
    error = ''
    studentOpen = true
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
      studentOpen = false
    } catch (caught) {
      error = caught instanceof Error ? caught.message : 'Could not save student.'
    } finally {
      saving = false
    }
  }

  function openDuplicate() {
    menuOpen = false
    duplicateClassName = ''
    duplicateSection = ''
    duplicateAdmittedOn = today
    duplicateError = ''
    duplicateOpen = true
  }

  async function duplicateClass(event: SubmitEvent) {
    event.preventDefault()
    saving = true
    duplicateError = ''
    try {
      const created = await appState.duplicateClass(effectiveClassId, duplicateClassName, duplicateSection, duplicateAdmittedOn)
      classGroupId = created.id
      duplicateOpen = false
    } catch (caught) {
      duplicateError = caught instanceof Error ? caught.message : 'Could not duplicate class.'
    } finally {
      saving = false
    }
  }
</script>

{#snippet studentRow(row: EnrollmentRow)}
  <ListRow
    label={row.student.name}
    detail={`Roll ${row.enrollment.rollNumber} · Adm. ${row.student.admissionNumber}${row.student.phone ? ` · ${displayPhoneNumber(row.student.phone)}` : ''}${row.enrollment.struckOffOn ? ` · Struck off ${row.enrollment.struckOffOn}` : ''}`}
    onclick={() => startEdit(row)}
  >
    {#snippet leading()}
      {#if row.student.photoDataUrl}
        <img src={row.student.photoDataUrl} alt="" class="size-10 shrink-0 rounded-full object-cover" />
      {:else}
        <span class="type-title-medium grid size-10 shrink-0 place-items-center rounded-full bg-secondary-container text-on-secondary-container">{row.student.name.trim().charAt(0).toUpperCase() || row.enrollment.rollNumber}</span>
      {/if}
    {/snippet}
  </ListRow>
{/snippet}

<Screen title="Students" subtitle={group ? `Class ${group.className} · Section ${group.section} · ${rows.length} enrolled` : 'No classes yet'} back={paths.home()}>
  {#snippet actions()}
    <BarButton label="Class options" onclick={() => (menuOpen = true)}><DotsThreeVertical weight="bold" /></BarButton>
  {/snippet}
  {#snippet toolbar()}
    <div class="no-scrollbar flex gap-2 overflow-x-auto px-4 pb-3 md:px-6">
      {#each appState.classGroups as item (item.id)}
        <Chip selected={item.id === effectiveClassId} onclick={() => (classGroupId = item.id)}>Class {item.className} · {item.section}</Chip>
      {/each}
      <button type="button" class="state-layer type-label-large inline-flex h-8 shrink-0 items-center gap-2 rounded-lg border border-outline-variant pl-2 pr-4 text-on-surface-variant" onclick={() => (classFormOpen = true)}><Plus size={18} class="text-primary" /> New class</button>
    </div>
  {/snippet}

  <div class="space-y-6">
    {#if rows.length}
      <label class="flex h-14 items-center gap-3 rounded-full bg-surface-container-high px-4 focus-within:bg-surface-container-highest">
        <MagnifyingGlass size={24} class="shrink-0 text-on-surface-variant" />
        <span class="sr-only">Search students</span>
        <input bind:value={query} type="search" enterkeyhint="search" placeholder="Search name, roll or admission no." class="type-body-large h-full min-w-0 flex-1 bg-transparent text-on-surface caret-primary outline-none placeholder:text-on-surface-variant" />
      </label>
    {/if}

    {#if activeRows.length}
      <ListGroup header={`Active · ${activeRows.length}`} footer="Phone numbers stay in student details and are never printed.">
        {#each activeRows as row (row.enrollment.id)}{@render studentRow(row)}{/each}
      </ListGroup>
    {:else if !query}
      <Card>
        <EmptyState icon={Users} title={group ? 'No students in this class' : 'Create a class first'} text={group ? 'Add students with their admission and roll numbers.' : 'Classes hold students, registers and tests.'}>
          {#if group}<Button onclick={startAdd}><UserPlus size={18} /> Add student</Button>{:else}<Button onclick={() => (classFormOpen = true)}><Plus size={18} /> New class</Button>{/if}
        </EmptyState>
      </Card>
    {:else}
      <p class="type-body-medium px-4 py-8 text-center text-on-surface-variant">No students match “{query}”.</p>
    {/if}

    {#if struckOffRows.length}
      <ListGroup header={`Struck off · ${struckOffRows.length}`}>
        {#each struckOffRows as row (row.enrollment.id)}{@render studentRow(row)}{/each}
      </ListGroup>
    {/if}
  </div>
</Screen>

{#if group}<Fab icon={UserPlus} text="Add student" tabbed={false} onclick={startAdd} />{/if}

<Modal bind:open={menuOpen} title={group ? `Class ${group.className} · ${group.section}` : 'Classes'} size="sm">
  <ListGroup muted>
    <ListRow icon={Plus} label="New class" detail="Add another class and section" onclick={() => { menuOpen = false; classFormOpen = true }} />
    <ListRow icon={Copy} label="Duplicate this class" detail="Promote active students into a new class" disabled={!rows.length} onclick={openDuplicate} />
  </ListGroup>
</Modal>

<ClassForm state={appState} bind:open={classFormOpen} oncreated={(id) => (classGroupId = id)} />

<Modal bind:open={duplicateOpen} title="Duplicate class" description="Copies active students, roll numbers and contact details. Registers and attendance are not copied.">
  <form class="grid gap-4" onsubmit={duplicateClass}>
    <div class="grid grid-cols-2 gap-3">
      <TextField label="New class" bind:value={duplicateClassName} required />
      <TextField label="New section" bind:value={duplicateSection} required />
    </div>
    <TextField label="Enrollment date in new class" bind:value={duplicateAdmittedOn} type="date" required />
    {#if duplicateError}<p role="alert" class="type-body-medium rounded-xl bg-error-container px-4 py-3 text-on-error-container">{duplicateError}</p>{/if}
    <div class="flex justify-end gap-2 pt-2">
      <Button variant="ghost" onclick={() => (duplicateOpen = false)}>Cancel</Button>
      <Button type="submit" disabled={saving}>{saving ? 'Duplicating…' : `Duplicate ${rows.filter((row) => !row.enrollment.struckOffOn).length} students`}</Button>
    </div>
  </form>
</Modal>

<Modal bind:open={studentOpen} title={editing ? 'Edit student' : 'Add student'} description={group ? `Class ${group.className} · Section ${group.section}` : undefined} size="lg">
  <form id="student-form" class="grid gap-4" onsubmit={saveStudent}>
    <StudentPhotoPicker bind:value={photoDataUrl} studentName={studentName} />
    <TextField label="Name with parentage" bind:value={studentName} required autocomplete="name" placeholder="Ayaan S/O Awaan" />
    <div class="grid grid-cols-2 gap-3">
      <TextField label="Admission number" bind:value={admissionNumber} required />
      <TextField label="Roll number" bind:value={rollNumber} required />
    </div>
    <TextField label="Phone number (optional)" bind:value={phone} type="tel" autocomplete="tel" placeholder="0300 1234567" />
    <TextField label="Date of birth (optional)" bind:value={dateOfBirth} type="date" max={today} />
    <div class="grid grid-cols-2 gap-3">
      <TextField label="Admission date" bind:value={admittedOn} type="date" required />
      <TextField label="Struck-off date" bind:value={struckOffOn} type="date" />
    </div>
    {#if error}<p role="alert" class="type-body-medium rounded-xl bg-error-container px-4 py-3 text-on-error-container">{error}</p>{/if}
  </form>
  {#snippet footer()}
    <Button variant="ghost" onclick={() => (studentOpen = false)}>Cancel</Button>
    <Button type="submit" form="student-form" disabled={saving}>{saving ? 'Saving…' : editing ? 'Save' : 'Add student'}</Button>
  {/snippet}
</Modal>
