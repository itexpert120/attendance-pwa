<script lang="ts">
  let {
    compact = false,
    logoDataUrl = '',
    alt = 'School logo',
  }: {
    compact?: boolean
    logoDataUrl?: string
    alt?: string
  } = $props()
</script>

<div class={`grid shrink-0 place-items-center overflow-hidden rounded-xl border border-white/10 bg-register-800 text-white shadow-sm ${compact ? 'size-9' : 'size-12'}`}>
  {#if logoDataUrl}
    <img src={logoDataUrl} {alt} class="size-full bg-white object-contain p-0.5" />
  {:else}
    <svg viewBox="0 0 48 48" class={compact ? 'size-6' : 'size-8'} fill="none" aria-hidden="true">
      <path d="M8 18 24 9l16 9-16 9L8 18Z" fill="currentColor" opacity=".95" />
      <path d="M14 23v10c6 5 14 5 20 0V23l-10 6-10-6Z" fill="currentColor" opacity=".72" />
      <path d="M39 20v11" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" />
    </svg>
  {/if}
</div>
