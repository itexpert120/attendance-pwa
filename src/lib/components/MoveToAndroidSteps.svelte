<script lang="ts">
  import AndroidLogo from 'phosphor-svelte/lib/AndroidLogo'
  import Check from 'phosphor-svelte/lib/Check'
  import Download from 'phosphor-svelte/lib/DownloadSimple'
  import type { AttendanceState } from '../app-state.svelte'
  import { ANDROID_APK_URL, downloadBackup } from '../android-app'
  import Button from './ui/Button.svelte'

  let { state: appState }: { state: AttendanceState } = $props()

  let backedUp = $state(false)
  let error = $state('')

  async function backup() {
    error = ''
    try {
      await downloadBackup(appState)
      backedUp = true
    } catch (caught) {
      error = caught instanceof Error ? caught.message : 'The backup could not be saved.'
    }
  }
</script>

<ol class="grid gap-4">
  <li class="flex gap-3">
    <span class="type-label-large grid size-8 shrink-0 place-items-center rounded-full bg-primary text-on-primary">1</span>
    <div class="min-w-0 flex-1">
      <p class="type-title-small">Back up your data</p>
      <p class="type-body-medium text-on-surface-variant">Saves one .json file with all students, registers, fees, tests and homework.</p>
      <Button class="mt-2" size="sm" variant={backedUp ? 'secondary' : 'primary'} onclick={backup}>
        {#if backedUp}<Check size={18} /> Saved · save again{:else}<Download size={18} /> Back up data{/if}
      </Button>
      {#if error}<p class="type-body-small mt-1 text-error">{error}</p>{/if}
    </div>
  </li>
  <li class="flex gap-3">
    <span class="type-label-large grid size-8 shrink-0 place-items-center rounded-full bg-primary text-on-primary">2</span>
    <div class="min-w-0 flex-1">
      <p class="type-title-small">Install the Android app</p>
      <p class="type-body-medium text-on-surface-variant">Open the downloaded file and allow installing apps from your browser if Android asks.</p>
      <a
        href={ANDROID_APK_URL}
        class="state-layer type-label-large mt-2 inline-flex h-10 items-center gap-2 rounded-full bg-secondary-container px-4 text-on-secondary-container"
      ><AndroidLogo size={18} /> Download the app (APK)</a>
    </div>
  </li>
  <li class="flex gap-3">
    <span class="type-label-large grid size-8 shrink-0 place-items-center rounded-full bg-primary text-on-primary">3</span>
    <div class="min-w-0 flex-1">
      <p class="type-title-small">Import your backup</p>
      <p class="type-body-medium text-on-surface-variant">In the app, open Settings → Import from web app backup and pick the backup file from step 1.</p>
    </div>
  </li>
</ol>
