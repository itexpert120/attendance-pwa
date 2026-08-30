<script lang="ts">
  import ImageSquare from 'phosphor-svelte/lib/ImageSquare'
  import Trash from 'phosphor-svelte/lib/Trash'
  import Upload from 'phosphor-svelte/lib/UploadSimple'
  import { resizeImageFile } from '../image'
  import Button from './ui/Button.svelte'
  import SchoolMark from './SchoolMark.svelte'

  let {
    value = $bindable(''),
  }: {
    value?: string
  } = $props()

  let input: HTMLInputElement
  let error = $state('')
  let processing = $state(false)

  async function chooseLogo(event: Event) {
    const file = (event.currentTarget as HTMLInputElement).files?.[0]
    if (!file) return
    error = ''
    processing = true
    try {
      value = await resizeImageFile(file)
    } catch (caught) {
      error = caught instanceof Error ? caught.message : 'Could not use that image.'
    } finally {
      processing = false
      input.value = ''
    }
  }
</script>

<div class="grid gap-1.5 text-left">
  <span class="text-[11px] font-bold tracking-[0.01em] text-ink-800">School logo</span>
  <div class="flex items-center gap-3 rounded-xl border border-paper-200 bg-paper-50/60 p-3">
    {#if value}
      <SchoolMark logoDataUrl={value} alt="Selected school logo" />
    {:else}
      <div class="grid size-12 shrink-0 place-items-center rounded-xl border border-dashed border-paper-200 bg-white text-ink-600"><ImageSquare size={22} /></div>
    {/if}
    <div class="min-w-0 flex-1">
      <p class="text-xs font-bold text-ink-950">{value ? 'Custom logo selected' : 'Use your school crest'}</p>
      <p class="mt-0.5 text-[10px] leading-4 text-ink-600">PNG, JPG, or WebP. It is resized and stored only on this device.</p>
    </div>
    <div class="flex shrink-0 gap-1">
      {#if value}<Button variant="ghost" size="icon" title="Remove school logo" onclick={() => (value = '')}><Trash size={17} /></Button>{/if}
      <Button variant="secondary" size="icon" title={value ? 'Change school logo' : 'Choose school logo'} disabled={processing} onclick={() => input.click()}><Upload size={17} /></Button>
    </div>
    <input bind:this={input} class="hidden" type="file" accept="image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp" onchange={chooseLogo} />
  </div>
  {#if error}<span class="text-[11px] font-semibold text-red-700">{error}</span>{/if}
</div>
