<script lang="ts">
  import LoaderCircle from 'phosphor-svelte/lib/CircleNotch'
  import AlertTriangle from 'phosphor-svelte/lib/Warning'
  import Router, { router } from 'svelte-spa-router'
  import { wrap } from 'svelte-spa-router/wrap'
  import { AttendanceState } from './lib/app-state.svelte'
  import { goBack, navigate, paths, replaceRoute } from './lib/navigation'
  import type { Tab } from './lib/ui-state.svelte'
  import Dashboard from './lib/components/Dashboard.svelte'
  import HomeworkView from './lib/components/HomeworkView.svelte'
  import PwaStatus from './lib/components/PwaStatus.svelte'
  import SchoolSettingsView from './lib/components/SchoolSettingsView.svelte'
  import SettingsView from './lib/components/SettingsView.svelte'
  import SetupScreen from './lib/components/SetupScreen.svelte'
  import StudentsView from './lib/components/StudentsView.svelte'
  import TabBar from './lib/components/TabBar.svelte'
  import TestReports from './lib/components/TestReports.svelte'
  import TestsView from './lib/components/TestsView.svelte'
  import Button from './lib/components/ui/Button.svelte'
  import PrintFontPreload from './lib/components/print/PrintFontPreload.svelte'
  import HomeworkEditPage from './lib/routes/HomeworkEditPage.svelte'
  import RegisterPage from './lib/routes/RegisterPage.svelte'
  import TestPage from './lib/routes/TestPage.svelte'

  const appState = new AttendanceState()
  let started = $state(false)

  const page = (component: Parameters<typeof wrap>[0]['component'], props: Record<string, unknown> = {}) =>
    wrap({ component, props: { state: appState, ...props } })

  // Screens are routes; short tasks (create, edit one item, filters, menus) are sheets.
  const routes = {
    '/': page(Dashboard),
    '/registers/:id/:section?': page(RegisterPage),
    '/students': page(StudentsView),
    '/tests': page(TestsView),
    '/tests/reports': page(TestReports),
    '/tests/:id': page(TestPage),
    '/homework': page(HomeworkView),
    '/homework/new': page(HomeworkView, { editor: 'new' }),
    '/homework/:id/edit': page(HomeworkEditPage),
    '/settings': page(SettingsView),
    '/settings/school': page(SchoolSettingsView),
    '*': page(Dashboard),
  }

  const TAB_ROOTS: Record<Tab, string> = {
    home: paths.home(),
    tests: paths.tests(),
    homework: paths.homework(),
    settings: paths.settings(),
  }

  let currentPath = $derived(router.location || "/")
  let rootTab = $derived<Tab | null>(
    (Object.entries(TAB_ROOTS).find(([, path]) => path === currentPath)?.[0] as Tab | undefined) ?? null,
  )
  let activeTab = $derived<Tab>(
    rootTab ??
      (currentPath.startsWith("/tests") ? "tests" : currentPath.startsWith("/homework") ? "homework" : currentPath.startsWith("/settings") ? "settings" : "home"),
  )

  $effect(() => {
    if (!started) {
      started = true
      void appState.initialize()
    }
  })

  function selectTab(tab: Tab) {
    navigator.vibrate?.(6)
    if (tab === rootTab) {
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    // Registers is the bottom of the stack; other tabs replace each other above
    // it, so back from any tab returns to Registers before leaving the app.
    if (tab === 'home' && rootTab) goBack(paths.home())
    else if (rootTab && rootTab !== 'home') replaceRoute(TAB_ROOTS[tab])
    else navigate(TAB_ROOTS[tab])
  }
</script>

{#if !appState.ready}
  <main class="grid min-h-svh place-items-center bg-surface-container px-5 text-center text-on-surface">
    <div><LoaderCircle size={32} class="mx-auto animate-spin text-primary" /><p class="type-title-medium mt-4">Opening your register…</p><p class="type-body-medium mt-1 text-on-surface-variant">Loading data stored on this device</p></div>
  </main>
{:else if appState.error}
  <main class="grid min-h-svh place-items-center bg-surface-container px-5 text-center text-on-surface">
    <div class="max-w-md rounded-[28px] bg-surface-container-high p-6 text-left"><AlertTriangle size={24} class="text-error" /><h1 class="type-headline-small mt-4">The offline database could not open</h1><p class="type-body-medium mt-4 text-on-surface-variant">{appState.error}</p><div class="mt-6 flex justify-end"><Button variant="ghost" onclick={() => location.reload()}>Try again</Button></div></div>
  </main>
{:else if !appState.settings}
  <SetupScreen state={appState} />
{:else}
  <div class="md:pl-22">
    <Router {routes} restoreScrollState />
  </div>
  <TabBar active={activeTab} visible={rootTab !== null} onselect={selectTab} />
{/if}

<PwaStatus />
<PrintFontPreload />
