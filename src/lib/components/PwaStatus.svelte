<script lang="ts">
  import RefreshCw from 'phosphor-svelte/lib/ArrowClockwise'
  import Check from 'phosphor-svelte/lib/Check'
  import Download from 'phosphor-svelte/lib/DownloadSimple'
  import Phone from 'phosphor-svelte/lib/Phone'
  import WifiOff from 'phosphor-svelte/lib/WifiSlash'
  import X from 'phosphor-svelte/lib/X'
  import { registerSW } from 'virtual:pwa-register'
  import BarButton from './ui/BarButton.svelte'
  import Button from './ui/Button.svelte'
  import Modal from './ui/Modal.svelte'

  interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
  }

  let online = $state(typeof navigator === 'undefined' ? true : navigator.onLine)
  // Offline is normal for this app, so the notice is a brief toast rather than a permanent banner.
  let offlineNotice = $state(false)
  let offlineTimer = 0

  function showOfflineNotice() {
    offlineNotice = true
    clearTimeout(offlineTimer)
    offlineTimer = window.setTimeout(() => (offlineNotice = false), 4000)
  }
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
    const onOffline = () => {
      online = false
      showOfflineNotice()
    }
    if (!online) showOfflineNotice()
    const onInstall = (event: Event) => {
      event.preventDefault()
      installPrompt = event as BeforeInstallPromptEvent
    }
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    window.addEventListener('beforeinstallprompt', onInstall)
    updateServiceWorker = registerSW({
      immediate: true,
      onOfflineReady: () => {
        offlineReady = true
        window.setTimeout(() => (offlineReady = false), 3500)
      },
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
  {#if !online && offlineNotice}
    <div role="status" class="kb-hide fixed inset-x-4 bottom-[calc(var(--tab-bar-height)+var(--safe-bottom)+0.75rem)] z-50 mx-auto flex min-h-12 max-w-md items-center gap-3 rounded-lg bg-inverse-surface py-1 pl-4 pr-2 text-inverse-on-surface shadow-[var(--shadow-e3)] md:bottom-6">
      <WifiOff size={18} class="shrink-0" /><p class="type-body-medium min-w-0 flex-1">Offline — changes save on this device</p>
    </div>
  {:else if installPrompt && !dismissed}
    <div class="fixed inset-x-3 top-[calc(var(--safe-top)+0.5rem)] z-50 mx-auto flex max-w-xl items-center gap-3 rounded-2xl bg-surface-container-lowest p-3 pl-4 shadow-[var(--shadow-e2)]">
      <Download size={22} class="shrink-0 text-primary" />
      <div class="min-w-0 flex-1">
        <p class="type-title-small text-on-surface">Install the app</p>
        <p class="type-body-small text-on-surface-variant">Works without internet once installed.</p>
      </div>
      <Button size="sm" variant="secondary" onclick={requestInstall}>Install</Button>
      <BarButton label="Dismiss" onclick={() => (dismissed = true)}><X /></BarButton>
    </div>
  {:else if needRefresh && !dismissed}
    <div role="status" class="kb-hide fixed inset-x-4 bottom-[calc(var(--tab-bar-height)+var(--safe-bottom)+0.75rem)] z-50 mx-auto flex min-h-12 max-w-md items-center gap-3 rounded-lg bg-inverse-surface py-1 pl-4 pr-2 text-inverse-on-surface shadow-[var(--shadow-e3)] md:bottom-6">
      <RefreshCw size={18} class="shrink-0" /><p class="type-body-medium min-w-0 flex-1">A new version is ready</p>
      <button type="button" class="state-layer type-label-large h-10 rounded-full px-3 text-inverse-primary" onclick={() => void updateServiceWorker?.()}>Update</button>
      <button type="button" class="state-layer grid size-10 place-items-center rounded-full" aria-label="Later" onclick={() => (dismissed = true)}><X size={20} /></button>
    </div>
  {:else if offlineReady && !dismissed}
    <div role="status" class="kb-hide fixed inset-x-4 bottom-[calc(var(--tab-bar-height)+var(--safe-bottom)+0.75rem)] z-50 mx-auto flex min-h-12 max-w-md items-center gap-3 rounded-lg bg-inverse-surface py-1 pl-4 pr-2 text-inverse-on-surface shadow-[var(--shadow-e3)] md:bottom-6">
      <Check size={18} class="shrink-0 text-inverse-primary" /><p class="type-body-medium min-w-0 flex-1">Ready to use offline</p>
      <button type="button" class="state-layer grid size-10 place-items-center rounded-full" aria-label="Dismiss" onclick={() => (dismissed = true)}><X size={20} /></button>
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
      class="flex items-center gap-3 rounded-xl border border-primary bg-primary-container/40 px-3.5 py-3 text-on-primary-container transition hover:border-primary hover:bg-primary-container focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
    >
      <span class="grid size-9 shrink-0 place-items-center rounded-lg bg-surface-container-lowest shadow-sm"><Phone size={17} weight="bold" /></span>
      <span class="min-w-0 text-xs leading-5">
        <span class="block font-medium">Contact Iqbal Nasir to get the code</span>
        <span class="block font-medium">+92 300 7355768</span>
      </span>
    </a>

    <label class="grid gap-1.5 text-left">
      <span class="text-[12px] font-medium text-on-surface">Installation code</span>
      <input
        bind:this={installCodeInput}
        bind:value={installCode}
        type="password"
        inputmode="numeric"
        autocomplete="one-time-code"
        maxlength="4"
        required
        aria-invalid={installCodeError ? 'true' : undefined}
        aria-describedby={installCodeError ? 'install-code-error' : undefined}
        placeholder="Enter 4-digit code"
        oninput={() => (installCodeError = '')}
        class="min-h-12 w-full rounded-xl border border-outline-variant bg-surface-container-low px-3.5 text-sm font-medium text-on-surface outline-none transition placeholder:font-normal placeholder:tracking-normal placeholder:text-on-surface-variant/50 focus:border-primary focus:bg-surface-container-lowest focus:ring-4 focus:ring-primary/20 sm:min-h-11"
      />
    </label>

    {#if installCodeError}
      <p id="install-code-error" role="alert" class="rounded-2xl bg-error-container px-4 py-3 text-[13px] font-medium text-on-error-container">{installCodeError}</p>
    {/if}

    <Button type="submit" class="w-full"><Download size={16} weight="bold" /> Continue to install</Button>
  </form>
</Modal>
