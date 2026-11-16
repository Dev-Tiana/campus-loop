# Customer and Provider accounts

Each new account must select one role. Customer accounts create service/ride requests and confirm customer bookings. Provider accounts create businesses and service/ride listings and send offers. API checks apply to creation, edits, availability changes, request dismissal and confirmation. Changing a payload or opening a form directly cannot bypass them. Housing listings, housing requests/offers/viewings and Roommates retain their previous account/ownership/campus permissions. Uploaded photos remain available for these features under either role.

## Existing accounts: no bulk migration

Deploying this version does not rewrite account records. The API computes a role from existing non-Housing service activity for old accounts without an accountRole:

- Business, service listing or provider offer activity alone: Provider.
- Customer service request activity alone: Customer.
- Neither: choose a role at the next service action/account setup.
- Both: account setup is required before new service actions. Existing conversations and history remain accessible.

Paused listings and historic requests count as activity. Housing and Roommates do not determine a service role. A stored role is immutable; an existing account cannot simply toggle its role. Google signup also requires a role, while existing Google sign-in uses that account's role.

## Explicit mixed-account setup

The authenticated owner reviews the explanation, chooses which role remains on the original account, supplies a different available email and password for the second role, and explicitly submits the split. The operation runs atomically with the same optimistic revision check as other writes. No split runs in a background migration or at login.

Provider business/listing ownership and provider offer references move to the Provider account. Customer request ownership moves to the Customer account. Message sender IDs move only within the corresponding side's service conversations. Confirmed transport driver references and provider dismissals follow the Provider account; route estimate ownership follows the Customer. IDs of listings, requests, offers and messages, saved quote terms, revisions and booking statuses are preserved. Housing and Roommates remain on the original account, including their conversations. When the Provider account moves, photo metadata grants both separated accounts access to the original uploads so retained Housing photos continue working. The photo bytes are unchanged.

The original account stays active after a legacy split; the verified new account is now linked and available through Switch account. It can also be reached with its new email/password. Other sessions of the formerly mixed account are revoked. Existing Google identity remains attached to the original account; the second account can connect a different Google identity later. Both accounts must use different emails. Test both keep-Customer and keep-Provider paths before changing this policy.

## Sign out and reopening

Sign out deletes the active server session and clears its cookie, private client state, modals and draft, then returns to `/`. Private APIs always revalidate the session; they and POSTs never enter the service worker cache. The root route verifies the session on website and installed-app launch: Welcome without a session, the role dashboard with an active session. Marketplace browsing requires authentication. The client revalidates state on focus, pageshow and popstate, discards stale concurrent state responses, and hides the private tree before a pagehide snapshot and rechecks the session before restoring it. The app does not persist a protected route to browser storage.

## Logo icons

The manifest retains id/scope/start_url `/` to update the same installed app. Versioned `/icons/loop-v2-*` assets contain the selected linked-loops logo: 192px standard icon, 512px any/maskable icon, 180px Apple touch icon, SVG favicon and 32px PNG favicon. These are included in the new public service worker version. Old icon paths are retained for compatibility.

Icon files and manifest delivery are testable automatically. Android and iOS control the visible home-screen icon. Existing Android installations may refresh after the browser processes a manifest update; this cannot be guaranteed immediately. iOS home-screen icons often need removing the old shortcut and adding the app again. Check a real fresh install and existing install before claiming the visible home-screen icon has refreshed. Reinstalling a shortcut does not delete server accounts or history, though the device may ask for sign-in again.
