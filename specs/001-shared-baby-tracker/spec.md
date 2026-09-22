# Feature Specification: Shared Baby Tracker

**Feature Branch**: `001-shared-baby-tracker`
**Created**: 2026-09-21
**Status**: Draft
**Input**: User description: "Perform research on the best Best Baby Apps for New Parents to download analyzing the best features that people enjoy and the most useful features that they use in order to come up with a locally hosted application that is supported on both iOS, Android, and the Web (Web is the most important). The main feature that I would like in this application is to be able to synchronize the baby changes with other people (i.e husband and wife can both update the same application)."

## Research Summary

A review of the current leading baby-tracking apps (Huckleberry, Robin Baby, Nara Baby, Baby Connect, Baby Tracker, ParentLove, Pebbi, Newbies, Le Baby) surfaced a consistent pattern in what parents value most:

- **Speed of logging**: the winning apps let a tired caregiver record a feed, diaper change, or sleep event in one or two taps (or by voice). Anything that takes longer gets abandoned.
- **Multi-caregiver real-time sync**: the single most requested feature across reviews — partners, and sometimes grandparents or a nanny, all see the same live log instead of texting each other updates.
- **At-a-glance status**: a "time since last feed / diaper / sleep" summary so a caregiver can see the baby's state without scrolling history.
- **Sleep tracking with pattern insight**: start/stop sleep timers and simple pattern summaries (not full clinical analytics) help with routines.
- **Growth and milestones**: lightweight logging of weight/length/head circumference and developmental milestones, often with a photo.
- **Low-friction caregiver invites**: the best-reviewed sharing flows use a link or code rather than requiring every caregiver to fight through a full signup.
- **Reliability under bad conditions**: logging must keep working when offline or on flaky connections (typical 3 a.m. home wifi) and sync afterward without creating duplicates.
- **No ads / no data resale** is repeatedly cited as a satisfaction driver — directly relevant to this project's "locally hosted" requirement, which keeps the family's data under their own control instead of a vendor's cloud.

These findings shaped the priorities and requirements below.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Log a care event and have it appear for the other caregiver (Priority: P1)

A parent feeds, changes, or puts the baby down for a nap and logs it in a few taps. Their partner, using the same household's shared baby profile on a different device, sees that entry appear without doing anything else.

**Why this priority**: This is the feature the user explicitly asked for and the single most-cited differentiator among existing apps — it's what turns two individual logs into one shared source of truth and eliminates "did you already feed her?" texts.

**Independent Test**: Can be fully tested by having two caregiver accounts open on two devices, logging an event on one, and confirming it appears on the other — delivers value on its own even before growth tracking, milestones, or reminders exist.

**Acceptance Scenarios**:

1. **Given** two caregivers are both linked to the same baby profile, **When** one caregiver logs a feeding, **Then** the other caregiver sees that feeding entry reflected in their own view of the baby's log.
2. **Given** a caregiver is logging an event, **When** they select the event type (feed, diaper, sleep, pumping), **Then** they can complete the log entry in no more than a few interactions (no long multi-screen forms required for a routine entry).
3. **Given** a sleep session is in progress (started but not ended), **When** any linked caregiver views the baby's status, **Then** they can see that sleep is currently in progress and who started it.

---

### User Story 2 - Invite and manage co-caregivers on a baby's profile (Priority: P1)

A parent sets up a baby's profile and invites their spouse (and optionally other caregivers) to join it, so everyone who cares for the baby is logging into the same shared record instead of separate ones.

**Why this priority**: Without a way to add a second caregiver, the core sync feature in User Story 1 has no one to sync with — this is the enabling setup step for the app's main value proposition.

**Independent Test**: Can be fully tested by having one caregiver create a baby profile, send an invite, and confirming a second person can join that same profile and immediately see its existing log — delivers value by establishing the shared household unit even before any events are logged.

**Acceptance Scenarios**:

1. **Given** a caregiver has created a baby profile, **When** they generate an invite for that profile, **Then** another person who accepts the invite gains access to the same baby's shared log.
2. **Given** a baby profile has two or more linked caregivers, **When** one caregiver removes another caregiver's access, **Then** the removed caregiver can no longer view or edit that baby's log.
3. **Given** a new caregiver has just joined a baby profile, **When** they open it for the first time, **Then** they see the full existing history logged by other caregivers, not an empty log.

---

### User Story 3 - See a combined timeline and at-a-glance status (Priority: P2)

A caregiver opens the app and, without scrolling, can see how long it's been since the last feeding, diaper change, and sleep, plus a merged chronological history of everything logged by every caregiver.

**Why this priority**: Reviews consistently show this "status at a glance" view is what caregivers check most often day-to-day; it's the payoff that makes the logging effort (Story 1) useful in the moment, but the app is still usable without it (caregivers could scan the raw log).

**Independent Test**: Can be fully tested by logging several events from two different caregiver accounts and confirming a third view shows them merged in correct chronological order with accurate "time since" indicators.

**Acceptance Scenarios**:

1. **Given** multiple caregivers have logged events for a baby, **When** any caregiver opens the baby's summary view, **Then** they see the time elapsed since the most recent feed, diaper change, and sleep session.
2. **Given** events were logged by different caregivers at different times, **When** a caregiver views the baby's history, **Then** entries appear in one merged chronological timeline showing which caregiver logged each entry.

---

### User Story 4 - Track growth measurements and milestones (Priority: P3)

A parent records the baby's weight, length, and head circumference after a pediatrician visit, and separately logs developmental milestones (e.g., "first smile," "rolled over") with an optional note or photo, viewable by all caregivers over time.

**Why this priority**: Consistently offered by leading apps and valued for tracking development over months, but it's a lower-frequency activity than daily feed/sleep/diaper logging and isn't required for the app's core sync value.

**Independent Test**: Can be fully tested by adding a growth measurement and a milestone entry from one caregiver's device and confirming both appear, correctly dated, on another caregiver's device.

**Acceptance Scenarios**:

1. **Given** a caregiver records a new growth measurement, **When** another linked caregiver views the growth history, **Then** the new measurement appears alongside prior measurements in chronological order.
2. **Given** a caregiver logs a milestone with a photo, **When** another linked caregiver opens the milestones view, **Then** they can see the milestone's description, date, and photo.

---

### User Story 5 - Get reminded when the next feeding or medicine dose is due (Priority: P3)

Based on the interval a caregiver sets (e.g., "feed every 3 hours" or a medicine schedule), the app reminds a caregiver when the next one is due, using the most recent logged entry as the baseline.

**Why this priority**: A frequently-cited convenience feature, but it depends entirely on Story 1's logging being in place first and is the most dispensable of the five stories for an initial usable product.

**Independent Test**: Can be fully tested by logging a feed, setting a reminder interval, and confirming a reminder is triggered at the expected time relative to that logged entry.

**Acceptance Scenarios**:

1. **Given** a caregiver has set a reminder interval for feedings, **When** the elapsed time since the last logged feeding reaches that interval, **Then** the caregiver is notified that a feeding is due.
2. **Given** a caregiver logs a new feeding before the reminder is due, **When** the reminder's baseline event updates, **Then** the reminder recalculates from the newest entry rather than firing based on stale data.

---

### Edge Cases

- What happens when two caregivers log the same event (e.g., both log the same feeding within seconds of each other)? The system should preserve both entries as visible to caregivers rather than silently discarding one, so no data is lost even if it means a caregiver has to delete a duplicate.
- What happens when a caregiver logs events while offline? Entries logged offline must sync once connectivity returns, without creating duplicate copies of the same entry.
- What happens when a caregiver is removed from a baby profile? They lose ongoing access, but the historical entries they previously logged remain part of the baby's record (attributed to them) rather than being deleted.
- What happens when two caregivers' devices have different clock times? Event ordering in the shared timeline should reflect when the event actually happened as reported by the logging caregiver, and should not visibly reorder based on device clock drift alone.
- What happens when a household has more than one baby? Caregivers must be able to switch between multiple baby profiles without their logs mixing together.
- What happens when the locally-hosted server is temporarily unreachable? Caregivers should still be able to log events on their device and have them sync automatically once the server is reachable again.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST allow a caregiver to log a care event (feeding, diaper change, sleep start/end, pumping) in no more than a few interactions.
- **FR-002**: System MUST synchronize a newly logged event to all other caregivers linked to the same baby profile without requiring any manual "refresh" or "export/import" step.
- **FR-003**: System MUST allow an existing caregiver to invite another person to become a linked caregiver on a specific baby's profile.
- **FR-004**: System MUST allow a caregiver with access to a baby profile to revoke another caregiver's access to that profile.
- **FR-005**: System MUST record, for every logged event, which caregiver logged it, and display that attribution to other caregivers.
- **FR-006**: System MUST allow a caregiver to edit or delete an event, including events originally logged by a different caregiver, and MUST record who last modified it.
- **FR-007**: System MUST present a combined chronological timeline of all events for a baby, merged across every caregiver who logged them.
- **FR-008**: System MUST display, for each tracked event type, the time elapsed since the most recently logged event of that type.
- **FR-009**: System MUST allow a household to manage more than one baby profile, keeping each baby's logs, caregivers, and history separate.
- **FR-010**: System MUST allow caregivers to record growth measurements (weight, length/height, head circumference) with a date, viewable as a history over time.
- **FR-011**: System MUST allow caregivers to record developmental milestones with a date, a description, and an optional photo.
- **FR-012**: System MUST allow a caregiver to log events while their device has no network connection, and MUST synchronize those events to other caregivers once connectivity is restored, without creating duplicate entries.
- **FR-013**: System MUST be usable from a web browser as a fully functional primary surface, without requiring installation of a native application.
- **FR-014**: System MUST also be usable from iOS and Android devices with the same core logging, syncing, and viewing capabilities available on the web.
- **FR-015**: System MUST run on infrastructure that the household hosts and controls itself, rather than storing the family's baby data on a third-party vendor's cloud service.
- **FR-016**: System MUST retain a baby's logged history (events, growth, milestones) indefinitely by default, remaining viewable by linked caregivers at any time, unless a caregiver explicitly deletes a specific entry.
- **FR-017**: System MUST allow a caregiver to set a reminder interval for a recurring care activity (e.g., feeding, medicine) and notify caregivers when that interval has elapsed since the most recent matching logged event.
- **FR-018**: System MUST preserve both entries, rather than silently discarding one, when two caregivers log events for the same baby at effectively the same time.
- **FR-019**: System MUST remain reachable and usable by caregivers over the internet when they are away from the home network where it is hosted (e.g., at work, running errands), not only while connected to the home network.
- **FR-020**: System MUST authenticate each caregiver via a lightweight invite-link or invite-code join flow, without requiring a separate password to be created and remembered per caregiver.
- **FR-021**: System MUST support an unlimited (open-ended) number of caregivers per baby profile, with every linked caregiver receiving equal ability to log, edit, and delete entries — no view-only or restricted roles.

### Key Entities *(include if feature involves data)*

- **Household**: The family unit that owns and hosts an instance of the application; contains one or more caregivers and one or more baby profiles.
- **Caregiver**: A person with access to log and view data for one or more baby profiles (e.g., a parent, grandparent, or nanny); has an identity used to attribute logged entries and an access status (active/revoked) per baby profile.
- **Baby Profile**: Represents one child being tracked; has a name and birthdate, and is linked to the caregivers who may log entries for it.
- **Care Event**: A single logged occurrence — feeding, diaper change, sleep session (with start and optional end time), or pumping session — with a timestamp, the logging caregiver, and optional notes.
- **Growth Measurement**: A dated record of weight, length/height, and/or head circumference for a baby profile.
- **Milestone**: A dated record of a developmental achievement, with a description and optional photo, for a baby profile.
- **Reminder**: A caregiver-configured recurring interval tied to an event type, used to notify caregivers when the next occurrence is due based on the most recent matching Care Event.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A caregiver can log a routine care event (feed, diaper, sleep) in under 10 seconds from opening the app.
- **SC-002**: An event logged by one caregiver is visible to another linked caregiver on a different device within 5 seconds under normal network conditions.
- **SC-003**: A new caregiver can be invited to and successfully join a baby's shared profile in under 2 minutes.
- **SC-004**: 100% of events logged while offline are successfully synchronized, with no duplicates and no data loss, once the device reconnects.
- **SC-005**: A caregiver can determine "how long since the baby last ate / had a diaper change / slept" in under 5 seconds of opening the app, without scrolling through history.
- **SC-006**: The application remains fully usable for logging and viewing on each of the three target surfaces (web browser, iOS, Android) with no loss of core functionality on any one of them.
- **SC-007**: Household baby-care data remains stored on infrastructure the household controls, with zero reliance on a third-party vendor's cloud storage for that data.

## Assumptions

- "Locally hosted" means the household deploys and controls its own instance of the application and its data storage, rather than using a shared multi-tenant vendor cloud service, but the instance is still reachable by caregivers over the internet while away from home (not restricted to the home network).
- The web experience is the primary, most fully-featured surface; iOS and Android are expected to match its core logging, syncing, and viewing capabilities rather than offer a divergent feature set.
- A baby profile supports an unlimited number of linked caregivers, all with equal edit access; there is no view-only or restricted role in this version.
- Caregiver access is granted via invite-link/code rather than per-caregiver passwords; safeguarding the household's invite links/codes is treated as the household's own responsibility.
- Historical data is retained indefinitely by default; no automatic data expiration or retention limit is assumed unless a caregiver explicitly deletes an entry.
- Notifications/reminders are delivered to whichever of the three surfaces (web, iOS, Android) the caregiver is actively using or has enabled notifications on; the specific delivery mechanism is an implementation detail left to the planning phase.
