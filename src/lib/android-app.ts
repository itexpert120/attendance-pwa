import type { AttendanceState } from './app-state.svelte'

// This web app is being replaced by the native Android app. The link always serves the newest release's APK.
export const ANDROID_APK_URL = 'https://github.com/itexpert120/attendance-android/releases/latest/download/attendance.apk'
export const ANDROID_RELEASES_URL = 'https://github.com/itexpert120/attendance-android/releases/latest'

const PROMPT_KEY = 'android-move-prompt-dismissed-on'

/** Saves a full JSON backup; the Android app's "Import from web app" reads this file. */
export async function downloadBackup(appState: AttendanceState) {
  const blob = await appState.backup()
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `attendance-backup-${new Date().toISOString().slice(0, 10)}.json`
  anchor.click()
  URL.revokeObjectURL(url)
}

/** The move prompt opens at most once a day until the teacher has moved. */
export function shouldPromptMove(): boolean {
  try {
    return localStorage.getItem(PROMPT_KEY) !== new Date().toDateString()
  } catch {
    return true
  }
}

export function snoozeMovePrompt() {
  try {
    localStorage.setItem(PROMPT_KEY, new Date().toDateString())
  } catch {
    // Private mode: the prompt simply shows again next time.
  }
}
