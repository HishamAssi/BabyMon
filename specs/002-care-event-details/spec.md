# Feature Specification: Feed, Pumping & Diaper Event Details

**Feature Branch**: `002-care-event-details`
**Created**: 2026-09-22
**Status**: Draft
**Input**: User description: "I would like to enhance the Feed, Pumping, and Diaper change events. Analyze each for possible units/amounts that can be implemented. For example, Feed should have either breastfed or formula fed, if formula fed, we should be able to denote how many ounces we fed the baby (there is no way to tell if breastfed). Same with pumping, we should have an optional way of telling how much we pumped. For Diaper, we should be able to denote whether it was pee or poop and a free form textbox to be able to describe it."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Record what and how much the baby was fed (Priority: P1)

When logging a feed, a caregiver indicates whether it was a breastfeed or a formula feed. For a formula feed, they can optionally record how many ounces the baby drank. For a breastfeed, no amount is recorded, since it can't be reliably measured.

**Why this priority**: This is the most detailed of the three requested enhancements and the one most caregivers will use most often — feeding is typically the most frequently logged event type, and knowing method (and formula volume) is often the specific thing a pediatrician or the other caregiver wants to know.

**Independent Test**: Can be fully tested by logging a formula feed with an amount, logging a formula feed with no amount, and logging a breastfeed, then confirming each displays correctly in the timeline — delivers value on its own even before the diaper or pumping enhancements exist.

**Acceptance Scenarios**:

1. **Given** a caregiver is logging a feed, **When** they select "breastfeed", **Then** the event is logged with no amount field shown or recorded.
2. **Given** a caregiver is logging a feed, **When** they select "formula" and enter an amount in ounces, **Then** the event is logged with both the feeding method and the amount.
3. **Given** a caregiver is logging a formula feed, **When** they don't enter an amount, **Then** the event is still logged successfully with just the feeding method recorded.
4. **Given** a feed has been logged with a method and (optionally) an amount, **When** any linked caregiver views the timeline, **Then** they see the feeding method and amount (if recorded) alongside that entry.

---

### User Story 2 - Describe a diaper change (Priority: P2)

When logging a diaper change, a caregiver indicates whether it contained pee, poop, or both, and can optionally add a short free-form note (e.g., color, consistency, anything unusual).

**Why this priority**: Explicitly requested and high-frequency like feeding, but slightly less detailed in scope than the feed enhancement (a single classification plus free text, versus feed's conditional amount logic).

**Independent Test**: Can be fully tested by logging a diaper change as pee-only, poop-only, and both, with and without a note, and confirming each displays correctly in the timeline.

**Acceptance Scenarios**:

1. **Given** a caregiver is logging a diaper change, **When** they select "pee", "poop", or "both", **Then** the event is logged with that classification.
2. **Given** a caregiver is logging a diaper change, **When** they add free-form text (e.g., "a bit runny"), **Then** that text is saved and shown alongside the entry.
3. **Given** a caregiver is logging a diaper change, **When** they skip the free-form text, **Then** the event still logs successfully with just the classification.
4. **Given** a diaper change has been logged, **When** any linked caregiver views the timeline, **Then** they see its classification and note (if any) alongside that entry.

---

### User Story 3 - Record how much was pumped (Priority: P3)

When logging a pumping session, a caregiver can optionally record how many ounces were pumped.

**Why this priority**: Explicitly requested but described by the user as optional and with the least additional detail of the three — pumping is also typically the least frequent of the three event types for most households.

**Independent Test**: Can be fully tested by logging a pumping session with an amount and one without, and confirming both display correctly in the timeline.

**Acceptance Scenarios**:

1. **Given** a caregiver is logging a pumping session, **When** they enter an amount in ounces, **Then** the event is logged with that amount.
2. **Given** a caregiver is logging a pumping session, **When** they don't enter an amount, **Then** the event still logs successfully with no amount recorded.
3. **Given** a pumping session has been logged with an amount, **When** any linked caregiver views the timeline, **Then** they see the pumped amount alongside that entry.

---

### Edge Cases

- What happens if a caregiver wants to log a single feeding session that included both breastfeeding and formula? Each feed entry records one method; a combination feeding is logged as two separate feed entries rather than one entry with two methods.
- What happens if a diaper change is neither wet nor dirty (e.g., a precautionary check)? The caregiver selects whichever classification is closest and can use the free-form note to clarify (e.g., "dry, just checking"), or the classification is left as recorded by the caregiver's best judgment — the free-form field exists exactly to cover cases the three-way classification doesn't fit cleanly.
- What happens to feed, diaper, and pumping entries logged before this feature existed? They simply have no feeding method, diaper classification, amount, or note recorded — the system treats those fields as "not recorded" rather than requiring any retroactive data entry, and they continue to display normally without those details.
- What happens if two caregivers edit the same entry's details (e.g., one corrects the amount while another adds a note) around the same time? Handled by the existing edit/attribution behavior for care events (last edit wins, attributed to whoever made it) — this feature does not change that behavior.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST require a caregiver to specify a feeding method (breastfeed or formula) when logging a feed.
- **FR-002**: System MUST allow a caregiver to optionally record an amount, in ounces, when logging a formula feed.
- **FR-003**: System MUST NOT present or store an amount field for a breastfeed, since breastfeeding volume can't be reliably measured.
- **FR-004**: System MUST allow a caregiver to optionally record an amount, in ounces, when logging a pumping session.
- **FR-005**: System MUST require a caregiver to specify a diaper classification (pee, poop, or both) when logging a diaper change.
- **FR-006**: System MUST allow a caregiver to optionally add free-form descriptive text when logging a diaper change.
- **FR-007**: System MUST display the recorded feeding method and amount (if any) alongside each feed entry wherever care events are listed (timeline, status summary details, etc.).
- **FR-008**: System MUST display the recorded diaper classification and note (if any) alongside each diaper entry wherever care events are listed.
- **FR-009**: System MUST display the recorded pumped amount (if any) alongside each pumping entry wherever care events are listed.
- **FR-010**: System MUST allow a caregiver to edit a previously logged entry's feeding method, amount, diaper classification, or note, consistent with the existing ability to edit any logged event.
- **FR-011**: System MUST accept fractional ounce amounts (e.g., 3.5) for both formula feed and pumping amounts, to match realistic measurement precision.
- **FR-012**: System MUST treat feeding method, amount, diaper classification, and note as absent ("not recorded") on entries logged before this feature existed, rather than requiring retroactive entry.
- **FR-013**: System MUST keep logging a feed or diaper change to no more than one additional selection step beyond the existing event-type selection (i.e., choosing breastfeed/formula, or pee/poop/both, is the only required extra tap; entering an amount or note remains optional and skippable), so routine logging stays fast.

### Key Entities *(include if feature involves data)*

- **Care Event** *(existing entity, extended)*: For a `feed` event, gains a feeding method (breastfeed or formula) and an optional amount in ounces (formula only). For a `pumping` event, gains an optional amount in ounces. For a `diaper` event, gains a classification (pee, poop, or both) and an optional free-form note. Other event types (sleep) are unaffected.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A caregiver can log a breastfeed in the same number of steps as logging any other one-tap event today (no added friction over the existing baseline).
- **SC-002**: A caregiver can log a formula feed, including an amount, in under 15 seconds.
- **SC-003**: A caregiver can log a diaper change, including its classification and an optional note, in under 15 seconds.
- **SC-004**: A caregiver can log a pumping session, with or without an amount, in under 15 seconds.
- **SC-005**: 100% of feed entries logged after this feature ships include a feeding method.
- **SC-006**: 100% of diaper entries logged after this feature ships include a classification.
- **SC-007**: A caregiver viewing the timeline can identify a feed's method and amount, or a diaper's classification and note, without opening a separate detail view.

## Assumptions

- Feeding method (breastfeed/formula) and diaper classification (pee/poop/both) are required at logging time, while all amounts and notes remain optional — this keeps the data caregivers explicitly asked for reliably captured, while not adding friction for details that are genuinely optional or unmeasurable (breastfeeding volume, pumping amount, diaper notes).
- Diaper classification includes a "both" (mixed) option in addition to the "pee" and "poop" the user named explicitly, since a single diaper very commonly contains both — this matches standard practice among comparable baby-tracking apps researched for the original feature (see `specs/001-shared-baby-tracker/research.md`).
- Amounts are recorded in ounces only (as the user specified), accepting fractional values; a metric (mL) unit option is not included in this scope and would be a reasonable future enhancement.
- A single feed entry records exactly one feeding method; a session that mixed breastfeeding and formula is logged as two separate feed entries rather than a single combined one.
- This feature only adds fields to the existing Care Event concept from `specs/001-shared-baby-tracker/spec.md` — it does not introduce new event types, new caregivers/permissions concerns, or change how events sync between caregivers.
