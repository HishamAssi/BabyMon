# Phase 0 Research: Feed, Pumping & Diaper Event Details

**Input**: `specs/002-care-event-details/spec.md`. This is an incremental enhancement to the existing `care_events` table and its surrounding API/UI, built in `specs/001-shared-baby-tracker/`. No new technology choices are needed — this file resolves *interaction design* questions the spec deliberately left to planning (FR-013: "no more than one additional selection step... amount or note remains optional and skippable").

## 1. How amount/note entry fits into the existing quick-log flow

**Decision**:
- **Breastfeed**: logs instantly on tap, identical to today's one-tap behavior — no additional step at all.
- **Formula**: tapping "Formula" reveals a small inline optional amount field (ounces) with a "Log" confirm button; leaving it blank and confirming logs with no amount.
- **Pumping**: same inline-optional-amount-then-confirm pattern as Formula (the amount question is structurally identical for both).
- **Diaper (Pee / Poop / Both)**: each classification button logs instantly, like today's diaper button — no inline note field at log time. The optional free-form note is added via the existing edit affordance (FR-010) immediately after, if the caregiver wants it.

**Rationale**: The spec's FR-013 requires classification to be the only *required* extra step, with amount/note "optional and skippable." Amount (a number) is naturally something a caregiver may want to type in the moment (right after the bottle/pump session), so a one-extra-tap reveal-then-confirm keeps it available without forcing it. A diaper note, by contrast, is often an afterthought ("oh, that was runny") rather than something decided before logging — keeping diaper logging fully instant (matching today's single-tap diaper behavior exactly) and letting the note be added via edit avoids slowing down the single highest-frequency, must-be-fast interaction in the app, while still fully satisfying FR-006 (the note is optional and can be added).

**Alternatives considered**:
- *Inline note field for diaper too, mirroring Formula/Pumping*: rejected — would add a confirm step to every diaper log, including the common case where no note is wanted, regressing the "no more than one additional selection step" and "same tap count as today" targets (SC-001, FR-013) for the highest-frequency event type.
- *Full modal/form for every event type*: rejected — directly contradicts FR-013 and the original app's core "log in under 10 seconds" value proposition (`specs/001-shared-baby-tracker/spec.md` SC-001).

## 2. Where the new fields live

**Decision**: Extend the existing `care_events` table (and its Dexie mirror) with three new nullable columns — `feedType`, `amountOz`, `diaperContents` — rather than creating new tables or a separate "event details" table.

**Rationale**: These are always 1:1 with a single care event, never queried or joined independently, and the existing sync machinery (idempotent POST, tombstoned soft-delete, WebSocket broadcast of the full record) already moves the *entire* event record on every create/update — extending the same row means the new fields sync for free, with no changes needed to `backend/src/sync/socket.ts` or the catch-up/broadcast logic.

**Alternatives considered**: A separate `feed_details`/`diaper_details` table keyed by event id — rejected as unnecessary indirection for fields that are always present-or-absent together with their parent event and never queried independently.

## 3. Amount storage precision

**Decision**: Store `amountOz` as a real/floating-point number of ounces (e.g., `3.5`), matching the existing pattern for growth measurements (`weight`, `length` are stored as integers in a smaller unit — grams/mm — specifically to avoid floating-point storage; ounces here are simpler and don't need that same milli-unit trick since fractional ounces, e.g. 3.5, 4.25, are the natural unit caregivers think in and don't require the same cross-unit-system conversion growth measurements do).

**Rationale**: FR-011 requires fractional ounce input (e.g., 3.5). SQLite's REAL type and JavaScript's `number` handle this natively without the precision pitfalls that matter for currency-like values; feeding amounts don't need that level of rigor.

**Alternatives considered**: Storing in whole milliliters (converting oz→mL) to match growth measurement's "store in a fixed small unit" pattern — rejected as unnecessary complexity; the spec explicitly scopes this to ounces only (see spec.md Assumptions), so there's no second unit to reconcile against.

## Summary of resolved design decisions

| Question | Resolution |
|---|---|
| Formula/pumping amount entry UX | Inline optional field revealed on selecting Formula/Pumping, confirm-to-log |
| Breastfeed UX | Unchanged instant one-tap log |
| Diaper classification UX | Instant one-tap log per classification (Pee/Poop/Both) |
| Diaper note entry | Added via existing edit flow after logging, not at log time |
| Data location | New nullable columns on the existing `care_events` table |
| Amount storage | Real number, ounces, as entered (no unit conversion) |
