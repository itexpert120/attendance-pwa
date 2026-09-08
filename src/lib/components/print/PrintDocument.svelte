<script lang="ts">
  import type { Snippet } from 'svelte'

  let {
    children,
    orientation = 'portrait',
  }: {
    children: Snippet
    orientation?: 'portrait' | 'landscape'
  } = $props()
</script>

<svelte:head>
  {#if orientation === 'landscape'}
    <style>
      @media print {
        @page {
          size: A4 landscape;
          margin: 10mm;
        }
      }
    </style>
  {:else}
    <style>
      @media print {
        @page {
          size: A4 portrait;
          margin: 14mm 12mm;
        }
      }
    </style>
  {/if}
</svelte:head>

<section class="print-doc hidden bg-white [print-color-adjust:exact] print:block">
  {@render children()}
</section>
