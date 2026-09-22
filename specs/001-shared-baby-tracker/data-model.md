# Data Model: Shared Baby Tracker

Derived from `spec.md` Key Entities, Functional Requirements, and `research.md` decisions.

## Household

The single family unit that owns this self-hosted instance (per Clarifications session 2026-09-21: one instance = one household, no cross-household isolation needed).

| Field | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| name | string, optional | e.g., "The Smiths" — display only |
| createdAt | timestamp | Set at first-run setup |

- Exactly one Household row is expected to ever exist per deployed instance.

## Caregiver

A person (not a device) with access to one or more Baby Profiles. Identity persists across all of that person's devices (FR-022, FR-023).

| Field | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| householdId | UUID | FK → Household |
| displayName | string | Entered once at first invite redemption, e.g., "Husband" |
| createdAt | timestamp | |

- A Caregiver is created exactly once, the first time an invite is redeemed under a new identity. Subsequent devices for the same person link to this same row (see CaregiverDevice) rather than creating a new Caregiver.

## CaregiverDevice

Represents one device on which a Caregiver has joined; the mechanism by which identity "persists on a device" (FR-022) and by which a Caregiver can hold multiple devices (FR-023).

| Field | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| caregiverId | UUID | FK → Caregiver |
| deviceTokenHash | string | Long-lived credential, hashed at rest; presented on every request instead of a password |
| label | string, optional | e.g., "Husband's phone" — user-editable, defaults to a generic value |
| createdAt | timestamp | |
| lastSeenAt | timestamp | Updated on each sync connection |

- Revoking a caregiver's access (FR-004) revokes all of that caregiver's CaregiverDevice rows for the affected Baby Profile via CaregiverBabyAccess (below), not the Caregiver identity itself — a removed caregiver's past entries remain attributed to them (per Edge Cases).

## BabyProfile

One tracked child.

| Field | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| householdId | UUID | FK → Household |
| name | string | |
| birthdate | date | |
| createdAt | timestamp | |

- FR-009: a household may have more than one BabyProfile; each keeps its own logs, caregivers, and history separate via CaregiverBabyAccess and the babyId FK on every event-like entity below.

## CaregiverBabyAccess

Join entity: which caregivers may log/view a given baby. Invites (FR-003) and revocation (FR-004) both operate at this per-baby granularity, per User Story 2.

| Field | Type | Notes |
|---|---|---|
| caregiverId | UUID | FK → Caregiver |
| babyId | UUID | FK → BabyProfile |
| status | enum(active, revoked) | FR-004 sets this to `revoked` rather than deleting the row, preserving historical attribution |
| joinedAt | timestamp | |

- Composite primary key: (caregiverId, babyId).
- Per FR-021 (clarified as "unlimited caregivers, equal edit access"): no role/permission field beyond `status` — every active row grants full log/edit/delete rights on that baby.

## InviteCode

Short-lived, shareable code/link used to redeem access (FR-003, FR-020) or to add a device to an existing identity (FR-023).

| Field | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| babyId | UUID | FK → BabyProfile |
| code | string | Short human-shareable token (also encoded in a QR/link) |
| mode | enum(new_caregiver, add_device) | `add_device` codes carry a target `caregiverId` and skip the display-name step |
| targetCaregiverId | UUID, nullable | Set only when mode = add_device |
| createdByCaregiverId | UUID, nullable | Null only for the very first invite created during initial setup, before any caregiver exists |
| expiresAt | timestamp, nullable | Reasonable default: expires after a bounded window (e.g., 7 days) or first successful redemption for `new_caregiver` mode; `add_device` codes may be reused until revoked, since they always resolve to the same caregiver |
| createdAt | timestamp | |

**State transitions**: `active` → `redeemed` (new_caregiver, single-use) or `active` → `revoked` (either mode, manually invalidated) or `active` → `expired` (time-based).

## CareEvent

A single logged occurrence: feeding, diaper change, sleep session, or pumping session (FR-001, FR-002, FR-005 through FR-008, FR-018).

| Field | Type | Notes |
|---|---|---|
| id | UUID (client-generated) | Assigned at creation time on the logging device, enabling idempotent offline sync (see research.md §2) |
| babyId | UUID | FK → BabyProfile |
| type | enum(feed, diaper, sleep, pumping) | |
| startTime | timestamp | When the event began |
| endTime | timestamp, nullable | Null while a sleep session is in progress (User Story 1, Acceptance Scenario 3); required for other types at creation |
| loggedByCaregiverId | UUID | FK → Caregiver; who originally logged it (FR-005) |
| lastModifiedByCaregiverId | UUID | FK → Caregiver; updated on every edit (FR-006) |
| notes | string, optional | |
| deletedAt | timestamp, nullable | Soft delete (tombstone) so sync can propagate a deletion instead of silently vanishing on other devices |
| createdAt | timestamp | Server-assigned on first sync; used as the sync cursor |
| updatedAt | timestamp | |

**Validation rules**:
- `loggedByCaregiverId` must have an `active` CaregiverBabyAccess row for `babyId` at creation time.
- Two CareEvent rows with different `id`s are never merged, even if identical in every other field (see research.md §2 — this is how FR-018's "preserve both entries" is satisfied).

## GrowthMeasurement

Dated growth record (FR-010).

| Field | Type | Notes |
|---|---|---|
| id | UUID (client-generated) | |
| babyId | UUID | FK → BabyProfile |
| date | date | |
| weight | number, optional | Unit stored alongside value (household's chosen unit system) |
| length | number, optional | |
| headCircumference | number, optional | |
| loggedByCaregiverId | UUID | FK → Caregiver |
| createdAt | timestamp | |

## Milestone

Dated developmental achievement (FR-011).

| Field | Type | Notes |
|---|---|---|
| id | UUID (client-generated) | |
| babyId | UUID | FK → BabyProfile |
| date | date | |
| description | string | |
| photoRef | string, optional | Reference to locally-stored media, not an external CDN (consistent with FR-015) |
| loggedByCaregiverId | UUID | FK → Caregiver |
| createdAt | timestamp | |

## Reminder

Caregiver-configured recurring interval (FR-017).

| Field | Type | Notes |
|---|---|---|
| id | UUID | |
| babyId | UUID | FK → BabyProfile |
| eventType | enum(feed, diaper, sleep, pumping, medicine) | `medicine` is a labeled reminder-only concept — not a CareEvent type, since the spec only requires reminding, not full medicine-dose logging |
| intervalMinutes | integer | |
| createdByCaregiverId | UUID | FK → Caregiver |
| active | boolean | |
| createdAt | timestamp | |

- Reminder due-time is always computed as `(most recent matching CareEvent.startTime, not deleted, for this babyId) + intervalMinutes` — never stored statically, so it self-corrects whenever a new matching event is logged (User Story 5, Acceptance Scenario 2).

## Entity relationship summary

```
Household 1──* BabyProfile
Household 1──* Caregiver
Caregiver 1──* CaregiverDevice
Caregiver *──* BabyProfile   (via CaregiverBabyAccess)
BabyProfile 1──* InviteCode
BabyProfile 1──* CareEvent
BabyProfile 1──* GrowthMeasurement
BabyProfile 1──* Milestone
BabyProfile 1──* Reminder
Caregiver 1──* CareEvent          (loggedBy / lastModifiedBy)
Caregiver 1──* GrowthMeasurement  (loggedBy)
Caregiver 1──* Milestone          (loggedBy)
```
