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
    oncreated?: (classGroupId: string) => void
  } = $props()

  let className = $state('')
  let section = $state('')
  let error = $state('')
  let saving = $state(false)

  $effect(() => {
    if (!open) return
    className = ''
    section = ''
    error = ''
  })

  async function save(event: SubmitEvent) {
    event.preventDefault()
    error = ''
    saving = true
    try {
      await appState.addClass(className, section)
      const group = appState.classGroups.find(
        (item) => item.className === className.trim() && item.section === section.trim(),
      )
      open = false
      if (group) oncreated?.(group.id)
    } catch (caught) {
      error = caught instanceof Error ? caught.message : 'Could not add class.'
    } finally {
      saving = false
    }
  }
</script>

<Modal bind:open title="New class" description="Students, registers and tests belong to a class and section." size="sm">
  <form class="grid gap-4" onsubmit={save}>
    <div class="grid grid-cols-2 gap-3">
      <TextField label="Class" bind:value={className} required placeholder="e.g. 8" />
      <TextField label="Section" bind:value={section} required placeholder="e.g. B" />
    </div>
    {#if error}<p role="alert" class="type-body-medium rounded-xl bg-error-container px-4 py-3 text-on-error-container">{error}</p>{/if}
    <div class="flex justify-end gap-2 pt-2">
      <Button variant="ghost" onclick={() => (open = false)}>Cancel</Button>
      <Button type="submit" disabled={saving}>Create class</Button>
    </div>
  </form>
</Modal>
