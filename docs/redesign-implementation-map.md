# Campus Loop redesign implementation map

This inventory is grounded in the React imports and page conditions in src/main.jsx on the redesign branch. It is not a claim that every route or interaction has been tested.

## Shared shell
- App header: Logo, account avatar, notification bell, menu
- Mobile bottom navigation and desktop sidebar
- Authentication and session routing
- Floating Lumi assistant, dialogs and alerts
- Standard page width, typography, buttons, cards, forms, focus states and spacing

## Page families and existing components
| Family | Existing pages or components | Preserve and verify |
| --- | --- | --- |
| Public/auth | Welcome, AccountForm, GoogleSignIn, AccountRoleSetup | login, signup, Google OAuth, session |
| Marketplace | ExploreRedesign, CompactCategories, MarketplaceHero, ListingDetails, ListingReviews, Gallery, Roommates | search, categories, photos, review API, saved listings, housing |
| Business | AccountDashboard, BusinessForm, BusinessPage, LinkListingForm, EditForm | owner authorization, listing CRUD, provider setup |
| Requests | RequestList, RequestDetail, OfferForm, OfferTerms, BookingSummary | requests, offers, payment state and history |
| Appointments | Appointments, AppointmentPicker, ServiceLocation | dates, availability, service address |
| Communication | MessageThread, Notifications, PhoneAlerts, Lumi | chat, unread alerts, delivery |
| Service-specific | CookingRequest, FoodOrderForm, DeliveryRequest, TransportRequest, RideDetails | conditional flows, prices, confirmation |
| Support | HelpCenter, CampusGuide, GuideMenu, ReportButton | feedback, help, reporting |
| Administration | AdminApp | authorization and admin controls |

## Reusable implementation primitives
1. AppShell: common header, side menu, bottom navigation, page container
2. PageHeader: title, supporting text, optional action
3. ServiceCard: compact and featured variants with identical media aspect ratios
4. StatusBadge: semantic status, no fabricated values
5. EmptyState: message, recovery action
6. Field and FormActions: consistent labels, errors, tap targets
7. ReviewSummary: verified API ratings only
8. Modal and drawer: accessible dismissal and focus handling

## Release gate for each family
- Compile and entry render tests pass
- Smoke tests for each relevant route and authenticated role
- Mobile screenshot comparison at 360px and 390px plus desktop at 1280px
- All buttons navigate to their intended route; no dead links
- No horizontal overflow, clipped labels or overlapping floating controls
- Data flows use existing APIs; no fake ratings, users or listings
- Stable staging alias confirmed to target the exact tested commit
- No production release without explicit user approval

## Immediate implementation order
1. Establish tokens and shared UI components
2. Refactor app shell, Explore, and business cards to use them
3. Audit and smoke-test existing routes
4. Migrate related page families in batches
5. End-to-end testing and explicit approval
