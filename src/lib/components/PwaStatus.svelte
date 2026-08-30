<script lang="ts">
  import RefreshCw from 'phosphor-svelte/lib/ArrowClockwise'
  import Check from 'phosphor-svelte/lib/Check'
  import Download from 'phosphor-svelte/lib/DownloadSimple'
  import LockKey from 'phosphor-svelte/lib/LockKey'
  import Phone from 'phosphor-svelte/lib/Phone'
  import WifiOff from 'phosphor-svelte/lib/WifiSlash'
  import X from 'phosphor-svelte/lib/X'
  import { registerSW } from 'virtual:pwa-register'
  import Button from './ui/Button.svelte'
  import Modal from './ui/Modal.svelte'

  interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
  }

  let online = $state(typeof navigator === 'undefined' ? true : navigator.onLine)
  let installPrompt = $state<BeforeInstallPromptEvent | null>(null)
  let offlineReady = $state(false)
  let needRefresh = $state(false)
  let dismissed = $state(false)
  let installCodeOpen = $state(false)
  let installCode = $state('')
  let installCodeError = $state('')
  let installCodeInput: HTMLInputElement
  let updateServiceWorker = $state<(() => Promise<void>) | null>(null)

  $effect(() => {
    const onOnline = () => (online = true)
    const onOffline = () => (online = false)
    const onInstall = (event: Event) => {
      event.preventDefault()
      installPrompt = event as BeforeInstallPromptEvent
    }
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    window.addEventListener('beforeinstallprompt', onInstall)
    updateServiceWorker = registerSW({
      immediate: true,
      onOfflineReady: () => (offlineReady = true),
      onNeedRefresh: () => (needRefresh = true),
    })
    return () => {
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
      window.removeEventListener('beforeinstallprompt', onInstall)
    }
  })

  async function install() {
    if (!installPrompt) return
    await installPrompt.prompt()
    await installPrompt.userChoice
    installPrompt = null
  }

  function requestInstall() {
    installCode = ''
    installCodeError = ''
    installCodeOpen = true
  }

  function authorizeInstall(event: SubmitEvent) {
    event.preventDefault()
    if (installCode.trim() !== '1210') {
      installCodeError = 'That code is incorrect. Please check it and try again.'
      installCodeInput?.select()
      return
    }

    installCodeOpen = false
    installCodeError = ''
    void install()
  }
</script>

<div class="print:hidden">
  {#if !online}
    <div class="fixed bottom-4 left-1/2 z-40 flex -translate-x-1/2 items-center gap-2 rounded-full bg-ink-950 px-4 py-2 text-xs font-bold text-white shadow-xl">
      <WifiOff size={15} /> Offline · changes save on this device
    </div>
  {:else if installPrompt && !dismissed}
    <div class="fixed inset-x-3 bottom-3 z-40 mx-auto flex max-w-xl items-center gap-3 rounded-xl border border-register-100 bg-white p-3 shadow-xl">
      <div class="grid size-9 shrink-0 place-items-center rounded-lg bg-register-50 text-register-700"><Download size={18} /></div>
      <div class="min-w-0 flex-1">
        <p class="text-sm font-bold text-ink-950">Install for reliable offline access</p>
        <p class="text-[11px] text-ink-600">The register works without internet after installation.</p>
      </div>
      <Button size="sm" onclick={requestInstall}><LockKey size={15} weight="bold" /> Install</Button>
      <Button size="icon" variant="ghost" title="Dismiss" onclick={() => (dismissed = true)}><X size={17} /></Button>
    </div>
  {:else if needRefresh && !dismissed}
    <div class="fixed inset-x-3 bottom-3 z-40 mx-auto flex max-w-xl items-center gap-3 rounded-xl border border-sky-200 bg-white p-3 shadow-xl">
      <RefreshCw size={19} class="shrink-0 text-sky-700" />
      <p class="min-w-0 flex-1 text-sm font-semibold text-ink-950">A new app version is ready.</p>
      <Button size="sm" onclick={() => void updateServiceWorker?.()}>Update</Button>
      <Button size="icon" variant="ghost" title="Later" onclick={() => (dismissed = true)}><X size={17} /></Button>
    </div>
  {:else if offlineReady && !dismissed}
    <div class="fixed bottom-4 left-1/2 z-40 flex -translate-x-1/2 items-center gap-2 rounded-full bg-register-800 px-4 py-2 text-xs font-bold text-white shadow-xl">
      <Check size={15} /> Ready to use offline
      <button class="ml-1 rounded-full p-0.5 hover:bg-white/15" aria-label="Dismiss" onclick={() => (dismissed = true)}><X size={14} /></button>
    </div>
  {/if}
</div>

<Modal
  bind:open={installCodeOpen}
  title="Installation code required"
  description="Enter the access code to install this app on your device."
  size="sm"
>
  <form class="grid gap-4" onsubmit={authorizeInstall}>
    <a
      href="tel:+923007355768"
      class="flex items-center gap-3 rounded-xl border border-register-100 bg-register-50 px-3.5 py-3 text-register-900 transition hover:border-register-200 hover:bg-register-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-register-600"
    >
      <span class="grid size-9 shrink-0 place-items-center rounded-lg bg-white shadow-sm"><Phone size={17} weight="bold" /></span>
      <span class="min-w-0 text-xs leading-5">
        <span class="block font-semibold">Contact Iqbal Nasir to get the code</span>
        <span class="block font-extrabold tracking-wide">+92 300 7355768</span>
      </span>
    </a>

    <label class="grid gap-1.5 text-left">
      <span class="text-[11px] font-bold tracking-[0.01em] text-ink-800">Installation code</span>
      <input
        bind:this={installCodeInput}
        bind:value={installCode}
        type="password"
        inputmode="numeric"
        autocomplete="one-time-code"
        maxlength="4"
        pattern="[0-9]{4}"
        required
        aria-invalid={installCodeError ? 'true' : undefined}
        aria-describedby={installCodeError ? 'install-code-error' : undefined}
        placeholder="Enter 4-digit code"
        oninput={() => (installCodeError = '')}
        class="min-h-12 w-full rounded-xl border border-paper-200 bg-paper-50/60 px-3.5 text-sm font-medium tracking-[0.25em] text-ink-950 outline-none transition placeholder:font-normal placeholder:tracking-normal placeholder:text-ink-600/50 focus:border-register-600 focus:bg-white focus:ring-4 focus:ring-register-100 sm:min-h-11"
      />
    </label>

    {#if installCodeError}
      <p id="install-code-error" role="alert" class="rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-800">{installCodeError}</p>
    {/if}

    <Button type="submit" class="w-full"><Download size={16} weight="bold" /> Continue to install</Button>
  </form>
</Modal>
