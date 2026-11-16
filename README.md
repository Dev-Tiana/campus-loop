# Campusloop

Campus service and housing marketplace for Delta State University, Abraka. Campusloop is a working project name. The frontend uses React and Vite. The API uses Express and supports MongoDB.

## Run on your computer

Install Node.js 22 or newer. Extract the ZIP, open the campusloop folder in Codex, and run:

```sh
npm ci
npm run build
npm start
```

Open http://127.0.0.1:3001. The default local mode stores data in an ignored JSON file and shows clearly labeled sample listings. Create two accounts in separate browser profiles to try a real request: publish a listing from one account, send a matching request from the other, then quote, chat and confirm. Sample listings cannot receive requests.

For frontend development, run `npm run api` and `npm run dev` in separate terminals, then open the Vite URL.

## Private admin dashboard

Open `/admin` for the separate owner login. See [ADMIN_GUIDE.md](ADMIN_GUIDE.md) for one-time setup, all management screens, moderation, content publishing and verification limits. Existing Customer and Provider accounts do not grant admin access.

## Configuration

Copy .env.example to .env. Set MONGODB_URI to use MongoDB. DEMO=0 starts a fresh database without sample listings. ALLOW_AGENTS=0 pauses new agent listings and matching requests to agents. Campus IDs scope accounts, requests and listings, with DELSU Abraka seeded by default. Additional campuses currently require a database update.

NODE_ENV=production requires MongoDB and uses secure cookies, so use HTTPS in front of the server. The first build is designed for a campus pilot. The MongoDB adapter stores the pilot state in one versioned document to enforce atomic confirmations. Move records and images into dedicated collections and object storage before nationwide rollout. In-app notifications and messages refresh every three seconds while the app is open. This version has one photo and one priced package per listing. Providers can create additional listings for other packages. Payments are arranged directly outside Campusloop.

Run `npm test` for the local API integration test. It covers campus matching, competing offers, conversation privacy, quote updates, single booking confirmation, and housing viewing and availability.

## Listing options

Create and edit listings using category-specific service types and inclusions, or housing property types and grouped amenities. Custom inclusions/features can be combined with presets. Descriptions and photos are optional. Review the assembled listing before publishing. Changing category or service type resets selections from the previous choice. Older listing descriptions remain editable.

The API stores serviceType, customServiceType, inclusions, customInclusions, propertyType, amenities and customAmenities separately. For compatibility, package contains the service name; stored fees remains the combined fees total, with agentFee separately recorded. Listing writes accept fees as other fees and agentFee separately.

## Google sign-in

The app supports Google Identity Services alongside email/password accounts. Configure the hosted runtime variable GOOGLE_CLIENT_ID with a Google OAuth Web application client ID. In Google Auth Platform, add this authorized JavaScript origin:

https://campusloop-workflow-test.sedateartichoke32.chatgpt.site

The GIS popup returns an ID token, so this integration needs no client secret or redirect URI. Configure consent-screen branding, audience, and any test users in Google Auth Platform. While the Google app is in Testing, use an allowed test account. The Google button appears only when the runtime client ID is configured.

The server verifies the RS256 signature using Google's public keys, issuer, audience, expiry, verified email, and a browser nonce. Existing password accounts must sign in first and connect their matching Google account from My listings. This prevents silently linking an unrelated account by email. The private Site's ChatGPT access gate remains in place.

## Offers, Roommates and matching

Offers store their own service type, selected inclusions, custom inclusions and optional note. Editing increments the quote revision; students must confirm the current revision. Listing edits do not change quoted inclusions. Legacy typed offer details remain visible. Both service and roommate chat screens use the same message thread component.

Housing includes separate roommate spots and roommate requests, with area choices, annual costs/budgets, move-in dates and optional preferences/photos. Public post fields exclude exact addresses and contacts. Each responder gets a separate private conversation with the author. Only the author can close a post; closure stops new responses while retaining existing conversations. Roommate posts never enter service Incoming or notification counts.

The server matches available, non-demo listings by campus, category, optional service type, optional appointment mode and optional direct listing. The same predicate controls visible incoming requests and quote creation; notification counts are computed from that filtered result. Students retain their own requests. Run npm test and npm run test:hosted for integration coverage, including matching exclusions, immutable offers, private conversations and closed roommate posts.

## Installable app and updates

Campusloop has a root-scoped manifest, 192/512 px maskable icons and a versioned service worker. Serve over HTTPS (localhost is allowed for development). On supporting browsers, the install button appears after the browser's install prompt event. On iPhone use Safari → Share → Add to Home Screen. The standalone copy uses the same server accounts and listings; some iOS browser/home-screen contexts may ask for sign-in again.

The worker caches an explicit list of public app shell files and sample images only. It never handles POSTs, cross-origin traffic, query requests or /api/* responses (including chats, offers, account state and uploaded photos). Private account data is not written to browser storage. Offline changes are not queued: sign-in, live data, photos, chat and booking actions require internet. Reopening checks for updates; an Update now button activates the waiting worker, reloads, and removes the older public cache. No reinstall is required. Build-generated sw.js and app-version.json change whenever public files change.

## Transport and Google Maps setup

Set GOOGLE_MAPS_BROWSER_KEY in the runtime environment for the Google Maps JavaScript API and Places API (New). Restrict that public browser key by HTTP referrer to https://campusloop-workflow-test.sedateartichoke32.chatgpt.site/* and any explicitly approved local development origins (for example http://localhost:3010/* and http://127.0.0.1:3010/*). Restrict its APIs to Maps JavaScript API and Places API (New), and configure billing/quotas in the Google Cloud project. Browser keys are intentionally visible in /api/config; they must be origin-restricted.

Set GOOGLE_MAPS_SERVER_KEY as a hosted secret for Routes API. Restrict it to Routes API and supported server egress restrictions where available; never apply browser referrer restrictions to this server key. It is used only on the server for POST https://routes.googleapis.com/directions/v2:computeRoutes and never sent to the browser. Enable billing for Routes API. Do not reuse a Google OAuth client ID as a Maps API key.

Manual pickup and destination entry is always available. Location permission is requested only by Use my location. A missing key, denied location permission, missing landmark, failed map script or unavailable route does not block manual requests. Optional known distances are marked Student entered. Only a successful server Routes API result, scoped to the student and exact coordinate pair for 30 minutes, is labelled Google Maps road route. Changing a pin or location invalidates that estimate. Route tests use fixtures unless real Google credentials are configured; they do not establish live route accuracy.

Drivers list Bike (Okada), Keke or Car ride; coverage (Around campus, Around Abraka, Out of town); availability; starting fare and optional rate per km. Campus, vehicle, coverage, availability and direct-listing matching are enforced by the server. The starting fare plus distance rate is labelled Estimated fare; the driver sends a final naira quote. Revisions require confirmation of the current quote. Confirmation saves agreed fare, driver, locations, pickup note, time and revision. Only the student and confirmed driver receive exact pickup coordinates/details; other eligible providers receive general areas. Payment remains direct.

## Provider photo storage

New gallery image bytes are stored outside listing records. Locally, the LOCAL_DATA_FILE path plus .photos is the private upload directory. Hosted versions use the BUCKET R2 binding declared in .openai/hosting.json. Do not commit that local photo directory or runtime data. Listing records store ordered photo IDs and a cover ID; metadata is held separately in photoAssets. Legacy single images remain the original cover until changed. Photos are compressed before sequential upload, with an 800 KB per-file API size limit and no small fixed gallery count limit. Customers fetch six metadata entries at a time and load additional photos while browsing/swiping. Gallery deletion removes the reference from the listing; orphan upload cleanup and storage quotas are operational follow-up work for a larger rollout.

## Business pages and compact Campus Loop identity

The root website and installed-app launch route (`start_url: /`) verifies the server session: anonymous visitors see Welcome, and active accounts open their role dashboard. The linked-loops logo chosen by the owner is used in the header, account screens, favicon and maskable icons. The mobile hero has two explicit heading lines and a single row of 44 px action buttons. The signed-in category grid uses icons. Licensed image credits are retained in PHOTO_CREDITS.md and /photo-credits.html. Provider galleries should show their own work.

An account can create multiple business pages, each with description, service areas, cover, gallery and optional flyer. Individual service listings link by businessId and retain their existing IDs, photos, requests and history. Each has fixed or quote pricing, availability, structured inclusions and optional priced extras. House cleaning, Shop cleaning and Office cleaning are distinct Cleaning presets. Search includes service and business names. Direct requests still reach only the selected listing's provider. Offer extras and inclusions are immutable snapshots until explicitly edited as a new offer revision; the quoted price is the total including selected extras.

Business/gallery/flyer uploads require authentication and ownership. Flyers accept up to 2.5 MB API image data after client compression (2600 px longest edge). Galleries show full image proportions; flyers support fit and zoom controls. Uploaded assets remain outside listing/business records in local photo storage or hosted R2.

Marketplace browsing now requires an active session. Welcome leads directly to Customer signup, Provider signup or sign-in. Authenticated actions retain role checks and can resume a selected action after account switching. Sign-out or expiry clears the private screen and returns to Welcome. Password and Google sign-in use the same route resumption rules.

Validation: npm test covers business ownership, multiple services, legacy linking, authenticated media access, direct service booking, snapshot extras, matching, private chat, roommates and housing. npm run test:hosted checks the generated Worker/D1 path as well. The latest welcome/app split is covered by automated route, API and React rendering checks. Actual phone layout at 320/360/390/430 px and Android/iOS installation/restoration still need browser/device verification.

## Customer and Provider roles

See ACCOUNT_ROLES.md for permissions, the no-bulk-migration policy, explicit legacy account splitting, sign-out behavior and versioned linked-loops app icons. Each new account has one role and a separate dashboard. The hero leads to Customer requests or Provider setup, including account switching with the original action retained. Categories use simple icons again; work galleries, flyers and the two-student hero remain.

Run npm test and npm run test:hosted. Role coverage includes wrong-role API rejections, quote/chat/confirmation, Housing and Roommates exceptions, revoked sessions, read-only legacy inference and both directions of the explicit mixed-account split. Browser/OS installation checks must be reported separately from these API tests.

## Request tracking and in-app notifications

My Requests shows the selected service, preferred appointment, live status, latest personal activity and a link to details/offers/chat. Incoming Requests uses the existing campus/category/service/visit/availability/direct-listing predicate. New arrivals are highlighted until opened or quoted. Confirmations save a provider/price/appointment/quote snapshot for both participants; later listing changes do not alter the agreed details. Historic bookings continue using their confirmed offer when a new snapshot is absent.

Notifications are stored server-side with an owner, event key, request/offer target, creation time and read time. Customers get new/revised offers and provider messages. Matching providers get request arrivals, customer messages and confirmations. Requests notify each matching provider once even if several listings match. Pending request notifications are filtered again against current availability and matching rules; private offer/chat history remains available to its participants. Opening an alert marks it read and opens the referenced request, current offer or conversation. Read one, mark all and unread-only views share persistent server state. The desktop bell, mobile Alerts tab and account menu expose the inbox. Polling/focus refresh while the app is open keeps counts current; there are no external push, email or SMS notifications. Existing activity is not backfilled into a new unread notification stream.

The frontend sends a stable clientMutationId for an uncertain request/offer/message/confirmation retry. The API atomically stores its result with the event and notification, scopes it to the authenticated account/path/role, and rejects reuse with changed details. Replaying that identifier returns the original result. Event keys independently prevent duplicate notifications; unchanged quote edits do not create a new revision or alert. Private notifications, retry receipts, requests and chats are never service-worker cached. Signing out clears the notification view/count with other private client state.

Tests run the same Customer/two-Provider notification scenario against Express and the generated Worker with SQLite standing in for D1. They cover matching exclusions, direct targeting, availability changes, duplicate listings, concurrent retries, offer revision/no-change behavior, both message directions, own-account-only reads, read persistence, destination metadata, unread counts, frozen booking details and two-offer labels. Browser clicking, phone viewport layout and installed-app behavior require the shared browser or a physical device and must be reported separately from these integration checks.


## Dedicated welcome and protected app routes

The approved public copy lives verbatim in shared/welcome-copy.js and is rendered by Welcome.jsx. It has the logo, campus label, one licensed campus photograph, introduction, two account paths and sign-in link. Categories, listing cards, search, Housing/Roommates and marketplace navigation mount only in the authenticated app tree. The welcome page uses a single-column phone layout with stacked choices and 48px buttons; the signed-in marketplace retains its two-line Campus life / sorted hero and two adjacent service actions.

Routes: `/` is the session-aware entry; `/signup/customer` and `/signup/provider` open the matching fixed-role signup form; `/signin` opens sign-in without an extra role choice. `/app` opens the role dashboard, `/app/marketplace` opens the main marketplace, and `/app/housing`, `/app/requests`, `/app/notifications`, `/app/listings` and `/app/business/:id` are protected app areas. Request and conversation deep links under `/app/requests/:id` are scoped to the current account. Active sessions visiting a public entry/auth route resume a safe next path or open `/app`. Signed-out protected links redirect to Welcome with a validated internal next destination.

Both Express and the hosted Worker check the session before serving protected app routes. Anonymous `/api/state` returns public campus metadata and empty marketplace/account collections; `/api/session`, provider gallery metadata and photo bytes require authentication. Uploaded photo responses and protected HTML use no-store. The client verifies the session before mounting private UI, revalidates on restore/Back/visibility changes, and clears private state on sign-out or expiry. The service worker never caches APIs or responses from protected navigation: it only caches the generic HTML/JS/CSS/image shell. An offline reopen cannot verify a session, so it offers Welcome instead of private cached data. Installed app id/scope, root start URL and versioned linked-loops icons are unchanged.

Run `npm test`, `npm run test:hosted` and `npm run test:entry`. Integration checks cover role signup/login, session expiry/revocation, route redirects, private gallery guards and existing workflows; shared routing tests cover action resumption and unsafe redirects. React rendering tests verify every approved welcome sentence and both signup destinations, the role-specific forms and the separate marketplace hero/category components. Mobile widths 320/360/390/430, browser Back interaction and actual Android/iOS reopening still need browser/device verification when shared browser controls are unavailable.


## Linked account switching and welcome photograph

The welcome page uses an original generated illustration of a Nigerian university campus at `public/images/welcome-nigerian-campus.webp`. It is illustrative campus imagery. The responsive layout displays it above the copy on phones and alongside it on desktop.

Profile → Switch account shows the active account and its verified counterpart. Existing accounts can be linked after a password or signed Google-identity check. A new opposite-role account can be created from the switcher with a different email; the server chooses its role and campus. Linking never copies or merges business listings, requests, chats, bookings or notifications. Only one Customer/Provider pair can be linked, and accounts must share a campus. Legacy mixed-account setup remains explicit; after its existing history-preserving split, those two accounts are linked for switching.

The current server session stores the identities verified for that device and exactly one active account ID. Switching checks the persistent link plus device authorization, rotates the session token without extending its expiry, and opens the selected role dashboard (or resumes a pending role action). The client clears the previous account's private views before rendering the newly scoped state. Other tabs detect the new active identity on refresh. Notifications/read counts remain per account. Signing out revokes this device session and any tokens in its device chain; both accounts become inaccessible until sign-in. Pairing remains saved for future verified logins. Other devices keep their own sessions. Previously signed-in sessions on other devices may need fresh sign-in or counterpart verification before gaining switch access to a newly linked account.

The same tests run against Express and the generated Worker: password verification, rejected arbitrary target IDs and same-role links, creating the opposite role, switching both ways, separate histories/counts, current-role API enforcement, fresh-login pairing, last-used identity and device signout. Hosted Google tests cover signed identity verification for linking. Render tests check one photo and active/other account labels. Real mobile widths and installed-app reopening require separate browser/device checks when shared browser controls are unavailable.

## Campus Guide, Food & Cooking and Delivery

The signed-in hamburger menu opens Campus Guide for either role, alongside the existing bottom navigation. Owner-curated entries and menu records live in `data/campus-guide.json`; marketplace categories live in `data/marketplace-categories.json`. See GUIDE_EDITING.md for approvals, links, expiry, record fields, validation and the existing state-document override format. There are no approved production entries until the owner supplies them. Configuration validation runs during the hosted build. Guide drafts are server configuration and are not bundled into the public client.

Food & Cooking supports Cook a meal requests with dishes, portions, time/budget and explicit ingredient terms in the provider's quote. Menu listings have fixed per-item prices, availability, pickup/seller-delivery options, pickup location and a delivery fee. Orders are stored in the existing request history with an immutable quantity/unit-price/subtotal/fee/total snapshot. The seller accepts or declines; accepted orders expose the existing private chat. The student reviews the total before submitting, and the server rejects stale totals. Payments remain direct.

Delivery is its own category, with coverage, availability, starting price or quote pricing. Requests contain collection/drop off points, areas, time and optional budget; only available campus providers matching both coverage areas and the service type receive them. An accepted pickup food order can create one separate delivery request. Its food purchase snapshot remains unchanged while the courier's quote and confirmation record the separate fee. The detail screen shows both providers' charges and the combined cost; there is no combined platform payment.

Checks: npm test, npm run test:hosted, npm run test:entry and npm run validate:guide. End-to-end API scenarios run against Express and the generated Worker/D1 adapter. Actual phone layout, external Maps/WhatsApp launching and installed-app interactions need separate browser/device checks when those controls are unavailable.
