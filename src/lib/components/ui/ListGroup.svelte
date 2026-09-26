<script lang="ts">
  import type { Snippet } from 'svelte'

  let {
    header,
    footer,
    action,
    muted = false,
    children,
    class: className = '',
  }: {
    header?: string
    footer?: string
    /** Small accessory at the right of the header, e.g. "See all". */
    action?: Snippet
    /** For groups placed inside a bottom sheet. */
    muted?: boolean
    children: Snippet
    class?: string
  } = $props()
</script>

<!--
  Material 3 expressive grouped list: items are separate rounded segments with a
  2dp gap; the group's outer corners are large, inner corners small.
-->
<section class={`min-w-0 ${className}`}>
  {#if header || action}
    <div class="flex min-h-10 items-center justify-between gap-3 px-4 pb-1">
      {#if header}<h2 class="type-title-small text-primary">{header}</h2>{/if}
      {#if action}<div class="type-label-large text-primary">{@render action()}</div>{/if}
    </div>
  {/if}
  <div
    class={`flex flex-col gap-0.5 [&>*]:rounded-[4px] [&>*:first-child]:rounded-t-[20px] [&>*:last-child]:rounded-b-[20px] ${muted ? '[&>*]:bg-surface-container-highest/60' : '[&>*]:bg-surface-container-lowest'}`}
  >
    {@render children()}
  </div>
  {#if footer}<p class="type-body-small px-4 pt-2 text-on-surface-variant">{footer}</p>{/if}
</section>
