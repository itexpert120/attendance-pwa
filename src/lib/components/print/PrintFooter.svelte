<script lang="ts">
  let {
    schoolName,
    documentLabel,
  }: {
    schoolName: string
    documentLabel: string
  } = $props()
</script>

<p class="print-footer flex items-center justify-between gap-4">
  <span>{schoolName}</span>
  <span>{documentLabel}</span>
</p>
