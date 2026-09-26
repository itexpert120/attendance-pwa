<script lang="ts">
  import Camera from 'phosphor-svelte/lib/Camera'
  import ImageSquare from 'phosphor-svelte/lib/ImageSquare'
  import UserCircle from 'phosphor-svelte/lib/UserCircle'
  import { resizeImageFile } from '../image'
  import Button from './ui/Button.svelte'

  let {
    value = $bindable(''),
    studentName = '',
  }: {
    value?: string
    studentName?: string
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
      value = await resizeImageFile(file)
    } catch (caught) {
      error = caught instanceof Error ? caught.message : 'Could not use that image.'
    } finally {
      processing = false
      input.value = ''
    }
  }
</script>

<div class="flex items-center gap-4">
  {#if value}
    <img src={value} alt={studentName ? `${studentName} preview` : 'Student preview'} class="size-18 shrink-0 rounded-full object-cover" />
  {:else}
    <div class="grid size-18 shrink-0 place-items-center rounded-full bg-secondary-container text-on-secondary-container"><UserCircle size={36} /></div>
  {/if}
  <div class="min-w-0 flex-1">
    <p class="type-title-small text-on-surface">{value ? 'Student photo' : 'Add a photo'} <span class="font-normal text-on-surface-variant">(optional)</span></p>
    <div class="mt-2 flex flex-wrap gap-2">
      <Button variant="secondary" size="sm" disabled={processing} onclick={() => cameraInput.click()}><Camera size={18} /> Camera</Button>
      <Button variant="outlined" size="sm" disabled={processing} onclick={() => galleryInput.click()}><ImageSquare size={18} /> Gallery</Button>
      {#if value}<Button variant="ghost" size="sm" disabled={processing} onclick={() => (value = '')}>Remove</Button>{/if}
    </div>
  </div>
  <input bind:this={galleryInput} class="hidden" type="file" accept="image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp" onchange={choosePhoto} />
  <input bind:this={cameraInput} class="hidden" type="file" accept="image/*" capture="user" onchange={choosePhoto} />
</div>
{#if error}<p class="type-body-small -mt-2 text-error">{error}</p>{/if}
