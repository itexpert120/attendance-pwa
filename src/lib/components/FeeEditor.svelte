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
      <div class="flex items-center justify-between gap-4 rounded-2xl bg-primary-container px-4 py-3.5 text-on-primary-container">
        <div><p class="text-[12px] font-medium opacity-75">Monthly total</p><p class="mt-1 text-lg font-medium">{appState.settings?.currencyLabel} {minorToDisplay(monthTotal)}</p></div>
        <Calculator size={22} weight="bold" class="opacity-75" />
      </div>
      <div class="grid grid-cols-3 gap-1 rounded-2xl bg-surface-container p-1" aria-label="Choose installment">
        {#each [1, 2, 3] as installment (installment)}
          <button type="button" class={`min-h-11 rounded-lg text-xs font-medium transition ${activeInstallment === installment ? 'bg-surface-container-lowest text-on-primary-container shadow-sm ring-1 ring-outline-variant' : 'text-on-surface-variant'}`} onclick={() => (activeInstallment = installment as InstallmentNumber)}>{installment === 1 ? '1st' : installment === 2 ? '2nd' : '3rd'}</button>
        {/each}
      </div>
      {#each drafts.filter((draft) => draft.installment === activeInstallment) as draft (draft.installment)}
        <section class="overflow-hidden rounded-2xl bg-surface-container-lowest" in:fly={{ x: 20, duration: 160 }}>
          <header class="flex items-center justify-between border-b border-outline-variant bg-surface-container px-4 py-3">
            <div><p class="text-sm font-medium text-on-surface">{draft.installment === 1 ? '1st' : draft.installment === 2 ? '2nd' : '3rd'} installment</p><p class="mt-0.5 type-label-medium text-on-surface-variant">Six fee categories</p></div>
            <p class="text-sm font-medium tabular-nums text-on-surface">{appState.settings?.currencyLabel} {minorToDisplay(feeGrandTotal(draftAmounts(draft)))}</p>
          </header>
          <div class="grid grid-cols-2 gap-3 p-4">
            {#each FEE_FIELDS as field (field.key)}
              <label class="grid gap-1.5">
                <span class="text-[12px] font-medium leading-4 text-on-surface-variant">{field.label}</span>
                <input
                  bind:value={draft.values[field.key]}
                  type="number"
                  min="0"
                  step="0.01"
                  inputmode="decimal"
                  aria-label={`${field.label}, installment ${draft.installment}`}
                  placeholder="0"
                  class="min-h-11 w-full rounded-2xl border border-transparent bg-surface-container-high px-3 text-right text-sm font-medium tabular-nums text-on-surface outline-none focus:border-primary focus:bg-surface-container-lowest focus:ring-3 focus:ring-primary/20"
                />
              </label>
            {/each}
          </div>
          <footer class="flex items-center justify-between gap-3 border-t border-outline-variant bg-surface-container-low p-3">
            <Button type="button" variant="ghost" size="sm" disabled={activeInstallment === 1} onclick={() => (activeInstallment = (activeInstallment - 1) as InstallmentNumber)}><CaretLeft size={15} weight="bold" /> Previous</Button>
            <p class="type-label-medium text-on-surface-variant">{activeInstallment} of 3</p>
            <Button type="button" variant="secondary" size="sm" disabled={activeInstallment === 3} onclick={() => (activeInstallment = (activeInstallment + 1) as InstallmentNumber)}>Next <CaretRight size={15} weight="bold" /></Button>
          </footer>
        </section>
      {/each}
    </div>

    <div class="hidden overflow-auto rounded-xl border border-outline-variant md:block">
      <table class="w-max min-w-full text-right text-xs">
        <thead class="bg-surface-container text-on-surface-variant">
          <tr>
            <th class="sticky left-0 min-w-28 border-r border-outline-variant bg-surface-container px-3 py-3 text-left">Installment</th>
            {#each FEE_FIELDS as field (field.key)}<th class="min-w-28 border-r border-outline-variant px-3 py-3">{field.label}</th>{/each}
            <th class="min-w-28 px-3 py-3">Total</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-outline-variant bg-surface-container-lowest">
          {#each drafts as draft (draft.installment)}
            <tr>
              <th class="sticky left-0 border-r border-outline-variant bg-surface-container-lowest px-3 py-3 text-left text-on-surface">{draft.installment === 1 ? '1st' : draft.installment === 2 ? '2nd' : '3rd'}</th>
              {#each FEE_FIELDS as field (field.key)}
                <td class="border-r border-outline-variant p-1.5">
                  <input
                    bind:value={draft.values[field.key]}
                    type="number"
                    min="0"
                    step="0.01"
                    aria-label={`${field.label}, installment ${draft.installment}`}
                    placeholder="0"
                    class="h-10 w-full rounded-md border border-outline-variant px-2 text-right font-medium text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                </td>
              {/each}
              <td class="bg-primary-container/40 px-3 font-medium text-on-primary-container">
                {appState.settings?.currencyLabel} {minorToDisplay(feeGrandTotal(draftAmounts(draft)))}
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
    <div class="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p class="hidden items-center gap-2 text-xs text-on-surface-variant md:flex"><Calculator size={16} /> Values are stored exactly to the nearest 0.01.</p>
      <Button type="submit" class="w-full sm:w-auto" disabled={saving}>{saving ? 'Saving…' : 'Save fee entries'}</Button>
    </div>
  </form>
</Modal>
