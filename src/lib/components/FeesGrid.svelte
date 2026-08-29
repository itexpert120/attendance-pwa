<script lang="ts">
  import { NotePencil, PencilSimple as Edit3, Receipt as ReceiptText } from 'phosphor-svelte'
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
  <div class="flex items-center justify-between gap-4 rounded-2xl border border-paper-200 bg-white px-4 py-3.5 shadow-soft">
    <div><p class="text-[10px] font-extrabold uppercase tracking-[0.12em] text-ink-600">Month total</p><p class="mt-1 text-xl font-bold tracking-[-0.02em] text-ink-950">{appState.settings?.currencyLabel} {minorToDisplay(feeGrandTotal(totals))}</p></div>
    <p class="max-w-34 text-right text-[10px] font-semibold leading-4 text-ink-600">Across {rows.length} {rows.length === 1 ? 'student' : 'students'}</p>
  </div>

  <div class="space-y-3 md:hidden">
    {#each rows as row (row.enrollment.id)}
      {@const amounts = amountsByEnrollment.get(row.enrollment.id) ?? EMPTY_FEES}
      <article class="overflow-hidden rounded-2xl border border-paper-200 bg-white shadow-soft">
        <div class="flex items-start gap-3 p-4">
          <span class="grid size-9 shrink-0 place-items-center rounded-xl bg-paper-100 text-xs font-extrabold text-ink-800">{row.enrollment.rollNumber}</span>
          <div class="min-w-0 flex-1"><h3 class="truncate text-sm font-bold text-ink-950">{row.student.name}</h3><p class="mt-0.5 text-[10px] font-semibold text-ink-600">Admission {row.student.admissionNumber}</p></div>
          <div class="text-right"><p class="text-[9px] font-extrabold uppercase tracking-[0.08em] text-ink-600">Total</p><p class="mt-0.5 text-sm font-extrabold tabular-nums text-ink-950">{appState.settings?.currencyLabel} {minorToDisplay(feeGrandTotal(amounts))}</p></div>
        </div>
        <div class="grid grid-cols-3 border-y border-paper-200 bg-paper-100/70">
          {#each FEE_FIELDS as field (field.key)}
            <div class="border-b border-r border-paper-200 px-2.5 py-2.5 [&:nth-child(3n)]:border-r-0 [&:nth-last-child(-n+3)]:border-b-0">
              <p class="text-[9px] font-extrabold uppercase tracking-[0.06em] text-ink-600">{field.shortLabel}</p>
              <p class="mt-0.5 truncate text-[11px] font-bold tabular-nums text-ink-800">{minorToDisplay(amounts[field.key])}</p>
            </div>
          {/each}
        </div>
        <div class="space-y-2.5 p-3">
          <label class="flex min-h-11 items-center gap-2 rounded-xl border border-paper-200 bg-paper-50 px-3 focus-within:border-register-600 focus-within:ring-3 focus-within:ring-register-100">
            <NotePencil size={16} weight="bold" class="shrink-0 text-ink-600" />
            <span class="sr-only">Remarks for {row.student.name}</span>
            <input
              value={remarkFor(row.enrollment.id)}
              placeholder="Add a remark"
              class="min-w-0 flex-1 bg-transparent text-xs font-medium text-ink-950 outline-none placeholder:text-ink-600/60"
              onchange={(event) => void appState.saveRemark(register.id, row.enrollment.id, event.currentTarget.value)}
            />
          </label>
          <Button class="w-full" variant="secondary" onclick={() => editFees(row)}><Edit3 size={16} weight="bold" /> Edit installments</Button>
        </div>
      </article>
    {:else}
      <div class="rounded-2xl border border-dashed border-paper-200 bg-white px-6 py-14 text-center text-sm text-ink-600"><ReceiptText size={25} class="mx-auto mb-2 opacity-60" />No students are enrolled for this month.</div>
    {/each}
  </div>

  <div class="hidden overflow-auto rounded-xl border border-paper-200 bg-white shadow-sm md:block" role="region" aria-label="Student fees table">
    <table class="w-max min-w-full border-separate border-spacing-0 text-right text-xs">
      <thead class="sticky top-0 z-30 bg-paper-100 font-bold text-ink-800">
        <tr>
          <th class="sticky left-0 z-40 min-w-24 border-b border-r border-paper-200 bg-paper-100 px-3 py-3 text-left">Admission</th>
          <th class="sticky left-24 z-40 min-w-16 border-b border-r border-paper-200 bg-paper-100 px-2 py-3 text-center">Roll</th>
          <th class="sticky left-40 z-40 min-w-48 border-b border-r border-paper-200 bg-paper-100 px-3 py-3 text-left">Student</th>
          {#each FEE_FIELDS as field (field.key)}<th class="min-w-28 border-b border-r border-paper-200 px-3 py-3">{field.shortLabel}</th>{/each}
          <th class="min-w-28 border-b border-r border-paper-200 bg-register-100 px-3 py-3">Total</th>
          <th class="min-w-56 border-b border-paper-200 px-3 py-3 text-left">Remarks</th>
        </tr>
      </thead>
      <tbody>
        {#each rows as row (row.enrollment.id)}
          {@const amounts = amountsByEnrollment.get(row.enrollment.id) ?? EMPTY_FEES}
          <tr class="group">
            <td class="sticky left-0 z-20 border-b border-r border-paper-200 bg-white px-3 py-3 text-left font-bold group-hover:bg-paper-50">{row.student.admissionNumber}</td>
            <td class="sticky left-24 z-20 border-b border-r border-paper-200 bg-white px-2 py-3 text-center font-bold group-hover:bg-paper-50">{row.enrollment.rollNumber}</td>
            <td class="sticky left-40 z-20 border-b border-r border-paper-200 bg-white px-3 py-2 text-left group-hover:bg-paper-50">
              <div class="flex items-center justify-between gap-3"><span class="max-w-36 truncate font-semibold text-ink-950">{row.student.name}</span><Button variant="ghost" size="icon" title={`Edit fees for ${row.student.name}`} onclick={() => editFees(row)}><Edit3 size={15} /></Button></div>
            </td>
            {#each FEE_FIELDS as field (field.key)}<td class="border-b border-r border-paper-200 px-3 py-3 tabular-nums text-ink-800">{minorToDisplay(amounts[field.key])}</td>{/each}
            <td class="border-b border-r border-paper-200 bg-register-50 px-3 py-3 font-black tabular-nums text-register-800">{minorToDisplay(feeGrandTotal(amounts))}</td>
            <td class="border-b border-paper-200 p-1.5 text-left">
              <input
                value={remarkFor(row.enrollment.id)}
                placeholder="Add remark…"
                aria-label={`Remarks for ${row.student.name}`}
                class="h-10 w-full rounded-md border border-transparent bg-transparent px-2 text-xs text-ink-800 outline-none hover:border-paper-200 focus:border-register-600 focus:bg-white focus:ring-2 focus:ring-register-100"
                onchange={(event) => void appState.saveRemark(register.id, row.enrollment.id, event.currentTarget.value)}
              />
            </td>
          </tr>
        {:else}
          <tr><td colspan="11" class="px-8 py-16 text-center text-sm text-ink-600"><ReceiptText size={25} class="mx-auto mb-2 opacity-60" />No students are enrolled for this month.</td></tr>
        {/each}
      </tbody>
      {#if rows.length}
        <tfoot class="sticky bottom-0 z-30 bg-paper-100 font-black text-ink-950">
          <tr>
            <td class="sticky left-0 z-40 border-r border-t border-paper-200 bg-paper-100 px-3 py-3 text-left" colspan="1">Totals</td>
            <td class="sticky left-24 z-40 border-r border-t border-paper-200 bg-paper-100"></td>
            <td class="sticky left-40 z-40 border-r border-t border-paper-200 bg-paper-100"></td>
            {#each FEE_FIELDS as field (field.key)}<td class="border-r border-t border-paper-200 px-3 py-3 tabular-nums">{minorToDisplay(totals[field.key])}</td>{/each}
            <td class="border-r border-t border-paper-200 bg-register-100 px-3 py-3 tabular-nums text-register-800">{minorToDisplay(feeGrandTotal(totals))}</td>
            <td class="border-t border-paper-200"></td>
          </tr>
        </tfoot>
      {/if}
    </table>
  </div>
</section>

<FeeEditor state={appState} row={selectedRow} bind:open={editorOpen} />
