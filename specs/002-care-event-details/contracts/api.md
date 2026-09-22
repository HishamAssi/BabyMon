# API Contract Delta: Feed, Pumping & Diaper Event Details

Extends `specs/001-shared-baby-tracker/contracts/api.md`. Only the Care Event create/edit request bodies change; endpoint paths, auth, and response shapes are unchanged (the response is always the full row, which now includes the new columns).

## `POST /babies/:babyId/events`

**Body** (extends the existing shape):

```json
{
  "id": "uuid",
  "type": "feed" | "diaper" | "sleep" | "pumping",
  "startTime": "ISO-8601",
  "endTime": "ISO-8601 (optional)",
  "notes": "string (optional)",

  "feedType": "breastfeed" | "formula",     // required when type = "feed"
  "amountOz": 3.5,                           // optional; only meaningful when type = "feed" & feedType = "formula", or type = "pumping"
  "diaperContents": "pee" | "poop" | "both"  // required when type = "diaper"
}
```

**New validation** (400 `invalid_body` on failure):
- `type = "feed"` requires `feedType`.
- `type = "feed"` with `feedType = "breastfeed"` rejects a non-null `amountOz`.
- `type = "diaper"` requires `diaperContents`.

## `PATCH /babies/:babyId/events/:eventId`

**Body** (extends the existing shape) — any subset of:

```json
{
  "startTime": "ISO-8601",
  "endTime": "ISO-8601",
  "notes": "string",
  "feedType": "breastfeed" | "formula",
  "amountOz": 3.5,
  "diaperContents": "pee" | "poop" | "both"
}
```

Same validation rules as create apply to whatever fields are supplied (e.g., you can't PATCH `feedType` to `"breastfeed"` while leaving a previously-set `amountOz` in place — the API clears `amountOz` in that case).

## WebSocket `/sync` and `GET .../events`

Unchanged. The pushed/fetched record is the full row, so `feedType`, `amountOz`, and `diaperContents` are simply present on every `care_event` message and list response going forward.
