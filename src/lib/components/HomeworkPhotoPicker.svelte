<script lang="ts">
  import Camera from 'phosphor-svelte/lib/Camera'
  import ImageSquare from 'phosphor-svelte/lib/ImageSquare'
  import Trash from 'phosphor-svelte/lib/Trash'
  import { resizeImageFile } from '../image'
  import Button from './ui/Button.svelte'

  let {
    value = $bindable(''),
  }: {
    value?: string
  } = $props()

  let galleryInput: HTMLInputElement
  let cameraInput: HTMLInputElement
  let processing = $state(false)
  let error = $state('')

  async function choosePhoto(event: Event) {
    const input = event.currentTarget as HTMLInputElement
    const file = input.files?.[0]
    if (!file) return
    error = ''
    processing = true
    try {
      value = await resizeImageFile(file, 1920, 10 * 1024 * 1024)
    } catch (caught) {
      error = caught instanceof Error ? caught.message : 'Could not use that image.'
    } finally {
      processing = false
      input.value = ''
    }
  }
</script>

<div class="grid gap-4">
  {#if value}
    <img src={value} alt="Homework diary preview" class="max-h-96 w-full rounded-xl bg-surface-container-high object-contain" />
  {:else}
    <button type="button" class="state-layer grid aspect-[4/3] w-full place-items-center rounded-xl border border-dashed border-outline text-on-surface-variant" disabled={processing} onclick={() => cameraInput.click()}>
      <span class="grid justify-items-center gap-2"><Camera size={36} /><span class="type-title-small">Photograph the diary</span><span class="type-body-small">One photo instead of typing each Subject</span></span>
    </button>
  {/if}
  <div class="flex flex-wrap gap-2">
    <Button variant="secondary" size="sm" disabled={processing} onclick={() => cameraInput.click()}><Camera size={18} /> {value ? 'Retake' : 'Camera'}</Button>
    <Button variant="outlined" size="sm" disabled={processing} onclick={() => galleryInput.click()}><ImageSquare size={18} /> Gallery</Button>
    {#if value}<Button variant="ghost" size="sm" disabled={processing} onclick={() => (value = '')}><Trash size={18} /> Remove</Button>{/if}
  </div>
  <input bind:this={galleryInput} class="hidden" type="file" accept="image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp" onchange={choosePhoto} />
  <input bind:this={cameraInput} class="hidden" type="file" accept="image/*" capture="environment" onchange={choosePhoto} />
  {#if error}<p class="type-body-small text-error">{error}</p>{/if}
</div>
