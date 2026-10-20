# Students Attendance Register

> **This web app is being replaced by the [Android app](https://github.com/itexpert120/attendance-android).**
> Back up your data (Settings → Back up data), [download the APK](https://github.com/itexpert120/attendance-android/releases/latest/download/attendance.apk),
> then on the Android app's first screen tap **Import from the web app** and pick the backup file.

A mobile-first, installable attendance and fee register built with Svelte 5 runes, Tailwind CSS, Dexie/IndexedDB, Phosphor icons, and Vite PWA.

All school data stays inside the browser profile on the device. There is no backend, account system, analytics, or cloud synchronization.

## Development

```bash
bun install
bun run dev
```

Quality checks:

```bash
bun run lint
bun run check
bun run test
bun run build
```

## Publishing and installation

Upload the contents of `dist/` to any static HTTPS host. HTTPS is required for normal PWA installation and service-worker caching. After the first successful load and installation, the app shell and all register features work offline.

IndexedDB is specific to a device and browser profile. Use the built-in JSON backup regularly because clearing browser or site data removes the local register.
