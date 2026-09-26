<script lang="ts">
  import type { AttendanceState } from '../app-state.svelte'
  import Button from './ui/Button.svelte'
  import Modal from './ui/Modal.svelte'
  import TextField from './ui/TextField.svelte'

  let {
    state: appState,
    open = $bindable(false),
    oncreated,
  }: {
    state: AttendanceState
    open: boolean
    oncreated?: (subjectId: string) => void
  } = $props()

  let name = $state('')
  let error = $state('')
  let saving = $state(false)

  $effect(() => {
    if (!open) return
    name = ''
    error = ''
  })

  async function save(event: SubmitEvent) {
    event.preventDefault()
    error = ''
    saving = true
    try {
      const subject = await appState.saveSubject(name)
      open = false
      oncreated?.(subject.id)
    } catch (caught) {
      error = caught instanceof Error ? caught.message : 'Could not create this Subject.'
    } finally {
      saving = false
    }
  }
</script>

<Modal bind:open title="New Subject" description="Subjects are shared by Tests and homework across every class." size="sm">
  <form class="grid gap-4" onsubmit={save}>
    <TextField label="Subject name" bind:value={name} required placeholder="e.g. Mathematics" />
    {#if error}<p role="alert" class="type-body-medium rounded-xl bg-error-container px-4 py-3 text-on-error-container">{error}</p>{/if}
    <div class="flex justify-end gap-2 pt-2">
      <Button variant="ghost" onclick={() => (open = false)}>Cancel</Button>
      <Button type="submit" disabled={saving}>Add Subject</Button>
    </div>
  </form>
</Modal>
