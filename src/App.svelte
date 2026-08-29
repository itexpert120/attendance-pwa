<script lang="ts">
  import { CircleNotch as LoaderCircle, Warning as AlertTriangle } from 'phosphor-svelte'
  import { AttendanceState } from './lib/app-state.svelte'
  import Dashboard from './lib/components/Dashboard.svelte'
  import PwaStatus from './lib/components/PwaStatus.svelte'
  import RegisterView from './lib/components/RegisterView.svelte'
  import SetupScreen from './lib/components/SetupScreen.svelte'
  import Button from './lib/components/ui/Button.svelte'

  const appState = new AttendanceState()
  let started = $state(false)
  let screen = $state<'dashboard' | 'register'>('dashboard')

  $effect(() => {
    if (!started) {
      started = true
      void appState.initialize()
    }
  })

  function openRegister(registerId: string) {
    appState.selectRegister(registerId)
    screen = 'register'
  }

  function backToDashboard() {
    screen = 'dashboard'
    appState.selectRegister(null)
  }
</script>

{#if !appState.ready}
  <main class="grid min-h-svh place-items-center bg-paper-100 px-5 text-center text-ink-950">
    <div><LoaderCircle size={30} class="mx-auto animate-spin text-register-700" /><p class="mt-4 font-display text-xl font-semibold">Opening your offline register…</p><p class="mt-1 text-xs font-semibold text-ink-600">Loading data stored on this device</p></div>
  </main>
{:else if appState.error}
  <main class="grid min-h-svh place-items-center bg-paper-100 px-5 text-center text-ink-950">
    <div class="max-w-md rounded-3xl border border-red-200 bg-white p-7 shadow-soft"><AlertTriangle size={29} class="mx-auto text-red-700" /><h1 class="mt-4 font-display text-2xl font-semibold">The offline database could not open</h1><p class="mt-2 text-sm leading-6 text-ink-600">{appState.error}</p><Button class="mt-5" onclick={() => location.reload()}>Try again</Button></div>
  </main>
{:else if !appState.settings}
  <SetupScreen state={appState} />
{:else if screen === 'register' && appState.selectedRegister}
  <RegisterView state={appState} onback={backToDashboard} />
{:else}
  <Dashboard state={appState} onopenregister={openRegister} />
{/if}

<PwaStatus />
