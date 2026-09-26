/**
 * Material ripple: any `.state-layer` element grows a wave from the touch
 * point on press, and it fades out on release.
 */
export function initRipple() {
  document.addEventListener(
    'pointerdown',
    (event) => {
      if (event.button !== 0) return
      const host = (event.target as Element | null)?.closest<HTMLElement>('.state-layer')
      if (!host || host.matches(':disabled') || host.getAttribute('aria-disabled') === 'true') return
      const rect = host.getBoundingClientRect()
      const x = event.clientX - rect.left
      const y = event.clientY - rect.top
      const radius = Math.hypot(Math.max(x, rect.width - x), Math.max(y, rect.height - y))
      const wave = document.createElement('span')
      wave.className = 'ripple-wave'
      wave.style.width = wave.style.height = `${radius * 2}px`
      wave.style.left = `${x - radius}px`
      wave.style.top = `${y - radius}px`
      host.appendChild(wave)
      const release = () => {
        wave.dataset.release = ''
        window.setTimeout(() => wave.remove(), 500)
        window.removeEventListener('pointerup', release)
        window.removeEventListener('pointercancel', release)
      }
      window.addEventListener('pointerup', release)
      window.addEventListener('pointercancel', release)
    },
    { passive: true },
  )
}
