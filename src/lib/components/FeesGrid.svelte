<script lang="ts">
  import { PencilSimple as Edit3, Receipt as ReceiptText } from 'phosphor-svelte'
  import type { AttendanceState } from '../app-state.svelte'
  import { addFees, feeGrandTotal, feesForStudent, minorToDisplay } from '../calculations'
  import { FEE_FIELDS, type EnrollmentRow } from '../types'
  import FeeEditor from './FeeEditor.svelte'
  import Button from './ui/Button.svelte'

  let { state: appState }: { state: AttendanceState } = $props()

  let editorOpen = $state(false)
  let selectedRow = $state<EnrollmentRow | null>(null)
  let register = $derived(appState.selectedRegister!)
  let rows = $derived(appState.rowsForRegister(register))
  let totals = $derived(addFees(...rows.map((row) => feesForStudent(appState.feeEntries, register.id, row.enrollment.id))))

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
  <div class="flex flex-col gap-2 rounded-xl border border-paper-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
    <div><h2 class="text-sm font-black text-ink-950">Monthly student fees</h2><p class="mt-1 text-xs text-ink-600">Select a student to enter the 1st, 2nd, and 3rd installment breakdown.</p></div>
    <p class="text-xs font-bold text-register-800">Amounts shown in {appState.settings?.currencyLabel}</p>
  </div>

  <div class="overflow-auto rounded-xl border border-paper-200 bg-white shadow-sm" role="region" aria-label="Student fees table">
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
          {@const amounts = feesForStudent(appState.feeEntries, register.id, row.enrollment.id)}
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
