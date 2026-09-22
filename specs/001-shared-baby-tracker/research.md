# Phase 0 Research: Shared Baby Tracker

**Input**: `specs/001-shared-baby-tracker/spec.md` (see FR-001 through FR-023, SC-001 through SC-007)
**Purpose**: Resolve every technical unknown in the plan's Technical Context before design begins.

## 1. Cross-platform delivery (Web + iOS + Android, Web most important)

**Decision**: Build a single Progressive Web App (PWA) — installable to the home screen on iOS and Android, fully usable in a desktop/mobile browser with no install at all — rather than three separate codebases.

**Rationale**: FR-013/FR-014 require the web experience to be the fully-featured primary surface with iOS/Android matching its core capabilities, not diverging. A PWA satisfies both with one codebase: it runs directly in any browser (web, per FR-013), and installs to iOS/Android home screens with offline support via a service worker (FR-014, FR-012). This also keeps a self-hosted household's operational burden to one deployable artifact instead of maintaining app-store submissions for a personal family tool.

**Alternatives considered**:
- *Separate native iOS (Swift) + Android (Kotlin) apps*: best per-platform polish, but triples the codebase and adds app-store distribution overhead — disproportionate for a household-run tool with no public distribution need.
- *React Native / cross-platform native shell*: avoids the triple codebase but still requires app-store builds/signing for install, which conflicts with "self-hosted, no vendor dependency" (app stores are themselves a third-party distribution dependency) and adds build complexity without a corresponding requirement in the spec.

## 2. Offline-first data layer & concurrent-edit handling

**Decision**: Every record (Care Event, Growth Measurement, Milestone) is created client-side with a client-generated UUID and is append-first: new entries are always additive rows, never merged/overwritten with another entry. Edits/deletes mutate that same row and record `lastModifiedBy` + `updatedAt`; deletes are soft (tombstoned) rather than removed outright. The client keeps a local queue (IndexedDB) of not-yet-synced writes and replays them against the server when connectivity returns, keyed by the record's UUID so a retried push is idempotent.

**Rationale**: FR-018 and the corresponding edge case require that two caregivers logging "the same" event at the same time both survive as visible entries rather than one silently overwriting the other — because each entry has its own UUID assigned at creation, there is no natural collision to resolve for the *create* case at all. For the *edit* case (two caregivers editing the same existing entry), last-write-by-timestamp with visible attribution (FR-006) is sufficient — the spec does not require merge-level conflict resolution, only that the person who last changed it is recorded. Idempotent replay-by-UUID directly satisfies FR-012's "no duplicate entries" requirement for offline sync.

**Alternatives considered**:
- *Full CRDT library (Yjs/Automerge)*: handles arbitrary concurrent merges elegantly, but is significant added complexity for a data model that is fundamentally an append-mostly event log, not freeform collaborative text/structure. Rejected as over-engineered for this scope.
- *Server-authoritative locking (only one caregiver can edit at a time)*: simpler to build, but contradicts the "husband and wife both update freely" premise and would visibly block a second caregiver mid-edit, which SC-001/SC-002 (fast, near-instant logging) argue against.

## 3. Real-time sync transport

**Decision**: A persistent WebSocket connection from each caregiver's device to the self-hosted server, used to push newly created/changed/deleted records to every other connected device for the same household in real time. On reconnect (including after an offline period), the client sends its last-known sync cursor and receives anything it missed, then replays any locally-queued offline writes.

**Rationale**: SC-002 requires an event logged by one caregiver to be visible to another within 5 seconds under normal network conditions — a push-based channel meets this comfortably, whereas periodic polling would either miss the target or waste requests. WebSocket is broadly supported by self-hostable Node.js servers and by all target browsers/PWA runtimes.

**Alternatives considered**:
- *Short-interval polling*: simplest to implement and to reason about behind restrictive proxies, but wastes bandwidth on a resource-constrained home server and makes the 5-second target harder to guarantee consistently. Kept as an automatic fallback if a WebSocket connection cannot be established (e.g., a restrictive network), but not the primary mechanism.
- *Server-Sent Events (SSE)*: viable one-way alternative, but the client also needs to push offline-queued writes promptly on reconnect; a single bidirectional WebSocket connection covers both directions with one mechanism.

## 4. Backend runtime & storage

**Decision**: A Node.js/TypeScript server (Fastify) backed by SQLite (via Drizzle ORM), packaged as a single Docker container with a persisted volume for the database file.

**Rationale**: FR-015 requires infrastructure the household hosts and controls itself. SQLite is a single file, needs no separate database server process, and comfortably handles this app's actual scale (Assumption: a handful of caregivers, a handful of babies, years of event history — thousands, not millions, of rows) — this matches the "runs on a home server/NAS/Raspberry Pi" reality of self-hosting far better than a client-server database that adds its own operational burden. Node.js has first-class support on the low-power ARM hardware common in home self-hosting (Raspberry Pi, Synology, UnRAID).

**Alternatives considered**:
- *PostgreSQL*: more headroom for scale this project will never need, and adds a second container/process for a household to keep running and back up — unjustified complexity here.
- *Firebase/Supabase or another vendor BaaS*: directly contradicts FR-015 ("rather than storing the family's baby data on a third-party vendor's cloud service").

## 5. Caregiver authentication & multi-device identity

**Decision**: An invite code/link is generated per baby profile. Redeeming it for the *first* time asks only for a display name (e.g., "Husband") and creates a Caregiver identity plus a long-lived device token stored on that device — no password. The same caregiver can link additional devices under their existing identity either by reusing/regenerating that invite (household member's own choice) or via an "add another device" code generated from an already-linked device, which redeems directly against the existing Caregiver record instead of creating a new one.

**Rationale**: Directly implements FR-020, FR-022, and FR-023 (clarified in `/speckit-clarify`): no per-caregiver password, identity persists per device after one join, and the same person can be recognized across multiple devices rather than fragmenting into duplicate caregiver records.

**Alternatives considered**:
- *Email/password accounts per caregiver*: explicitly rejected by the user's clarification answer (Question 2, Option A) during `/speckit-specify`.
- *One invite code redeemable only once, ever*: simplest to implement, but would force a new "Husband" caregiver record for every additional device, breaking FR-023's attribution requirement.

## 6. Remote reachability for a self-hosted instance

**Decision**: The application itself is transport-agnostic — it only requires being served over HTTPS at whatever address the household exposes it at. The deployment guide (quickstart.md) documents a default recommended path (Docker Compose + a reverse proxy such as Caddy for automatic HTTPS, exposed via the household's own domain or a zero-config private-network tool such as Tailscale/Cloudflare Tunnel) without hard-coding that choice into the application.

**Rationale**: FR-019 requires the app to remain usable away from the home network, but the spec deliberately leaves the exposure mechanism a household/deployment decision (this is infrastructure the household controls per FR-015, not a product feature). Not baking in a specific tunneling vendor avoids creating an undocumented dependency the household didn't choose.

**Alternatives considered**:
- *Mandating a specific vendor tunnel in the app itself*: would reintroduce a third-party dependency, in tension with FR-015's "no third-party vendor cloud" data-hosting intent (even if only for reachability, not data storage) — rejected as an application-level requirement, kept as a documented deployment recommendation only.

## 7. Testing strategy

**Decision**: Vitest for backend unit/integration tests (including a dedicated offline-queue-replay and concurrent-create test suite covering FR-012/FR-018) and frontend component tests; Playwright for end-to-end multi-caregiver scenarios that open two simulated sessions against one running instance and assert sync behavior described in the acceptance scenarios (e.g., User Story 1 and User Story 3).

**Rationale**: The spec's acceptance scenarios are fundamentally multi-device/multi-caregiver interactions — a browser-automation E2E layer is the only practical way to verify "caregiver A logs an event, caregiver B sees it" end-to-end, while Vitest covers the sync/offline logic at a faster, more targeted unit level.

**Alternatives considered**: Manual-only QA — rejected; the concurrency and offline-sync guarantees in FR-012/FR-018 are exactly the kind of timing-sensitive behavior that regresses silently without automated coverage.

## Summary of resolved Technical Context

| Item | Resolution |
|---|---|
| Language/Version | TypeScript (Node.js 20+ backend, ES2022+ frontend) |
| Primary Dependencies | Fastify, Drizzle ORM, `ws` (backend); React, Vite, `vite-plugin-pwa`, Dexie.js (frontend) |
| Storage | SQLite (single file, Docker volume) |
| Testing | Vitest (unit/integration), Playwright (E2E multi-caregiver sync) |
| Target Platform | Installable PWA (any modern browser; iOS/Android home screen) + self-hosted Linux/Docker server |
| Project Type | Web application (backend + frontend) |
| Performance Goals | Event sync visible to other caregivers within 5s (SC-002); routine log entry completed in <10s (SC-001) |
| Constraints | Must function offline and sync without duplicates on reconnect (FR-012); no third-party cloud data storage (FR-015) |
| Scale/Scope | Single household per instance; handful of caregivers/babies; years of event history at family scale, not internet scale |
