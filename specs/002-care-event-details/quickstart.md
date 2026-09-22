# Quickstart: Feed, Pumping & Diaper Event Details

Manual verification, once implemented (assumes the base app from `specs/001-shared-baby-tracker/quickstart.md` is already running with at least one caregiver joined).

1. Open **Log Event**. Confirm the single "Feed" button has become two: **Breastfeed** and **Formula**.
2. Tap **Breastfeed** — confirm it logs immediately (same speed as before), and the Timeline shows "Feeding (Breastfeed)" with no amount.
3. Tap **Formula** — confirm a small optional ounces field appears with a "Log" button. Leave it blank and confirm — Timeline shows "Feeding (Formula)" with no amount.
4. Tap **Formula** again, enter `4.5`, confirm — Timeline shows "Feeding (Formula, 4.5oz)".
5. Tap **Pumping** — confirm the same optional-amount pattern as Formula; log one with an amount and one without.
6. Confirm the single "Diaper" button has become three: **Pee**, **Poop**, **Both**. Tap each in turn — confirm each logs instantly (no extra step), and the Timeline shows "Diaper (Pee)" / "Diaper (Poop)" / "Diaper (Both)" respectively.
7. Open one of the logged diaper entries and add a free-form note (e.g., "a bit runny") via the existing edit action — confirm it now shows alongside that entry.
8. On a second caregiver's device/session, confirm all of the above (feed type/amount, diaper classification/note) appear identically and in real time (validates this rides the existing sync path with no changes needed there).
9. Confirm an event logged before this feature existed (if any test data predates it) still displays normally, just without a feed type / diaper classification shown.
