<script lang="ts">
  import Calculator from 'phosphor-svelte/lib/Calculator'
  import CaretLeft from 'phosphor-svelte/lib/CaretLeft'
  import CaretRight from 'phosphor-svelte/lib/CaretRight'
  import { fly } from 'svelte/transition'
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
  let activeInstallment = $state<InstallmentNumber>(1)
  let monthTotal = $derived(
    drafts.reduce((total, draft) => total + feeGrandTotal(draftAmounts(draft)), 0),
  )

  $effect(() => {
    if (!open || !row || !appState.selectedRegister) return
    activeInstallment = 1
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

<Modal bind:open title={row ? `Fees · ${row.student.name}` : 'Student fees'} description="Enter each installment in normal currency units." size="xl">
  <form onsubmit={save}>
    <div class="space-y-3 md:hidden">
      <div class="flex items-center justify-between gap-4 rounded-2xl border border-paper-200 bg-register-900 px-4 py-3.5 text-white">
        <div><p class="text-[9px] font-extrabold uppercase tracking-[0.12em] text-white/55">Monthly total</p><p class="mt-1 text-lg font-extrabold">{appState.settings?.currencyLabel} {minorToDisplay(monthTotal)}</p></div>
        <Calculator size={22} weight="bold" class="text-white/65" />
      </div>
      <div class="grid grid-cols-3 gap-1 rounded-xl bg-paper-100 p-1" aria-label="Choose installment">
        {#each [1, 2, 3] as installment (installment)}
          <button type="button" class={`min-h-11 rounded-lg text-xs font-extrabold transition ${activeInstallment === installment ? 'bg-white text-register-800 shadow-sm ring-1 ring-paper-200' : 'text-ink-600'}`} onclick={() => (activeInstallment = installment as InstallmentNumber)}>{installment === 1 ? '1st' : installment === 2 ? '2nd' : '3rd'}</button>
        {/each}
      </div>
      {#each drafts.filter((draft) => draft.installment === activeInstallment) as draft (draft.installment)}
        <section class="overflow-hidden rounded-2xl border border-paper-200 bg-white shadow-soft" in:fly={{ x: 20, duration: 160 }}>
          <header class="flex items-center justify-between border-b border-paper-200 bg-paper-100 px-4 py-3">
            <div><p class="text-sm font-extrabold text-ink-950">{draft.installment === 1 ? '1st' : draft.installment === 2 ? '2nd' : '3rd'} installment</p><p class="mt-0.5 text-[10px] font-semibold text-ink-600">Six fee categories</p></div>
            <p class="text-sm font-extrabold tabular-nums text-ink-950">{appState.settings?.currencyLabel} {minorToDisplay(feeGrandTotal(draftAmounts(draft)))}</p>
          </header>
          <div class="grid grid-cols-2 gap-3 p-4">
            {#each FEE_FIELDS as field (field.key)}
              <label class="grid gap-1.5">
                <span class="text-[10px] font-bold leading-4 text-ink-600">{field.label}</span>
                <input
                  bind:value={draft.values[field.key]}
                  type="number"
                  min="0"
                  step="0.01"
                  inputmode="decimal"
                  aria-label={`${field.label}, installment ${draft.installment}`}
                  placeholder="0"
                  class="min-h-11 w-full rounded-xl border border-paper-200 bg-paper-50 px-3 text-right text-sm font-bold tabular-nums text-ink-950 outline-none focus:border-register-600 focus:bg-white focus:ring-3 focus:ring-register-100"
                />
              </label>
            {/each}
          </div>
          <footer class="flex items-center justify-between gap-3 border-t border-paper-200 bg-paper-50 p-3">
            <Button type="button" variant="ghost" size="sm" disabled={activeInstallment === 1} onclick={() => (activeInstallment = (activeInstallment - 1) as InstallmentNumber)}><CaretLeft size={15} weight="bold" /> Previous</Button>
            <p class="text-[10px] font-bold text-ink-600">{activeInstallment} of 3</p>
            <Button type="button" variant="secondary" size="sm" disabled={activeInstallment === 3} onclick={() => (activeInstallment = (activeInstallment + 1) as InstallmentNumber)}>Next <CaretRight size={15} weight="bold" /></Button>
          </footer>
        </section>
      {/each}
    </div>

    <div class="hidden overflow-auto rounded-xl border border-paper-200 md:block">
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
    <div class="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p class="hidden items-center gap-2 text-xs text-ink-600 md:flex"><Calculator size={16} /> Values are stored exactly to the nearest 0.01.</p>
      <Button type="submit" class="w-full sm:w-auto" disabled={saving}>{saving ? 'Saving…' : 'Save fee entries'}</Button>
    </div>
  </form>
</Modal>
