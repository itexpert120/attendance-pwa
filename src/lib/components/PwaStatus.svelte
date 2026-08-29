<script lang="ts">
  import {
    ArrowClockwise as RefreshCw,
    Check,
    DownloadSimple as Download,
    WifiSlash as WifiOff,
    X,
  } from 'phosphor-svelte'
  import { registerSW } from 'virtual:pwa-register'
  import Button from './ui/Button.svelte'

  interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
  }

  let online = $state(typeof navigator === 'undefined' ? true : navigator.onLine)
  let installPrompt = $state<BeforeInstallPromptEvent | null>(null)
  let offlineReady = $state(false)
  let needRefresh = $state(false)
  let dismissed = $state(false)
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
      <Button size="sm" onclick={install}>Install</Button>
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
