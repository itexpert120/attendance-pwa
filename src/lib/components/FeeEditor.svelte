<script lang="ts">
  import { Calculator } from 'phosphor-svelte'
  import type { AttendanceState } from '../app-state.svelte'
  import { displayToMinor, feeGrandTotal, minorToDisplay } from '../calculations'
  import { EMPTY_FEES, FEE_FIELDS, type EnrollmentRow, type FeeAmounts, type InstallmentNumber } from '../types'
  import Button from './ui/Button.svelte'
  import Modal from './ui/Modal.svelte'

  let {
    state: appState,
    row,
    open = $bindable(false),
  }: {
    state: AttendanceState
    row: EnrollmentRow | null
    open: boolean
  } = $props()

  type Draft = { installment: InstallmentNumber; values: Record<keyof FeeAmounts, string> }
  let drafts = $state<Draft[]>([])
  let saving = $state(false)

  $effect(() => {
    if (!open || !row || !appState.selectedRegister) return
    drafts = ([1, 2, 3] as InstallmentNumber[]).map((installment) => {
      const entry = appState.feeEntries.find(
        (item) =>
          item.registerId === appState.selectedRegister!.id &&
          item.enrollmentId === row.enrollment.id &&
          item.installment === installment,
      )
      const amounts = entry ?? EMPTY_FEES
      return {
        installment,
        values: Object.fromEntries(
          FEE_FIELDS.map((field) => [field.key, amounts[field.key] ? minorToDisplay(amounts[field.key]) : '']),
        ) as Record<keyof FeeAmounts, string>,
      }
    })
  })

  function draftAmounts(draft: Draft): FeeAmounts {
    return Object.fromEntries(
      FEE_FIELDS.map((field) => [field.key, displayToMinor(draft.values[field.key])]),
    ) as unknown as FeeAmounts
  }

  async function save(event: SubmitEvent) {
    event.preventDefault()
    if (!row || !appState.selectedRegister) return
    saving = true
    await appState.saveFeeEntries(
      appState.selectedRegister.id,
      row.enrollment.id,
      drafts.map((draft) => ({ installment: draft.installment, amounts: draftAmounts(draft) })),
    )
    saving = false
    open = false
  }
</script>

<Modal bind:open title={row ? `Fees · ${row.student.name}` : 'Student fees'} description="Enter amounts in normal currency units. Monthly and installment totals update automatically." size="xl">
  <form onsubmit={save}>
    <div class="overflow-auto rounded-xl border border-paper-200">
      <table class="w-max min-w-full text-right text-xs">
        <thead class="bg-paper-100 text-ink-600">
          <tr>
            <th class="sticky left-0 min-w-28 border-r border-paper-200 bg-paper-100 px-3 py-3 text-left">Installment</th>
            {#each FEE_FIELDS as field (field.key)}<th class="min-w-28 border-r border-paper-200 px-3 py-3">{field.label}</th>{/each}
            <th class="min-w-28 px-3 py-3">Total</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-paper-200 bg-white">
          {#each drafts as draft (draft.installment)}
            <tr>
              <th class="sticky left-0 border-r border-paper-200 bg-white px-3 py-3 text-left text-ink-950">{draft.installment === 1 ? '1st' : draft.installment === 2 ? '2nd' : '3rd'}</th>
              {#each FEE_FIELDS as field (field.key)}
                <td class="border-r border-paper-200 p-1.5">
                  <input
                    bind:value={draft.values[field.key]}
                    type="number"
                    min="0"
                    step="0.01"
                    aria-label={`${field.label}, installment ${draft.installment}`}
                    placeholder="0"
                    class="h-10 w-full rounded-md border border-paper-200 px-2 text-right font-semibold text-ink-950 outline-none focus:border-register-600 focus:ring-2 focus:ring-register-100"
                  />
                </td>
              {/each}
              <td class="bg-register-50 px-3 font-black text-register-800">
                {appState.settings?.currencyLabel} {minorToDisplay(feeGrandTotal(draftAmounts(draft)))}
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
    <div class="mt-4 flex items-center justify-between gap-4">
      <p class="flex items-center gap-2 text-xs text-ink-600"><Calculator size={16} /> Values are stored exactly to the nearest 0.01.</p>
      <Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save fee entries'}</Button>
    </div>
  </form>
</Modal>
