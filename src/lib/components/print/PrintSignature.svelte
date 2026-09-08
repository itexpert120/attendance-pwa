<script lang="ts">
  let {
    signers,
  }: {
    signers: Array<{ label: string; name?: string }>
  } = $props()
</script>

<footer class="mt-12 flex justify-end gap-16">
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
