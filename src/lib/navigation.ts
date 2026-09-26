import { pop, push, replace } from 'svelte-spa-router'

/**
 * Screens are routes handled by svelte-spa-router. Sheets are not routes: each
 * open sheet adds a same-URL history entry so the device back button closes
 * the top sheet before leaving the screen. Route changes wait for closing
 * sheets to pop their entries, otherwise that pop would land on the old URL.
 */

export type RegisterSection = 'attendance' | 'fees' | 'summary' | 'reports'

export const paths = {
  home: () => '/',
  register: (id: string, section: RegisterSection = 'attendance') =>
    section === 'attendance' ? `/registers/${id}` : `/registers/${id}/${section}`,
  students: (classGroupId?: string) => (classGroupId ? `/students?class=${encodeURIComponent(classGroupId)}` : '/students'),
  tests: () => '/tests',
  testReports: () => '/tests/reports',
  test: (id: string) => `/tests/${id}`,
  homework: () => '/homework',
  homeworkNew: () => '/homework/new',
  homeworkEdit: (id: string) => `/homework/${id}/edit`,
  settings: () => '/settings',
  schoolSettings: () => '/settings/school',
}

// ---------------------------------------------------------------- sheets

type SheetEntry = { onBack: () => void }

const sheets: SheetEntry[] = []
let pendingPops = 0
let suppressedPops = 0
const afterSettled: Array<() => void> = []

function settle() {
  if (pendingPops || suppressedPops) return
  afterSettled.splice(0).forEach((task) => task())
}

function flushPendingPops() {
  if (!pendingPops) return
  const count = pendingPops
  pendingPops = 0
  suppressedPops += 1
  history.go(-count)
}

function whenSettled(task: () => void) {
  // A sheet closed in the same handler releases its history entry from an
  // effect cleanup, so wait for pending effects before deciding.
  setTimeout(() => {
    if (!pendingPops && !suppressedPops) task()
    else afterSettled.push(task)
  })
}

let lastHash = typeof location === 'undefined' ? '' : location.hash

if (typeof window !== 'undefined') {
  window.addEventListener('popstate', () => {
    // Route changes (the router setting the hash, or back across screens) keep
    // their own popstate; only same-URL entries belong to sheets.
    if (location.hash !== lastHash) {
      lastHash = location.hash
      return
    }
    if (suppressedPops > 0) {
      suppressedPops -= 1
      settle()
      return
    }
    sheets.pop()?.onBack()
  })
  window.addEventListener('hashchange', () => (lastHash = location.hash))
}

/**
 * Adds a history entry for an open sheet; back calls `onBack`.
 * Call the returned release function when the sheet closes through the UI.
 */
export function registerBack(onBack: () => void): () => void {
  if (typeof window === 'undefined') return () => {}
  const entry: SheetEntry = { onBack }
  sheets.push(entry)
  history.pushState({ ...history.state, sheet: true }, '')
  return () => {
    const index = sheets.indexOf(entry)
    if (index === -1) return
    sheets.splice(index, 1)
    pendingPops += 1
    queueMicrotask(flushPendingPops)
  }
}

// ---------------------------------------------------------------- screens

export function navigate(path: string) {
  whenSettled(() => void push(path))
}

export function replaceRoute(path: string) {
  whenSettled(() => void replace(path))
}

/** Back from a pushed screen; opens `fallback` when there is nothing in-app to go back to. */
export function goBack(fallback: string) {
  whenSettled(() => void (history.length > 1 ? pop() : replace(fallback)))
}
