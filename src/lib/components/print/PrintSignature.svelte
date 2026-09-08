<script lang="ts">
  let {
    signers,
    class: className = 'mt-12',
  }: {
    signers: Array<{ label: string; name?: string }>
    class?: string
  } = $props()
</script>

<footer class={`flex justify-end gap-16 ${className}`}>
  {#each signers as signer (signer.label)}
    <div class="print-sign">
      <div class="print-sign-line"></div>
      <p class="print-sign-label">{signer.label}</p>
      {#if signer.name}
        <p class="print-sign-name">{signer.name}</p>
      {/if}
    </div>
  {/each}
</footer>
