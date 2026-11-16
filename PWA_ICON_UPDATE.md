# Campus Loop icon update (v3)

Origin remains `https://campusloop-workflow-test.sedateartichoke32.chatgpt.site`. Manifest URL remains `/manifest.webmanifest`; `id`, `start_url` and `scope` remain `/`. Name, short name and display mode are unchanged. Existing installations are not deliberately given a new app identity.

Current install assets use the existing `public/brand/loop.svg` symbol:

- `/icons/loop-v3-192.png` and `/icons/loop-v3-512.png`: ordinary icon purposes.
- `/icons/loop-v3-maskable-512.png`: separate full-bleed Android maskable icon; the symbol fits within the central 80% safe circle.
- `/icons/loop-v3-apple-180.png`, `/icons/loop-v3-favicon-32.png` and `/icons/loop-v3.svg`: versioned Apple/browser artwork.

The SVGs and PNGs are checked in. PNGs were rendered from these SVGs using CairoSVG. No new artwork was generated. Older files remain available for existing clients, but are not referenced by the current manifest or service-worker precache.

Manifest and service worker responses require revalidation. The service worker fetches the manifest network-first with `cache: no-cache`, updates its offline copy, and falls back only when the network fails. Versioned icons are immutable. Existing service-worker activation keeps the app's established update controls; it does not interrupt active bookings or force an application reset. Private APIs and admin navigation are not cached.

## Verification performed

Build and automated tests check manifest identity, PNG dimensions, hosted byte equality, cache headers, stale manifest replacement, offline fallback, and exclusion of private routes. The maskable PNG's opacity and safe-zone pixels were checked. Express and hosted admin tests open `/admin`, `/admin/` and `/admin/advertisements` twice to represent direct requests and refreshes: anonymous and regular accounts redirect to admin sign-in; an authorised admin session receives the app shell; private admin APIs reject regular sessions.

## Android Chrome tests still required

No Android device, emulator, ADB or browser-control capability was available in this workspace. Neither an existing-install update nor a fresh install was observed. Desktop HTTP checks or Android user-agent emulation cannot establish a home-screen result.

On a device, record Android/Chrome versions, launcher, origin, manifest identity, baseline icon and time:

1. Install the old C-icon release on the same test origin before deploying this release. Keep that installation in place, deploy v3 without changing the origin or manifest identity, reopen Chrome/app online and allow Chrome's update checks. Inspect the actual home screen and app information over time. Record whether the artwork changes without reinstalling; do not assume a timing guarantee.
2. Separately remove the test installation and perform a fresh Chrome installation of v3. Inspect the launcher icon, app drawer and Android Settings → Apps.
3. Distinguish a Chrome-installed WebAPK (normally listed in Android app settings) from a basic launcher URL shortcut. A standalone display mode by itself is not proof of WebAPK installation. A basic shortcut may retain a launcher-cached bitmap and does not establish whether a WebAPK updated successfully.

Do not claim that reinstalling is required, or that updates are automatic on a particular schedule, without device observations. Avoid downgrading a live production origin solely to simulate a test when no Android device is available.

Admin bookmark: `https://campusloop-workflow-test.sedateartichoke32.chatgpt.site/admin`. Admin accounts and sessions remain separate from Customer/Provider accounts. No credentials or account data were changed by this icon update.
