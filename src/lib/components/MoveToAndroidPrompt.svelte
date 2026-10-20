<script lang="ts">
  import type { AttendanceState } from '../app-state.svelte'
  import { shouldPromptMove, snoozeMovePrompt } from '../android-app'
  import MoveToAndroidSteps from './MoveToAndroidSteps.svelte'
  import Button from './ui/Button.svelte'
  import Modal from './ui/Modal.svelte'

  let { state: appState }: { state: AttendanceState } = $props()

  let open = $state(shouldPromptMove())

  $effect(() => {
    if (!open) snoozeMovePrompt()
  })
</script>

<Modal
  bind:open
  title="This app is moving to Android"
  description="The web app will stop being updated. Move your data to the new Android app in three steps."
>
  <MoveToAndroidSteps state={appState} />
  {#snippet footer()}
    <Button variant="ghost" onclick={() => (open = false)}>Remind me tomorrow</Button>
  {/snippet}
</Modal>
