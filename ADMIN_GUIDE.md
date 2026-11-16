# Campus Loop private admin

Open `/admin`. Admin identities and their four-hour `campus_admin` sessions are separate from Customer and Provider identities and the account switcher. No regular signup can create an admin.

## First owner setup

The hosted deployment has a one-time owner setup link, provided privately in the delivery message. Open it and choose your own name, email and password (at least 12 characters). The secret is carried in the URL fragment and is never included in server URLs. Setup is permanently disabled once an admin exists. Keep the resulting admin credentials safe; use `/admin/login` afterwards.

For a new **local** installation, generate a random token and its SHA-256 hash securely. Set `ADMIN_BOOTSTRAP_HASH` in the local `.env` (or runtime secret store) and restart the API. Open `/admin/setup#setup=YOUR_TOKEN`. Never commit the raw token, hash configuration, credentials or live state to Git. Setup does not migrate, replace, or reset existing marketplace accounts.

## Daily use

- **Overview:** actual pending reports, guide events, ads and account counts; shortcuts to editors.
- **Welcome Page:** edit approved copy and campus photo, preview the actual Welcome component at 320/360/390/430/1024px, save a draft, then publish. Signup and sign-in destinations cannot be edited. Upload a licensed image and provide a credit. The existing default campus photo is not described as DELSU.
- **Campus Guide:** add/hide/reorder menu sections, enter approved placements, save drafts and publish. Directions require Google Maps links; WhatsApp groups require published `chat.whatsapp.com` invites. Events expire at their end time. Business listings never grant guide approval.
- **Categories:** stable IDs, names, order and visibility. Hidden categories disappear from browsing and new forms while existing posts, requests, offers and bookings remain intact.
- **Listings:** search/filter service, housing and roommate posts. Inspect details/gallery and hide/restore with a reason. Providers cannot undo moderation by editing their listing.
- **Reports:** users report individual posts, guide links and private conversations. Review the related item, record a decision, optionally hide the item or suspend its specific account, and resolve. Reported private conversations are available to admin for review; unrelated conversations are not exposed through the related-item endpoint.
- **Users:** search/filter by role/status. Check email, account ID, activity and linked account before suspending. Suspension revokes that specific account's sessions and stops its listings receiving new requests. Its linked partner and history are retained. Restore does not reactivate revoked sessions: the user signs in again.
- **Announcements:** preview, draft/publish, schedule and end notices inside the signed-in app.
- **Advertisements:** image, copy, advertiser, button, destination, placement and dates. Main marketplace and guide placements are labeled Sponsored. Scheduling and expiry are evaluated on the server; pause and end stop displaying them.
- **Ad Performance:** recorded card displays (at least half visible for a second) and clicks. Retried events for the same account/card view/type are deduplicated. Clicks also record a display. Admin previews and requests carrying an active admin session do not count. This is app telemetry, not audited unique-human advertising measurement.
- **Marketplace Activity:** actual requests and offers by date/category, plus median first recorded offer wait. Legacy offers without creation timestamps do not fabricate wait-time samples.
- **Activity Log:** actor, target, action, time and reason, with admin/action/date filters.

Drafts do not replace published content. Saved dashboard records override the initial `data/campus-guide.json` and category configuration; later file edits do not overwrite records edited in the dashboard. No private API responses or media are cached by the service worker. Admin HTML is network-only and guarded separately.

## Verification

`npm test`, `npm run test:hosted` and `npm run test:entry` cover moderation first, linked-account suspension, secure admin endpoints, draft/public boundaries, publishing and scheduling, ad deduplication, metrics, and existing marketplace/booking/chat flows. Tests use isolated temporary stores or in-memory D1/R2, never production accounts.

Browser/CUA tools were unavailable during this update. The responsive CSS and rendered controls were checked in code/SSR, but interactive drawer/focus, photo upload/cropping, narrow-screen overflow, external link opening and actual installed-app behavior still need browser/phone verification. No screenshots or browser click-throughs are claimed.

## Responsive forms and guide navigation

Admin fields use the same vertical label/control/help/error groups across setup, login and dashboard editors. Dates share a row on larger screens; forms stack on phones. Advertisement publishing validates fields inline, focuses the first invalid control, allows incomplete drafts after title/copy, and keeps preview separate from publishing controls. Long upload filenames wrap beneath the bounded file chooser.

The signed-in marketplace shows a persistent Campus Guide panel at 1024px and wider. Smaller layouts use the top-bar menu and the same ordered, visible links, including owner-created sections. Selection closes the drawer, the active guide section is highlighted, and crossing into desktop closes any open drawer. The public welcome page and mobile bottom navigation are unchanged.

Verification for this update: rendered setup/login/ad controls, inline validation, shared guide links and routing, plus isolated Express/Worker draft/publish regression tests. Browser tools remain unavailable; visual overlap/overflow and actual resizing/focus behavior at laptop and phone widths require browser verification.
