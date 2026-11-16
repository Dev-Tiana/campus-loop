# Campus Guide management

Use the private dashboard at `/admin` to manage approved guide entries and menu sections without editing code. See [ADMIN_GUIDE.md](ADMIN_GUIDE.md) for owner setup and publishing. Once dashboard records exist, they take precedence over the configuration defaults below.

# Editing the Campus Guide before the admin dashboard

The guide is curated by the Campus Loop owner. Providers cannot approve or submit guide placements through the app. Business listings and guide placements are independent: publishing a restaurant's menu does not add it to Locate a restaurant.

## Files to edit

- `data/campus-guide.json`: `menuItems`, `entries`, and optional `ownerContactUrl`.
- `data/marketplace-categories.json`: marketplace category records.

Edit these files in the current project, run `npm run validate:guide`, then build and publish through the existing project workflow. On a local Express installation, restart the API after changing the JSON. On the hosted app, publish a new version. Entries are read from this configuration without resetting accounts or the existing database. Do not edit the compiled `worker/api.js` or `dist` files.

Every guide entry needs a stable unique `id`, the target `menuId`, `campus: "delsu-abraka"`, a `name`, and `approved: true` before it can appear. Set `visible: false` to hide a record without deleting it. Leave drafts with `approved: false`. The production entries array starts empty because no actual events, businesses or groups have been approved in this conversation.

Owners, organisers and group administrators should contact you directly. Add your real HTTPS contact URL as `ownerContactUrl` if you want a Contact Campus Loop button; the default is null. No contact information has been invented.

## Add an event

Add a record to `entries`, replacing the sample details with the event you approved:

```json
{
  "id": "your-event-stable-id",
  "menuId": "events",
  "campus": "delsu-abraka",
  "approved": false,
  "visible": true,
  "name": "Your approved event name",
  "venue": "Exact approved venue",
  "startsAt": "2027-01-20T14:00:00+01:00",
  "endsAt": "2027-01-20T17:00:00+01:00",
  "organiser": "Approved organiser name",
  "registrationUrl": "https://example.com/replace-with-real-registration"
}
```

After verifying the details, change approved to true. Use ISO dates with a timezone; `+01:00` is Nigeria time. Registration is optional. Events sort by start time and disappear from Upcoming events at their end time. An event currently in progress stays visible until it ends. This is evaluated on the server whenever the app refreshes, so no manual cleanup or scheduled job is required. Keep expired records for history if useful; do not change their ID for reuse as a different event.

## Add a hotel or restaurant

```json
{
  "id": "your-place-stable-id",
  "menuId": "hotels",
  "campus": "delsu-abraka",
  "approved": false,
  "visible": true,
  "name": "Approved hotel or guesthouse name",
  "area": "Abraka town",
  "description": "Short factual description",
  "directionsUrl": "https://www.google.com/maps/search/?api=1&query=REPLACE_WITH_APPROVED_LOCATION"
}
```

Copy the exact Google Maps share link for the approved place, ideally its pinned location/place ID. Do not use a guessed address or a generic search when a precise place link is available. `maps.app.goo.gl`, `maps.google.com` and Google Maps URLs on `www.google.com/maps` are supported. Get directions opens that link directly.

For a restaurant use `menuId: "restaurants"` and add `foodType` (for example rice and grills). Optional `foodListingId` should be the exact ID of its Campus Loop food menu listing, obtained from the existing listing record or authenticated `/api/state`. The View food listing link appears only when that current campus listing exists, is a food menu item and is available. The guide approval remains separate from ownership of that listing.

## Add a WhatsApp group

```json
{
  "id": "your-group-stable-id",
  "menuId": "groups",
  "campus": "delsu-abraka",
  "approved": false,
  "visible": true,
  "name": "Approved group name",
  "description": "What the group is for",
  "whoCanJoin": "Who the admin permits to join",
  "inviteUrl": "https://chat.whatsapp.com/ReplaceWithPublishedInvite"
}
```

Replace the invite URL with the group's published link supplied by its administrator. Join on WhatsApp opens it directly. Update it here if the group administrator resets the invite. Only HTTPS `chat.whatsapp.com` invite links are rendered. No placeholder group is approved automatically.

## Menu and category records

Menu items have `id`, `label`, `type`, `displayOrder` and `visible`. Entries point to the menu item's stable ID through `menuId`. The four initial types are events, hotels, groups and restaurants. A new general guide item can be added without frontend code; the generic entry fields still render. New specialised behavior can be added later if needed. Hide an item with visible false; its entries stop being returned as well.

Categories have stable `id`, `name`, `displayOrder` and `visible`. Existing categories also have `presetKey`, which anchors their specialised forms and presets even if the visible name is changed. **Never change an existing ID or presetKey.** Hide rather than delete. New general categories can omit presetKey; providers can use Add your own for the service and inclusions. Listings and requests save categoryId, so display changes do not break matching or booking history. `legacyNames` can preserve older labels when importing older records that lack a category ID.

Hidden categories are removed from discovery and new-listing/request choices. Existing listings and bookings remain in their owners' records, and already-started requests can still be fulfilled. The owner can edit an existing hidden-category listing without recreating it.

## Future dashboard storage

The current JSON files supply defaults when the existing marketplace state document has no overrides. A future authenticated owner dashboard can write `categoryRecords`, `guideMenu`, `guideEntries` and `guideOwnerContactUrl` as editable records in that same state document. These overrides take precedence over the project files. Do not set an empty override array unless you intend to hide/replace that entire configured collection. This update intentionally does not add provider approval endpoints, advertising controls or an admin dashboard.

## What was tested

Approved-only and campus-scoped visibility, all four rendered screens, event expiry at the exact end timestamp, correct Maps/WhatsApp href values, dynamic/hidden categories, cooking ingredients and portions, fixed food quantity/fee snapshots, acceptance/decline, chat, matching couriers and separate delivery confirmation. Tests use isolated fixtures and do not approve any live guide entries. Actual mobile screen layout and launching Google Maps or WhatsApp on a phone still need device verification.
