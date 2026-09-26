<script lang="ts">
  import CalendarDots from 'phosphor-svelte/lib/CalendarDots'
  import CloudSlash from 'phosphor-svelte/lib/CloudSlash'
  import NotePencil from 'phosphor-svelte/lib/NotePencil'
  import Download from 'phosphor-svelte/lib/DownloadSimple'
  import IdentificationBadge from 'phosphor-svelte/lib/IdentificationBadge'
  import ShieldCheck from 'phosphor-svelte/lib/ShieldCheck'
  import GraduationCap from 'phosphor-svelte/lib/Student'
  import Upload from 'phosphor-svelte/lib/UploadSimple'
  import Users from 'phosphor-svelte/lib/Users'
  import type { AttendanceState } from '../app-state.svelte'
  import { navigate, paths } from '../navigation'
  import { readThemePreference, setThemePreference, type ThemePreference } from '../theme'
  import SchoolMark from './SchoolMark.svelte'
  import ListGroup from './ui/ListGroup.svelte'
  import ListRow from './ui/ListRow.svelte'
  import Screen from './ui/Screen.svelte'
  import Segmented from './ui/Segmented.svelte'

  let { state: appState }: { state: AttendanceState } = $props()

  let theme = $state<ThemePreference>(readThemePreference())
  const themeOptions: Array<{ value: ThemePreference; label: string }> = [
    { value: 'system', label: 'Auto' },
    { value: 'light', label: 'Light' },
    { value: 'dark', label: 'Dark' },
  ]

  const openStudents = () => navigate(paths.students())
  const openSchool = () => navigate(paths.schoolSettings())
  let restoreInput: HTMLInputElement

  const monthName = (month: number) =>
    new Intl.DateTimeFormat('en', { month: 'long' }).format(new Date(2024, month - 1, 1))

  async function backup() {
    const blob = await appState.backup()
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `attendance-backup-${new Date().toISOString().slice(0, 10)}.json`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  async function restore(event: Event) {
    const file = (event.currentTarget as HTMLInputElement).files?.[0]
    if (!file) return
    try {
      const info = await appState.inspectBackup(file)
      const rows = info.data?.tables?.reduce((sum, table) => sum + table.rowCount, 0) ?? 0
      if (!window.confirm(`Replace all local data with this backup (${rows} records)? This cannot be undone.`)) return
      await appState.restore(file)
    } catch (caught) {
      window.alert(caught instanceof Error ? caught.message : 'This is not a valid attendance backup.')
    } finally {
      restoreInput.value = ''
    }
  }
</script>

<Screen title="Settings">
  <div class="space-y-6">
    <ListGroup>
      <ListRow label={appState.settings?.schoolName ?? 'School'} detail="School name, logo and absence message" onclick={openSchool} class="min-h-20!">
        {#snippet leading()}<SchoolMark logoDataUrl={appState.settings?.logoDataUrl} alt={`${appState.settings?.schoolName ?? 'School'} logo`} />{/snippet}
        {#snippet trailing()}<NotePencil size={22} class="shrink-0 text-on-surface-variant" />{/snippet}
      </ListRow>
    </ListGroup>

    <ListGroup header="Classroom">
      <ListRow icon={Users} tone="blue" label="Students & classes" value={`${appState.students.length}`} onclick={openStudents} />
      <ListRow icon={GraduationCap} tone="purple" label="Classes" value={`${appState.classGroups.length}`} onclick={openStudents} />
      <ListRow icon={IdentificationBadge} tone="orange" label="Class incharge" value={appState.settings?.classInchargeName || 'Not set'} onclick={openSchool} />
      <ListRow icon={CalendarDots} tone="teal" label="Academic year starts" value={appState.settings ? monthName(appState.settings.academicYearStartMonth) : ''} onclick={openSchool} />
    </ListGroup>

    <section>
      <h2 class="type-title-small flex min-h-10 items-center px-4 pb-1 text-primary">Appearance</h2>
      <div class="rounded-[20px] bg-surface-container-lowest p-4">
        <p class="type-body-large text-on-surface">Theme</p>
        <p class="type-body-medium mb-3 text-on-surface-variant">Auto follows your device's light or dark setting.</p>
        <Segmented label="Theme" bind:value={() => theme, (next) => { theme = next; setThemePreference(next) }} options={themeOptions} />
      </div>
    </section>

    <ListGroup header="Backup" footer="Backups are a single file you keep. Restoring replaces everything stored on this device.">
      <ListRow icon={Download} tone="green" label="Back up data" detail="Save a backup file to this device" onclick={backup} />
      <ListRow icon={Upload} tone="gray" label="Restore from backup" onclick={() => restoreInput.click()} />
    </ListGroup>
    <input class="hidden" bind:this={restoreInput} type="file" accept="application/json,.json" onchange={restore} />

    <ListGroup header="Privacy">
      <ListRow icon={CloudSlash} tone="gray" label="Works offline" value="Always" />
      <ListRow icon={ShieldCheck} tone="green" label="Student data" value="On this device" />
    </ListGroup>
  </div>
</Screen>
