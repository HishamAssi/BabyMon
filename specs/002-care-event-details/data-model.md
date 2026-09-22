# Data Model: Feed, Pumping & Diaper Event Details

Extends `specs/001-shared-baby-tracker/data-model.md`'s **Care Event** entity. No new tables — three new nullable columns on `care_events` (`backend/src/db/schema.ts`), mirrored on the Dexie `careEvents` table (`frontend/src/data/db.ts`).

## Care Event — new fields

| Field | Type | Applies to | Notes |
|---|---|---|---|
| `feedType` | `"breastfeed" \| "formula"` , nullable | `feed` | Required at creation for `feed` events (FR-001); `null` for all other event types and for feed events logged before this feature existed (FR-012). |
| `amountOz` | number (fractional), nullable | `feed` (formula only), `pumping` | Optional even when applicable (FR-002, FR-004, FR-011). Must be `null` for a `feed` event where `feedType = "breastfeed"` (FR-003) and for `diaper`/`sleep` events. |
| `diaperContents` | `"pee" \| "poop" \| "both"`, nullable | `diaper` | Required at creation for `diaper` events (FR-005); `null` for all other event types and for diaper events logged before this feature existed (FR-012). |

The existing `notes` field (already on Care Event) is reused as the diaper free-form description (FR-006) — no new field needed for that; it remains available for all event types as it is today.

**Validation rules** (enforced at the API layer, same trust boundary as existing Care Event validation):
- Creating a `feed` event without `feedType` is rejected.
- Creating a `feed` event with `feedType = "breastfeed"` and a non-null `amountOz` is rejected (FR-003 — breastfeeding volume isn't tracked).
- Creating a `diaper` event without `diaperContents` is rejected.
- `amountOz`, when present, must be a positive number.
- These fields are irrelevant to `sleep` events; the API ignores them if supplied on a `sleep` event rather than erroring (keeps the contract forgiving for a field the UI will never send there).

**Editing** (FR-010): `feedType`, `amountOz`, `diaperContents`, and `notes` are all editable via the existing `PATCH /babies/:babyId/events/:eventId` endpoint, following the same last-write-wins/attribution behavior already in place for `startTime`/`endTime`/`notes`.

**Sync**: No changes to the sync model — these are plain columns on the same row, so they ride along automatically with the existing idempotent-create, tombstoned-delete, and WebSocket-broadcast-of-the-full-record behavior (`backend/src/sync/socket.ts`, `frontend/src/data/syncClient.ts`).
