# API Contract: Shared Baby Tracker

All endpoints are served by the self-hosted backend over HTTPS. Every request except invite redemption requires the `Authorization` header carrying the device's long-lived token (see `data-model.md` CaregiverDevice), which resolves to a Caregiver and is checked against CaregiverBabyAccess for the relevant `babyId`.

## Onboarding & Identity

### `POST /invites/:babyId`
Create an invite code for a baby profile.
- **Auth**: An existing active caregiver for `babyId` — OR, for the very first invite of a brand-new instance, an unauthenticated one-time "setup mode" available only until the first Caregiver exists.
- **Body**: `{ mode: "new_caregiver" | "add_device", targetCaregiverId?: string }`
- **Returns**: `{ code: string, shareUrl: string, expiresAt: string | null }`
- Implements FR-003 and (via `add_device`) FR-023.

### `POST /invites/:code/redeem`
- **Body**: `{ displayName?: string }` (required only when the invite's mode is `new_caregiver`)
- **Behavior**: `new_caregiver` → creates a Caregiver + CaregiverDevice + CaregiverBabyAccess(active). `add_device` → creates only a new CaregiverDevice linked to the invite's `targetCaregiverId`, plus CaregiverBabyAccess(active) if not already present.
- **Returns**: `{ deviceToken: string, caregiverId: string, babyId: string }`
- Implements FR-020, FR-022, FR-023.

### `DELETE /babies/:babyId/caregivers/:caregiverId`
Revoke a caregiver's access to a baby (sets CaregiverBabyAccess.status = revoked; does not delete the Caregiver or their past entries).
- **Auth**: Any active caregiver for `babyId`.
- Implements FR-004 and the corresponding Edge Case (history remains, attributed).

## Baby Profiles

### `GET /babies`
List baby profiles the authenticated caregiver has active access to.

### `POST /babies`
Create a new baby profile within the household.
- **Body**: `{ name: string, birthdate: string }`
- Implements FR-009.

## Care Events

### `GET /babies/:babyId/events?since=<cursor>`
Returns events created/updated/deleted (tombstoned) since the given sync cursor, for initial load and reconnect catch-up. Implements the "no manual refresh" half of FR-002 and the reconnect side of FR-012.

### `POST /babies/:babyId/events`
Create a care event. The client always supplies its own `id` (UUID), generated at logging time — the server treats this as the idempotency key.
- **Body**: `{ id: string, type: "feed"|"diaper"|"sleep"|"pumping", startTime: string, endTime?: string, notes?: string }`
- **Behavior**: If an event with this `id` already exists for this baby, the request is a no-op success (supports safe offline-queue retries — FR-012).
- Implements FR-001, FR-005, FR-018.

### `PATCH /babies/:babyId/events/:eventId`
Edit an existing event (e.g., set `endTime` to close out an in-progress sleep session, or correct a mistaken entry). Updates `lastModifiedByCaregiverId`.
- Implements FR-006.

### `DELETE /babies/:babyId/events/:eventId`
Soft-deletes (tombstones) the event so the deletion propagates to other devices instead of the entry silently persisting elsewhere.

## Growth & Milestones

### `GET /babies/:babyId/growth` / `POST /babies/:babyId/growth`
List/record growth measurements. Implements FR-010.

### `GET /babies/:babyId/milestones` / `POST /babies/:babyId/milestones`
List/record milestones, optionally with a photo reference uploaded via a companion `POST /babies/:babyId/milestones/:id/photo` (binary body, stored on the self-hosted instance, never an external service — consistent with FR-015). Implements FR-011.

## Reminders

### `GET /babies/:babyId/reminders` / `POST /babies/:babyId/reminders` / `PATCH /babies/:babyId/reminders/:id`
Configure recurring reminder intervals per event type. Implements FR-017; due-time is computed server-side (or client-side from synced data) as described in `data-model.md`.

## Real-time Sync Channel

### `WS /sync?since=<cursor>`
On connect, the server streams any CareEvent/GrowthMeasurement/Milestone rows changed since `cursor`. While connected, the server pushes each new create/update/delete for this household's babies (that the caregiver has access to) as it happens.

Message shape (server → client):
```json
{ "entity": "care_event", "op": "create" | "update" | "delete", "record": { /* full row */ }, "cursor": "<opaque>" }
```

Message shape (client → server, for pushing a queued offline write immediately rather than waiting for the next `POST`):
```json
{ "entity": "care_event", "op": "create", "record": { "id": "...", "...": "..." } }
```

Implements FR-002 and SC-002 (target: visible on other devices within 5 seconds). If a WebSocket cannot be established, the client falls back to polling `GET .../events?since=<cursor>` on a short interval (see research.md §3).
