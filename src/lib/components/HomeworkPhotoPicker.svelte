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

<div class="grid gap-1.5 text-left">
  <span class="text-[11px] font-bold tracking-[0.01em] text-ink-800">Diary photo</span>
  <div class="flex flex-col gap-3 rounded-xl border border-paper-200 bg-paper-50/60 p-3 sm:flex-row sm:items-center">
    {#if value}
      <img src={value} alt="Homework diary preview" class="mx-auto h-28 w-36 shrink-0 rounded-2xl border border-paper-200 bg-white object-cover sm:mx-0" />
    {:else}
      <div class="mx-auto grid h-28 w-36 shrink-0 place-items-center rounded-2xl border border-dashed border-paper-200 bg-white text-ink-600 sm:mx-0">
        <ImageSquare size={28} />
      </div>
    {/if}
    <div class="min-w-0 flex-1">
      <p class="text-xs font-bold text-ink-950">{value ? 'Photo selected' : 'Photograph the written diary'}</p>
      <p class="mt-0.5 text-[10px] leading-4 text-ink-600">
        Attach one photo instead of typing every Subject. It is resized and stored only on this device.
      </p>
      <div class="mt-2 grid grid-cols-2 gap-2 sm:flex">
        <Button variant="secondary" size="sm" disabled={processing} onclick={() => galleryInput.click()}>
          <ImageSquare size={16} /> Gallery
        </Button>
        <Button variant="secondary" size="sm" disabled={processing} onclick={() => cameraInput.click()}>
          <Camera size={16} /> Camera
        </Button>
        {#if value}
          <Button variant="ghost" size="sm" disabled={processing} onclick={() => (value = '')}>
            <Trash size={16} /> Remove
          </Button>
        {/if}
      </div>
    </div>
    <input
      bind:this={galleryInput}
      class="hidden"
      type="file"
      accept="image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp"
      onchange={choosePhoto}
    />
    <input bind:this={cameraInput} class="hidden" type="file" accept="image/*" capture="environment" onchange={choosePhoto} />
  </div>
  {#if error}<span class="text-[11px] font-semibold text-red-700">{error}</span>{/if}
</div>
