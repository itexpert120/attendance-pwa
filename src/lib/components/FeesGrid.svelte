<script lang="ts">
  import NotePencil from 'phosphor-svelte/lib/NotePencil'
  import Edit3 from 'phosphor-svelte/lib/PencilSimple'
  import ReceiptText from 'phosphor-svelte/lib/Receipt'
  import type { AttendanceState } from '../app-state.svelte'
  import { addFees, feeGrandTotal, feesByEnrollment, minorToDisplay } from '../calculations'
  import { EMPTY_FEES, FEE_FIELDS, type EnrollmentRow } from '../types'
  import FeeEditor from './FeeEditor.svelte'
  import Button from './ui/Button.svelte'

  let { state: appState }: { state: AttendanceState } = $props()

  let editorOpen = $state(false)
  let selectedRow = $state<EnrollmentRow | null>(null)
  let register = $derived(appState.selectedRegister!)
  let rows = $derived(appState.rowsForRegister(register))
  let amountsByEnrollment = $derived(feesByEnrollment(appState.feeEntries, register.id))
  let totals = $derived(
    addFees(
      ...rows.map((row) => amountsByEnrollment.get(row.enrollment.id) ?? EMPTY_FEES),
    ),
  )

  function editFees(row: EnrollmentRow) {
    selectedRow = row
    editorOpen = true
  }

  function remarkFor(enrollmentId: string) {
    return appState.remarks.find(
      (remark) => remark.registerId === register.id && remark.enrollmentId === enrollmentId,
    )?.text ?? ''
  }
</script>

<section class="space-y-3">
  <div class="flex items-center justify-between gap-4 rounded-2xl bg-surface-container-lowest px-4 py-3.5">
    <div><p class="type-label-medium text-on-surface-variant">Month total</p><p class="mt-1 text-xl font-medium text-on-surface">{appState.settings?.currencyLabel} {minorToDisplay(feeGrandTotal(totals))}</p></div>
    <p class="max-w-34 text-right text-[12px] font-medium leading-4 text-on-surface-variant">Across {rows.length} {rows.length === 1 ? 'student' : 'students'}</p>
  </div>

  <div class="space-y-3 md:hidden">
    {#each rows as row (row.enrollment.id)}
      {@const amounts = amountsByEnrollment.get(row.enrollment.id) ?? EMPTY_FEES}
      <article class="overflow-hidden rounded-2xl bg-surface-container-lowest">
        <div class="flex items-start gap-3 p-4">
          <span class="grid size-9 shrink-0 place-items-center rounded-2xl bg-surface-container text-xs font-medium text-on-surface">{row.enrollment.rollNumber}</span>
          <div class="min-w-0 flex-1"><h3 class="truncate text-sm font-medium text-on-surface">{row.student.name}</h3><p class="mt-0.5 type-label-medium text-on-surface-variant">Admission {row.student.admissionNumber}</p></div>
          <div class="text-right"><p class="type-label-medium text-on-surface-variant">Total</p><p class="mt-0.5 text-sm font-medium tabular-nums text-on-surface">{appState.settings?.currencyLabel} {minorToDisplay(feeGrandTotal(amounts))}</p></div>
        </div>
        <div class="grid grid-cols-3 border-y border-outline-variant bg-surface-container">
          {#each FEE_FIELDS as field (field.key)}
            <div class="border-b border-r border-outline-variant px-2.5 py-2.5 [&:nth-child(3n)]:border-r-0 [&:nth-last-child(-n+3)]:border-b-0">
              <p class="type-label-medium text-on-surface-variant">{field.shortLabel}</p>
              <p class="mt-0.5 truncate text-[12px] font-medium tabular-nums text-on-surface">{minorToDisplay(amounts[field.key])}</p>
            </div>
          {/each}
        </div>
        <div class="space-y-2.5 p-3">
          <label class="flex min-h-11 items-center gap-2 rounded-2xl border border-transparent bg-surface-container-high px-3 focus-within:border-primary focus-within:ring-3 focus-within:ring-primary/20">
            <NotePencil size={16} weight="bold" class="shrink-0 text-on-surface-variant" />
            <span class="sr-only">Remarks for {row.student.name}</span>
            <input
              value={remarkFor(row.enrollment.id)}
              placeholder="Add a remark"
              class="min-w-0 flex-1 bg-transparent text-xs font-medium text-on-surface outline-none placeholder:text-on-surface-variant/60"
              onchange={(event) => void appState.saveRemark(register.id, row.enrollment.id, event.currentTarget.value)}
            />
          </label>
          <Button class="w-full" variant="secondary" onclick={() => editFees(row)}><Edit3 size={16} weight="bold" /> Edit installments</Button>
        </div>
      </article>
    {:else}
      <div class="rounded-2xl bg-surface-container-lowest px-6 py-14 text-center text-sm text-on-surface-variant"><ReceiptText size={25} class="mx-auto mb-2 opacity-60" />No students are enrolled for this month.</div>
    {/each}
  </div>

  <div class="hidden overflow-auto rounded-2xl bg-surface-container-lowest md:block" role="region" aria-label="Student fees table">
    <table class="w-max min-w-full border-separate border-spacing-0 text-right text-xs">
      <thead class="sticky top-0 z-30 bg-surface-container font-medium text-on-surface">
        <tr>
          <th class="sticky left-0 z-40 min-w-24 border-b border-r border-outline-variant bg-surface-container px-3 py-3 text-left">Admission</th>
          <th class="sticky left-24 z-40 min-w-16 border-b border-r border-outline-variant bg-surface-container px-2 py-3 text-center">Roll</th>
          <th class="sticky left-40 z-40 min-w-48 border-b border-r border-outline-variant bg-surface-container px-3 py-3 text-left">Name with parentage</th>
          {#each FEE_FIELDS as field (field.key)}<th class="min-w-28 border-b border-r border-outline-variant px-3 py-3">{field.shortLabel}</th>{/each}
          <th class="min-w-28 border-b border-r border-outline-variant bg-primary-container px-3 py-3">Total</th>
          <th class="min-w-56 border-b border-outline-variant px-3 py-3 text-left">Remarks</th>
        </tr>
      </thead>
      <tbody>
        {#each rows as row (row.enrollment.id)}
          {@const amounts = amountsByEnrollment.get(row.enrollment.id) ?? EMPTY_FEES}
          <tr class="group">
            <td class="sticky left-0 z-20 border-b border-r border-outline-variant bg-surface-container-lowest px-3 py-3 text-left font-medium group-hover:bg-surface-container-low">{row.student.admissionNumber}</td>
            <td class="sticky left-24 z-20 border-b border-r border-outline-variant bg-surface-container-lowest px-2 py-3 text-center font-medium group-hover:bg-surface-container-low">{row.enrollment.rollNumber}</td>
            <td class="sticky left-40 z-20 border-b border-r border-outline-variant bg-surface-container-lowest px-3 py-2 text-left group-hover:bg-surface-container-low">
              <div class="flex items-center justify-between gap-3"><span class="max-w-36 truncate font-medium text-on-surface">{row.student.name}</span><Button variant="ghost" size="icon" title={`Edit fees for ${row.student.name}`} onclick={() => editFees(row)}><Edit3 size={15} /></Button></div>
            </td>
            {#each FEE_FIELDS as field (field.key)}<td class="border-b border-r border-outline-variant px-3 py-3 tabular-nums text-on-surface">{minorToDisplay(amounts[field.key])}</td>{/each}
            <td class="border-b border-r border-outline-variant bg-primary-container/40 px-3 py-3 font-medium tabular-nums text-on-primary-container">{minorToDisplay(feeGrandTotal(amounts))}</td>
            <td class="border-b border-outline-variant p-1.5 text-left">
              <input
                value={remarkFor(row.enrollment.id)}
                placeholder="Add remark…"
                aria-label={`Remarks for ${row.student.name}`}
                class="h-10 w-full rounded-md border border-transparent bg-transparent px-2 text-xs text-on-surface outline-none hover:border-outline-variant focus:border-primary focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary/20"
                onchange={(event) => void appState.saveRemark(register.id, row.enrollment.id, event.currentTarget.value)}
              />
            </td>
          </tr>
        {:else}
          <tr><td colspan="11" class="px-8 py-16 text-center text-sm text-on-surface-variant"><ReceiptText size={25} class="mx-auto mb-2 opacity-60" />No students are enrolled for this month.</td></tr>
        {/each}
      </tbody>
      {#if rows.length}
        <tfoot class="sticky bottom-0 z-30 bg-surface-container font-medium text-on-surface">
          <tr>
            <td class="sticky left-0 z-40 border-r border-t border-outline-variant bg-surface-container px-3 py-3 text-left" colspan="1">Totals</td>
            <td class="sticky left-24 z-40 border-r border-t border-outline-variant bg-surface-container"></td>
            <td class="sticky left-40 z-40 border-r border-t border-outline-variant bg-surface-container"></td>
            {#each FEE_FIELDS as field (field.key)}<td class="border-r border-t border-outline-variant px-3 py-3 tabular-nums">{minorToDisplay(totals[field.key])}</td>{/each}
            <td class="border-r border-t border-outline-variant bg-primary-container px-3 py-3 tabular-nums text-on-primary-container">{minorToDisplay(feeGrandTotal(totals))}</td>
            <td class="border-t border-outline-variant"></td>
          </tr>
        </tfoot>
      {/if}
    </table>
  </div>
</section>

<FeeEditor state={appState} row={selectedRow} bind:open={editorOpen} />
