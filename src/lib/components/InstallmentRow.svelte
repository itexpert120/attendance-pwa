<script lang="ts">
  import type { AttendanceState } from '../app-state.svelte'
  import { displayToMinor, feeGrandTotal, feesForInstallment, installmentStudentCount, minorToDisplay } from '../calculations'
  import { FEE_FIELDS, type InstallmentNumber } from '../types'

  let {
    state: appState,
    installment,
  }: {
    state: AttendanceState
    installment: InstallmentNumber
  } = $props()

  let register = $derived(appState.selectedRegister!)
  let meta = $derived(appState.installmentMeta.find((item) => item.registerId === register.id && item.installment === installment))
  let amounts = $derived(feesForInstallment(appState.feeEntries, register.id, installment))
  let rate = $state('')
  let receiverName = $state('')

  $effect(() => {
    rate = meta?.rate ? minorToDisplay(meta.rate) : ''
    receiverName = meta?.receiverName ?? ''
  })

  function saveMeta() {
    void appState.saveInstallmentMeta(register.id, installment, displayToMinor(rate), receiverName)
  }
</script>

<tr>
  <th class="sticky left-0 border-b border-r border-paper-200 bg-white px-3 py-3 text-left text-ink-950">{installment === 1 ? '1st' : installment === 2 ? '2nd' : '3rd'}</th>
  <td class="border-b border-r border-paper-200 px-3 py-3 text-center font-black">{installmentStudentCount(appState.feeEntries, register.id, installment)}</td>
  <td class="border-b border-r border-paper-200 p-1.5"><input bind:value={rate} type="number" min="0" step="0.01" aria-label={`Rate for installment ${installment}`} class="h-9 w-24 rounded-md border border-paper-200 px-2 text-right outline-none focus:border-register-600" onchange={saveMeta} /></td>
  {#each FEE_FIELDS as field (field.key)}<td class="border-b border-r border-paper-200 px-3 py-3 text-right tabular-nums">{minorToDisplay(amounts[field.key])}</td>{/each}
  <td class="border-b border-r border-paper-200 bg-register-50 px-3 py-3 text-right font-black tabular-nums text-register-800">{minorToDisplay(feeGrandTotal(amounts))}</td>
  <td class="border-b border-paper-200 p-1.5"><input bind:value={receiverName} aria-label={`Receiver name for installment ${installment}`} placeholder="Receiver name" class="h-9 min-w-40 rounded-md border border-paper-200 px-2 outline-none focus:border-register-600" onchange={saveMeta} /></td>
</tr>
