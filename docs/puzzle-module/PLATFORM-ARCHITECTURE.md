# The Love Digitally Platform — Architecture & Integration Plan

Status: **planning document only — no module implementation in this pass.** Written at the close of the Puzzle Module's v1.0.0 release to describe how it becomes the first module of a scalable, multi-module Love Digitally platform, and what a future Timeline/Story/Quiz/etc. module would build against. Nothing in this document has been built; every claim about "already works this way" refers to the Puzzle Module's actual shipped code (M0–M5, cited by file path), and every claim about the platform layer is a proposal.

## 0. Scope note — a naming collision worth flagging

This monorepo already contains an app called `apps/lovedigitally` (`CLAUDE.md`: "Digital relationship and social connection platform... user profiles, messaging, event coordination, connection matching," built on Supabase, "Phase 1 — Base Setup," no source code yet). That is a **different product** from what this document describes. Everything here — the module list the kickoff message named (Timeline, Story, Quiz, Memory Wall, Countdown, Gift, Letter, Gallery, Surprise, Event) and the shared systems it asked for (auth, dashboard, analytics, notifications, media storage, design system, navigation) — describes a **personalized digital-gifting and celebration platform**, matching the Puzzle Module's own domain exactly, not a dating/social app.

This document treats "the Love Digitally platform" as the gifting platform the Puzzle Module already belongs to, built on the same Firebase project (`lovedigitally-app`) and architectural patterns the Puzzle Module already proved out — **not** `apps/lovedigitally`'s Supabase-based scaffold. If `apps/lovedigitally` is meant to converge with this platform, or if the two are meant to stay genuinely separate products under a shared brand, that's a product decision for a human to make, not something to resolve by assumption here. Flagged, not silently ignored, and not blocking this document's own usefulness either way.

## 1. Platform architecture

### 1.1 What exists today (the pattern to generalize, not reinvent)

The Puzzle Module already demonstrates the platform pattern in miniature — it just doesn't call it that yet:

- **One shared Firebase project** (`lovedigitally-app`), not a project per app. The Puzzle Module and `lovedigitally-web` (the existing marketing/premium site at the repo root) already share it.
- **Isolation by namespace, not by infrastructure.** Firestore collections are prefixed (`puzzle_experiences`, `puzzle_experiences_private`, `puzzle_progress`, `puzzle_events`, `puzzle_creators`), Storage objects live under a prefixed path (`puzzle_storage/...`), and both are enforced by the one shared `firestore.rules`/`storage.rules` file — `apps/puzzle-module/firestore.rules` is a **symlink** into `lovedigitally-web/`, because the Firebase CLI can only deploy rules from within the deploying directory, and there is exactly one physical ruleset for the whole project (`apps/puzzle-module/CLAUDE.md`).
- **Isolation by deployment target, not by hosting infrastructure.** The Puzzle Module has its own Hosting site (`puzzle-module`) and its own Cloud Functions codebase (`puzzle-module`, deployed independently of `lovedigitally-web`'s functions) within that one project (`apps/puzzle-module/firebase.json`).
- **A real Creator identity** already exists (Firebase Auth, email + Google, `puzzle_creators` Firestore profile) and a real anonymous, scoped Recipient identity (a custom-claim-bound token minted by `resolveShareToken`, never a login screen).

This is precisely the multi-tenant-by-namespace pattern most platforms with "many small products, one identity, one data plane" converge on. **The platform layer this document proposes is not a rewrite — it's extracting what's implicit in one module into something explicit that a second, third, and tenth module can register into without re-deriving it.**

### 1.2 Proposed platform layers

```
┌─────────────────────────────────────────────────────────────────┐
│  Love Digitally Hub  (new — the platform's front door)          │
│  "My Creations" across every module, account settings,           │
│  module launcher. Thin: reads a cross-module summary index,      │
│  never a module's private schema.                                │
└─────────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
┌───────────────┐   ┌───────────────┐   ┌───────────────┐
│ Puzzle Module  │   │ Timeline Mod. │   │  ...N more     │   Each an independent
│ (Hosting site  │   │ (Hosting site │   │  modules       │   Angular/Ionic app,
│  + Functions   │   │  + Functions  │   │                │   own repo folder,
│  codebase)     │   │  codebase)    │   │                │   own release cadence.
└───────────────┘   └───────────────┘   └───────────────┘
        │                     │                     │
        └─────────────────────┼─────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│              Shared platform layer (packages/, this doc)         │
│  design system · auth ports · analytics ports · notification     │
│  dispatch · media storage conventions · the module registry      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│         One Firebase project: lovedigitally-app                  │
│  Firestore (namespaced collections) · Storage (namespaced paths) │
│  · one shared Rules file · per-module Hosting sites & Functions  │
│  codebases · Auth (one user pool, shared across modules)         │
└─────────────────────────────────────────────────────────────────┘
```

**Why not separate Firebase projects per module?** Cross-module identity (one Creator, many kinds of creations) and a shared Dashboard both need one Auth user pool and one place to query "everything this Creator made." Splitting projects would mean federated auth and cross-project queries for every shared feature this document asks for — solving a problem the current architecture doesn't have, in exchange for isolation this platform doesn't need (Firestore Rules + Storage Rules + separate Hosting/Functions targets already isolate modules from each other at the layer that matters: nobody can read/write another module's data, and a bad deploy of one module's Functions codebase can't touch another's).

**Why not a single monolithic app with lazy-loaded module routes, instead of separate deployables?** Two reasons the Puzzle Module's own build already surfaces. First, blast radius: `apps/puzzle-module/DEPLOYMENT.md`'s rollback plan depends on each piece (Hosting, Functions, Rules) being independently deployable — a bad Timeline Module release should never be able to take down the Puzzle Module's Hosting. Second, bundle budget: the Puzzle Module's own production bundle is already tracked against a 1.35 MB/1.6 MB budget (`apps/puzzle-module/angular.json`) for *one* module; a monolith serving ten modules' worth of Creator authoring UI to every visitor, even lazy-loaded, works against a Recipient-facing product that explicitly optimizes first paint for a link opened cold on a mobile connection. Independent deployables, sharing code via versioned packages rather than a shared runtime, is the more conservative choice given what's already been built and measured.

## 2. Module system

A **module** is: an independent Angular/Ionic application, its own Cloud Functions codebase, its own Firestore/Storage namespace prefix, deployed to its own Firebase Hosting site within the shared `lovedigitally-app` project — plus one new artifact this document proposes, a **Module Descriptor** (§8) that lets the Hub and other platform surfaces know it exists without hardcoding knowledge of it.

Every module owns, independently:
- Its Firestore collections, all prefixed with its namespace (`puzzle_*`, proposed `timeline_*`, `story_*`, …).
- Its Storage path prefix (`puzzle_storage/`, proposed `timeline_storage/`, …).
- Its own Cloud Functions codebase (deployed independently — `firebase deploy --only functions:timeline-module` never touches `functions:puzzle-module`).
- Its own Hosting site and therefore its own domain path (or subdomain — a platform-level choice, §1 doesn't require one over the other).
- Its own Clean Architecture layering internally (`domain/` → `application/` → `infrastructure/` → `features/`, per module, matching the Puzzle Module's own structure — see that app's README for the rationale; nothing here changes it).

Every module **consumes**, from the shared platform layer:
- The shared design system (§6).
- Shared auth ports (§3) — never re-implements sign-up/login.
- Shared analytics conventions (§5) — writes to its own `{module}_events` collection, but in the same envelope shape.
- Shared notification dispatch (§7), where a module wants to *notify* someone rather than roll its own.
- The shared Storage/signing conventions (§6b).
- Registers itself in the module registry (§8) so the Hub can list it.

**What a module never shares:** its own private data schema, its own business rules, its own Firestore documents. The isolation boundary between modules is exactly as strict as the isolation already proven between the Puzzle Module and `lovedigitally-web` — Firestore/Storage Rules are the enforcement mechanism, not convention.

## 3. Shared authentication

**Already built, reusable as-is for the Creator side.** The Puzzle Module's `AuthPort`/`CreatorRepositoryPort` split (`apps/puzzle-module/src/app/domain/ports/`, described in that app's README §"Creator Authentication") — Firebase Auth owns the session, a Firestore profile doc owns app-specific fields — is exactly the shape a platform-wide Creator identity needs. The only change for a multi-module world: rename `puzzle_creators` → a shared `platform_creators` (or `love_digitally_creators`) collection, since a Creator's identity (display name, avatar, email) has no reason to differ per module; each module's own private state about that Creator (their puzzles, their timelines) stays in that module's own namespace, keyed by the same `creatorId`.

**Recipient identity stays module-scoped, deliberately, not shared.** The Puzzle Module's Recipient auth (anonymous, custom-claim-bound to one `experienceId`, minted by `resolveShareToken`) is intentionally narrow — a Recipient never has a platform-wide account, never logs in, and the claim only ever proves "this session may read this one experience." That's correct per-module and should stay per-module: a Timeline Module Recipient and a Puzzle Module Recipient opening two different gifts from two different Creators have no reason to share a session, and unifying that would be an actual privacy regression (a Recipient's puzzle-opening activity becoming visible to the Timeline Module, or vice versa, with zero product benefit).

Concretely, for a new module:
1. Depend on a shared `@love-digitally/auth` package exposing `AuthPort`/`AuthFacade` (extracted from the Puzzle Module's `application/creator/auth.facade.ts` + `infrastructure/firebase/*` auth adapters, made module-agnostic by parameterizing the Firestore collection name).
2. Read/write the shared `platform_creators` collection through that package — never touch Firebase Auth directly (matches the Puzzle Module's own existing Clean Architecture rule: only `infrastructure/firebase/*` touches `firebase/*`).
3. Build its own Recipient identity flow the way the Puzzle Module did, if the module has a Recipient concept at all (several future modules, per §9, don't).

## 4. Shared dashboard

**New surface: the Love Digitally Hub.** Not a rebuild of any module's own Dashboard — the Puzzle Module's Dashboard (`apps/puzzle-module/src/app/features/creator/dashboard/`) stays exactly as it is, showing only puzzle experiences, reachable at its own URL. The Hub is a thin, separate app (or a lazy-loaded shell at the platform's root domain) whose only job is: show a Creator everything they've made across every module, and let them start something new.

The hard part of a shared dashboard is exactly what §2 says modules never share: their private schemas. The Hub should not know what a `puzzle_experiences` document or a future `timeline_entries` document looks like. Proposed mechanism, modeled on the Puzzle Module's own `puzzle_events` (write-only-from-Cloud-Functions analytics log, `firestore.rules`):

- A new shared, write-only-from-Cloud-Functions collection, `platform_experiences`, one document per creation, written by each module's own `publish`/`create` Cloud Function at the moment that matters to that module (mirroring exactly how the Puzzle Module's `publishExperience` already logs `puzzle.created`/`puzzle.published`-shaped analytics events today — this is the same write, aimed at a different collection, not new machinery).
- Minimal, deliberately module-agnostic fields: `creatorId`, `moduleType` (`'puzzle' | 'timeline' | ...`), `title`, `status`, `thumbnailUrl`, `createdAt`, `updatedAt`, `openUrl` (the deep link back into the owning module).
- Firestore Rules: `allow read: if request.auth.uid == resource.data.creatorId; allow write: if false` — same shape as `puzzle_events`'s existing rule, already proven correct by that collection's own emulator test coverage (`apps/puzzle-module/functions/src/emulator-tests/security-rules.emulator-test.ts`).
- The Hub queries `platform_experiences` where `creatorId == me`, groups by `moduleType`, renders cards, and every card's "open" action is just `openUrl` — a normal link into the owning module's own Dashboard/editor, no cross-module routing logic needed.

## 5. Shared analytics

**Envelope shape, not a shared collection.** The Puzzle Module's analytics model (`domain/models/analytics-event.model.ts`, Module Contract §6 envelope: `eventId`, `eventName`, `experienceId`, `moduleType`, `actorRole`, `timestamp`, `payload`) already has a `moduleType` field baked in — it was built expecting more than one module from the start, even though only `'puzzle'` has ever been written. Proposal: every module keeps its **own** `{module}_events` collection (write-only-from-Cloud-Functions, same Rules pattern as `puzzle_events`), using the **same envelope shape**, so a future cross-module analytics pipeline (a BigQuery export, a shared internal dashboard) can union them without per-module translation — but no module ever needs another module's events for its own function, and nothing shares a single events collection across modules (that would mean every module's Cloud Functions needing write access to one shared collection, widening blast radius for no benefit — the same reasoning as data isolation in §2).

Concretely, for a new module: reuse `AnalyticsEvent`/`AnalyticsEventName` shape (parameterize `moduleType`), reuse the "best-effort, never blocks gameplay" pattern (`logEventSafely`, `functions/src/application/analytics.ts` in the Puzzle Module) verbatim — it's already module-agnostic.

## 6. Shared media storage

**Storage bucket and signing conventions, already generalizable.**

- One bucket (`lovedigitally-app.appspot.com`), one prefix per module (`puzzle_storage/`, proposed `timeline_storage/`, `gift_storage/`, …) — same pattern as Firestore namespacing (§1), same enforcement layer (`storage.rules`, one shared file).
- **Signed-URL-only delivery for anything gated** (a reveal image, a locked timeline entry, an unopened letter) is the one pattern worth calling a platform convention rather than reinventing per module: never let Storage Rules grant a Recipient direct read access to gated content, mint a short-lived signed URL (15 minutes, matching the Puzzle Module's `storage.service.ts`) from a Cloud Function only once the gating condition is server-verified true. This is Module Contract §8's rule generalized, and it's the single most security-relevant pattern a new module should copy exactly rather than reinvent.
- Local-emulator testing of that pattern needs a throwaway signing key (`functions/scripts/generate-fake-service-account.mjs` — this exact file, extracted into a shared testing-utilities package, since every module that signs URLs will hit the identical "the Functions emulator has no real GCP metadata server" limitation the Puzzle Module's own end-to-end UAT ran into, see `apps/puzzle-module/README.md` → End-to-End UAT).

## 7. Shared notification system

**Does not exist yet anywhere in this codebase — genuinely new, not an extraction.** The Puzzle Module has no push notifications, no transactional email (Copy Link / WhatsApp / native share are all client-side, user-initiated, not platform-sent notifications). Proposed shape, sized to what a gifting platform actually needs (not a general-purpose messaging system):

- A shared `platform_notification_intents` collection: any module's Cloud Function writes an intent document (`recipientContact` — an email or a future FCM token, `templateId`, `templateData`, `moduleType`, `createdAt`) rather than calling a delivery provider directly.
- One shared Cloud Functions codebase (`notification-dispatcher`, its own Hosting-independent Functions target, same isolation pattern as every module) — a Firestore-triggered function watches that collection and calls the actual delivery provider (a transactional email API, FCM), so **every module gets delivery, retry, and unsubscribe handling for free**, and no module ever holds a third-party notification-provider credential itself.
- Realistic first use case: "your puzzle was opened" / "your recipient finished!" — an email or push to the *Creator*, not the Recipient (Recipients never have accounts to notify, per §3). This is a genuinely new feature relative to what M0–M5 built, not a refactor of something existing — sequence it accordingly (§11).

## 8. Module registration ("plugin system," scoped honestly)

This is **not** a runtime-dynamic plugin architecture (no Module Federation, no lazy-fetched remote bundles) — that would be a much larger architectural bet than this monorepo's current shape (independent Angular apps, independent Hosting sites) supports without a substantial rework, and nothing in the kickoff request requires *runtime* pluggability specifically. What it needs, and what's proposed here, is **build-time registration**: a single source of truth the Hub (and any other shared surface) reads to know what modules exist, without hardcoding a list in five places.

```ts
// packages/love-digitally-platform/src/module-registry.ts
export interface ModuleDescriptor {
  readonly moduleType: string;              // 'puzzle', 'timeline', ... — matches platform_experiences.moduleType
  readonly displayName: string;             // "Puzzle", "Timeline"
  readonly description: string;             // one line, shown on the Hub's "create new" picker
  readonly hostingSite: string;             // Firebase Hosting site id
  readonly functionsCodebase: string;       // Firebase Functions codebase id
  readonly firestorePrefix: string;         // 'puzzle_', 'timeline_'
  readonly storagePrefix: string;           // 'puzzle_storage/', 'timeline_storage/'
  readonly createUrl: string;               // where the Hub sends "create a new one"
  readonly status: 'planned' | 'in_development' | 'beta' | 'ga' | 'deprecated';
}

export const MODULE_REGISTRY: readonly ModuleDescriptor[] = [
  {
    moduleType: 'puzzle',
    displayName: 'Puzzle',
    description: 'A personalized 3×3 photo-jigsaw gift, unlocked one memory at a time.',
    hostingSite: 'puzzle-module',
    functionsCodebase: 'puzzle-module',
    firestorePrefix: 'puzzle_',
    storagePrefix: 'puzzle_storage/',
    createUrl: '/puzzle/creator/wizard/new',
    status: 'ga',
  },
  // future modules append here as they're built — see §9.
];
```

A module is "registered" when: its descriptor is added to this array, its Firestore/Storage prefixes are reserved (checked for collision against every existing entry — a lint rule or a unit test over `MODULE_REGISTRY` can enforce prefix uniqueness cheaply), and its `publish`/`create` Cloud Function writes to `platform_experiences` (§4) with the matching `moduleType`. Nothing about registration requires the Hub to be redeployed for a module's *internal* changes — only a new module, or a status change (`beta` → `ga`), touches the registry.

## 9. Module lifecycle

Two different things share the word "lifecycle" here — worth keeping separate:

**(a) A single creation's lifecycle** — this is what the Puzzle Module already models per-experience (`draft → published → in_progress → completed → archived`, `domain/models/puzzle-experience.model.ts`'s `ExperienceStatus`) and what `platform_experiences` (§4) surfaces a `status` field for. Every module defines its own state machine here — a Timeline's states will not look like a Puzzle's — but every module reports into the same `status` field shape so the Hub can render a consistent badge without understanding each module's internal transitions.

**(b) A module's own lifecycle as a platform citizen** — new, proposed here, tracked via `ModuleDescriptor.status` (§8):

```
planned → in_development → beta → ga → deprecated → (retired, removed from registry)
```

- **`planned`**: named in the roadmap (§10), no code yet. Doesn't appear in the registry at all — the registry lists buildable/built things, a roadmap document lists intentions.
- **`in_development`**: registry entry exists (namespace reserved, collision-checked) but `createUrl` isn't linked from the Hub's picker yet — lets a module reserve its namespace and start building against real shared infrastructure before it's user-facing.
- **`beta`**: linked from the Hub, visibly labeled beta (matching the Puzzle Module's own honest labeling pattern — e.g. the Share screen's "Coming soon" tag for unbuilt Share Stats, `apps/puzzle-module/src/app/features/creator/publish/ui/share-panel.component.html` — the platform should keep that same "never claim something is done that isn't" discipline).
- **`ga`**: fully launched, no caveats. The Puzzle Module enters the registry at `ga` directly (§8's example), since it's already shipped v1.0.0.
- **`deprecated`**: still live for existing creations (a Recipient's already-sent gift must keep working — nothing here should ever break a link someone already received), removed from the "create new" picker.
- **`retired`**: removed from the registry entirely. Requires a data-retention decision (§11 flags this as an open question, not something to resolve preemptively) before it's ever exercised.

## 10. Future module roadmap

Sketches only — enough to confirm each module fits the platform shape in §1–§9, not implementation-ready specs. Each follows the same base pattern: its own namespace, its own Clean Architecture layers, consumes the shared systems above. What's called out per module is what's genuinely *different* about it.

| Module | Firestore prefix | Creator flow shape | Recipient/viewer flow shape | What's genuinely new |
|---|---|---|---|---|
| **Timeline** | `timeline_` | Author a sequence of dated moments (text + photo per entry), set a reveal cadence (all-at-once vs. one-per-day). | Scroll/step through entries as they unlock; no gameplay, no scoring. | A **scheduled unlock** mechanism (Cloud Scheduler or a Firestore-timestamp-gated read) — the Puzzle Module has no time-based gating today, everything unlocks on Recipient action. |
| **Story** | `story_` | Author a linear narrative with branching choice points (a lightweight "choose what happens next"). | Reads through, picks branches, sees one of several endings. | Branching-graph data model — closer to the Puzzle Preview's local state machine (`domain/rules/gameplay.rules.ts`) in spirit than to real-time server validation; likely doesn't need the "never trust the client" rigor Module Contract §8 mandates for puzzles, since there's no "correct answer" to protect. |
| **Quiz** | `quiz_` | Author N questions about the recipient/relationship, each with a correct answer + wrong-answer feedback. | Answers questions, sees a score. | The module architecturally closest to the Puzzle Module — reuse its scoring/answer-validation pattern near-verbatim (server-authoritative `submitAnswer`-equivalent, never a local correctness check). Strong candidate for extracting a **shared gameplay-scoring package** once both exist, rather than duplicating `pointsForPiece`-shaped logic twice. |
| **Memory Wall** | `memory_wall_` | Invite multiple contributors (not just one Creator) to each add a photo + note to a shared collaborative board. | Views the assembled wall; may also be a contributor, not just a passive Recipient. | First module where "who can write" isn't just one Creator — needs its own multi-contributor auth/permission model, layered on the shared Creator identity (§3) but not identical to it (a contributor isn't necessarily a full platform Creator with their own Dashboard presence). |
| **Countdown** | `countdown_` | Set a target date/occasion and a message revealed at zero. | Watches a countdown; sees the message on/after the date. | Almost entirely client-side-safe (a countdown timer isn't sensitive), the outlier module where "never trust the client" matters least — the gated content is just the final message, same signed-URL-at-unlock-time pattern as everything else. |
| **Gift** | `gift_` | Attach a real-world or digital gift (a voucher code, a linked purchase) to a personalized reveal. | Unlocks the reveal, claims the gift (code reveal, redemption link). | The first module touching **money/fulfillment** — needs its own security review before launch (voucher-code storage is a different threat model than a photo), and likely integrates with `lovedigitally-web`'s existing Razorpay-based order Cloud Functions (`createOrder`/`verifyOrder`, `lovedigitally-web/functions/`) rather than building new payment infrastructure. |
| **Letter** | `letter_` | Write a single long-form personal letter, optionally with a scheduled delivery date. | Reads the letter once unlocked. | The simplest possible module by data shape (one document, one text field) — good candidate to build *second* (after Quiz, given Quiz's closer architectural kinship to Puzzle) specifically because its simplicity stress-tests the shared platform layer (auth, registry, Hub, Storage conventions) without a lot of module-specific complexity obscuring whether the shared layer itself works. |
| **Gallery** | `gallery_` | Curate a set of photos/captions into a themed gallery. | Browses the gallery; no unlock mechanic, gated only by the share link itself (like a private, curated album). | Storage-heaviest module (many images, not one reveal image) — first real test of the shared Storage convention's cost/performance at N > 1 images per creation, and of lazy-loading conventions already established for the Puzzle Board's piece images. |
| **Surprise** | `surprise_` | A grab-bag container module — e.g. a randomized reveal among several pre-authored variants, or a "surprise me" combination of other module types. | Opens not knowing exactly what they'll get. | Likely the module that most directly depends on several *other* modules already existing (a "surprise" composed of a Letter + a Gallery, say) — sequence last, not first, and treat as an integration exercise for the platform layer rather than a module with its own novel domain. |
| **Event** | `event_` | Create an invitation/RSVP page for an occasion, with details, location, and guest responses. | Views details, RSVPs (a real multi-recipient, two-way-data flow — every prior module is one Creator → one Recipient; this is one Creator → many Recipients, each writing back an RSVP). | First module needing genuine **multi-recipient** data modeling (today's `puzzle_progress`/custom-claim pattern is built assuming one Recipient session per experience) — likely needs its own Recipient-identity shape distinct from every prior module's, not a straightforward reuse of the Puzzle Module's pattern. Flag for real design work, not just "copy the Puzzle Module," when this module is actually scoped. |

**Suggested build order**, purely from "what stress-tests the platform layer with the least module-specific risk first": **Letter** (simplest, proves the shared layer works end-to-end) → **Quiz** (closest to the Puzzle Module, proves a second gameplay-shaped module can share the scoring pattern) → **Countdown** or **Gallery** (proves time-gating / heavier-storage respectively) → the rest, informed by what the first few reveal about the shared layer's actual gaps. This is a suggestion for whoever scopes the next module, not a commitment made by this document.

## 11. Open questions and risks (not resolved here, deliberately)

- **`apps/lovedigitally` naming collision** (§0) — needs a product decision, not an engineering one.
- **Subdomain vs. path-based module routing** at the Hub level (`puzzle.lovedigitally.app` vs. `lovedigitally.app/puzzle`) — affects Hosting site configuration and cross-module cookie/session behavior if Recipient sessions ever need to work across a path boundary; not decided here.
- **Retired-module data retention** (§9b) — what happens to a Recipient's already-opened link when a module is retired is a real product/legal question (data the Recipient never asked to have deleted), not an engineering default to pick alone.
- **Shared gameplay-scoring package** (flagged under Quiz, §10) — premature to extract with only one real consumer (the Puzzle Module); revisit once a second scoring-shaped module actually exists, per this project's own established "don't build for a hypothetical second consumer" discipline (see `apps/puzzle-module/CLAUDE.md`'s Clean Architecture notes for the precedent).
- **`platform_creators` migration** — renaming `puzzle_creators` to a shared collection (§3) is a real data migration on an already-live collection once the Puzzle Module is in production, not a free rename; needs its own migration plan when a second module actually needs shared Creator identity, not before.
- **Notification provider selection** (§7) — no transactional email or push provider is chosen here; that's a vendor decision, not an architecture one, and doesn't block the *shape* of the intents-collection pattern being agreed on now.

## 12. What this document is not

It is not a commitment to build any of §10's modules on any timeline, not a finalized schema for `platform_experiences`/`platform_notification_intents` (both are proposals to review, not migrations to run), and not a redesign of anything the Puzzle Module already ships — every "already built" claim above points at real, merged code, and nothing in this document asks for it to change before a second module actually needs the shared layer to exist. Per the kickoff instruction this was written against: no new module implementation starts from this document alone.
