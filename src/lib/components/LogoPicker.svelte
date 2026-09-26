<script lang="ts">
  import ImageSquare from 'phosphor-svelte/lib/ImageSquare'
  import Upload from 'phosphor-svelte/lib/UploadSimple'
  import { resizeImageFile } from '../image'
  import Button from './ui/Button.svelte'

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

<div class="flex items-center gap-4">
  {#if value}
    <img src={value} alt="Selected school logo" class="size-16 shrink-0 rounded-full bg-surface-container-lowest object-contain ring-1 ring-outline-variant" />
  {:else}
    <div class="grid size-16 shrink-0 place-items-center rounded-full bg-secondary-container text-on-secondary-container"><ImageSquare size={28} /></div>
  {/if}
  <div class="min-w-0 flex-1">
    <p class="type-title-small text-on-surface">School logo</p>
    <p class="type-body-small text-on-surface-variant">Printed on reports. Stored only on this device.</p>
    <div class="mt-2 flex flex-wrap gap-2">
      <Button variant="secondary" size="sm" disabled={processing} onclick={() => input.click()}><Upload size={18} /> {value ? 'Change' : 'Choose'}</Button>
      {#if value}<Button variant="ghost" size="sm" onclick={() => (value = '')}>Remove</Button>{/if}
    </div>
  </div>
  <input bind:this={input} class="hidden" type="file" accept="image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp" onchange={chooseLogo} />
</div>
{#if error}<p class="type-body-small -mt-2 text-error">{error}</p>{/if}
