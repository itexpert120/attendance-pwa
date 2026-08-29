<script lang="ts">
  import IdentificationCard from 'phosphor-svelte/lib/IdentificationCard'
  import Users from 'phosphor-svelte/lib/Users'
  import type { AttendanceState } from '../app-state.svelte'
  import {
    displayToMinor,
    feeGrandTotal,
    feesForInstallment,
    installmentStudentCount,
    minorToDisplay,
  } from '../calculations'
  import { FEE_FIELDS, type InstallmentNumber } from '../types'

  let {
    state: appState,
    installment,
  }: {
    state: AttendanceState
    installment: InstallmentNumber
  } = $props()

  let register = $derived(appState.selectedRegister!)
  let meta = $derived(
    appState.installmentMeta.find(
      (item) => item.registerId === register.id && item.installment === installment,
    ),
  )
  let amounts = $derived(feesForInstallment(appState.feeEntries, register.id, installment))
  let students = $derived(installmentStudentCount(appState.feeEntries, register.id, installment))
  let rate = $state('')
  let receiverName = $state('')

  $effect(() => {
    rate = meta?.rate ? minorToDisplay(meta.rate) : ''
    receiverName = meta?.receiverName ?? ''
  })

  function saveMeta() {
    void appState.saveInstallmentMeta(
      register.id,
      installment,
      displayToMinor(rate),
      receiverName,
    )
  }
</script>

<article class="overflow-hidden rounded-2xl border border-paper-200 bg-white shadow-soft">
  <header class="flex items-center justify-between gap-4 border-b border-paper-200 bg-paper-100 px-4 py-3.5">
    <div>
      <h3 class="text-sm font-extrabold text-ink-950">{installment === 1 ? '1st' : installment === 2 ? '2nd' : '3rd'} installment</h3>
      <p class="mt-1 flex items-center gap-1.5 text-[10px] font-semibold text-ink-600"><Users size={13} weight="bold" /> {students} {students === 1 ? 'student' : 'students'}</p>
    </div>
    <div class="text-right"><p class="text-[9px] font-extrabold uppercase tracking-[0.08em] text-ink-600">Collected</p><p class="mt-0.5 text-base font-extrabold tabular-nums text-ink-950">{appState.settings?.currencyLabel} {minorToDisplay(feeGrandTotal(amounts))}</p></div>
  </header>

  <div class="grid grid-cols-3 border-b border-paper-200">
    {#each FEE_FIELDS as field (field.key)}
      <div class="border-b border-r border-paper-200 px-2.5 py-2.5 [&:nth-child(3n)]:border-r-0 [&:nth-last-child(-n+3)]:border-b-0">
        <p class="text-[9px] font-extrabold uppercase tracking-[0.05em] text-ink-600">{field.shortLabel}</p>
        <p class="mt-0.5 truncate text-[11px] font-bold tabular-nums text-ink-800">{minorToDisplay(amounts[field.key])}</p>
      </div>
    {/each}
  </div>

  <div class="grid gap-3 p-4 sm:grid-cols-2">
    <label class="grid gap-1.5">
      <span class="text-[10px] font-bold text-ink-600">Rate per student</span>
      <div class="flex min-h-11 items-center rounded-xl border border-paper-200 bg-paper-50 px-3 focus-within:border-register-600 focus-within:ring-3 focus-within:ring-register-100">
        <span class="mr-2 text-xs font-bold text-ink-600">{appState.settings?.currencyLabel}</span>
        <input bind:value={rate} type="number" min="0" step="0.01" inputmode="decimal" aria-label={`Rate for installment ${installment}`} placeholder="0" class="min-w-0 flex-1 bg-transparent text-right text-sm font-bold tabular-nums text-ink-950 outline-none" onchange={saveMeta} />
      </div>
    </label>
    <label class="grid gap-1.5">
      <span class="text-[10px] font-bold text-ink-600">Receiver name</span>
      <div class="flex min-h-11 items-center gap-2 rounded-xl border border-paper-200 bg-paper-50 px-3 focus-within:border-register-600 focus-within:ring-3 focus-within:ring-register-100">
        <IdentificationCard size={16} weight="bold" class="shrink-0 text-ink-600" />
        <input bind:value={receiverName} aria-label={`Receiver name for installment ${installment}`} placeholder="Name or signature" class="min-w-0 flex-1 bg-transparent text-xs font-semibold text-ink-950 outline-none placeholder:text-ink-600/55" onchange={saveMeta} />
      </div>
    </label>
  </div>
</article>
