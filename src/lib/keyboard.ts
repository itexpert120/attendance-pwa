/**
 * Software keyboard awareness.
 *
 * - `html[data-keyboard]` is set while a text field has focus, so the phone
 *   navigation bar and FAB get out of the way (`.kb-hide`).
 * - `--kb` is how much of the layout viewport the keyboard covers. iOS overlays
 *   the keyboard; Android with `interactive-widget=resizes-content` shrinks the
 *   layout instead, so it stays near 0 there. Sheets lift by this amount.
 * - Once the keyboard settles, the focused field is scrolled into the visible
 *   band of its own scroller (the page, or the sheet body).
 */

const NON_TEXT = new Set(['button', 'checkbox', 'radio', 'range', 'color', 'file', 'submit', 'reset', 'image', 'hidden'])

function isTextField(target: EventTarget | null): target is HTMLElement {
  if (target instanceof HTMLTextAreaElement) return !target.readOnly
  if (target instanceof HTMLInputElement) return !target.readOnly && !NON_TEXT.has(target.type)
  return target instanceof HTMLElement && target.isContentEditable
}

function scrollParent(element: HTMLElement): HTMLElement | null {
  for (let parent = element.parentElement; parent; parent = parent.parentElement) {
    const { overflowY } = getComputedStyle(parent)
    if ((overflowY === 'auto' || overflowY === 'scroll') && parent.scrollHeight > parent.clientHeight) return parent
  }
  return null
}

export function initKeyboard() {
  const viewport = window.visualViewport
  const root = document.documentElement
  let field: HTMLElement | null = null
  let timer = 0

  const updateInset = () => {
    const covered = viewport ? Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop) : 0
    root.style.setProperty('--kb', `${Math.round(covered)}px`)
  }

  const reveal = () => {
    if (!field || !viewport) return
    const rect = field.getBoundingClientRect()
    const sheetBody = field.closest('[data-sheet]') ? scrollParent(field) : null
    const bandTop = sheetBody ? sheetBody.getBoundingClientRect().top + 8 : viewport.offsetTop + 80
    const bandBottom = viewport.offsetTop + viewport.height - 16
    // A field taller than the visible band (a long textarea) can't fit; let the caret lead.
    if (rect.height > bandBottom - bandTop) return
    const delta = rect.bottom > bandBottom ? rect.bottom - bandBottom : rect.top < bandTop ? rect.top - bandTop : 0
    if (Math.abs(delta) < 1) return
    if (sheetBody) sheetBody.scrollBy({ top: delta, behavior: 'smooth' })
    else window.scrollBy({ top: delta, behavior: 'smooth' })
  }

  const settle = () => {
    updateInset()
    clearTimeout(timer)
    // The keyboard animates in for ~250ms; check again once it has landed.
    timer = window.setTimeout(reveal, 300)
  }

  document.addEventListener('focusin', (event) => {
    if (!isTextField(event.target)) return
    field = event.target
    root.dataset.keyboard = ''
    settle()
  })
  document.addEventListener('focusout', () => {
    field = null
    // Focus may be hopping to the next field; only drop the flag if nothing took it.
    requestAnimationFrame(() => {
      if (!isTextField(document.activeElement)) delete root.dataset.keyboard
    })
  })
  viewport?.addEventListener('resize', settle)
  viewport?.addEventListener('scroll', updateInset)
  updateInset()
}
