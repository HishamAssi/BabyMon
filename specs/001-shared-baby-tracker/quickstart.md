# Quickstart: Shared Baby Tracker

## Self-hosting the app (household setup)

1. **Prerequisites**: Docker and Docker Compose installed on the machine that will run the server (a home server, NAS, or Raspberry Pi is sufficient — see `research.md` §4 for why SQLite/Node.js were chosen for this scale).
2. **Deploy**:
   ```bash
   docker compose -f deploy/docker-compose.yml up -d
   ```
   This starts the backend API + WebSocket server, serves the built PWA as static assets, and creates a persisted SQLite volume for the household's data.
3. **Expose it beyond the home network** (needed for FR-019 — caregivers using it away from home): put the container behind a reverse proxy with HTTPS (e.g., Caddy pointed at your own domain) or a zero-config private network tool (e.g., Tailscale, Cloudflare Tunnel). The app itself doesn't require a specific choice here — see `research.md` §6.
4. **First run**: visiting the app for the first time with no Household/Caregiver rows yet in the database enters setup mode: create the Household, create the first Baby Profile, and generate the first invite (`mode: new_caregiver`).

## Verifying the primary flow (matches spec User Stories 1 & 2)

1. On Device A (e.g., a laptop browser), complete first-run setup, creating a baby profile and an invite link.
2. Open the invite link on Device B (e.g., a phone browser or installed PWA) and enter a display name (e.g., "Husband") to redeem it.
3. On Device B, log a feeding.
4. On Device A, without refreshing, confirm the feeding appears in the timeline within a few seconds — this is the core value proposition (SC-002).
5. On Device A, open the baby's summary view and confirm "time since last feed" reflects the entry just logged from Device B (SC-005).
6. From Device B, generate an "add device" invite for the same identity, redeem it on a third device (e.g., a tablet), and confirm entries from all three devices show the same caregiver name — verifies FR-022/FR-023.
7. Disconnect Device B from the network, log a diaper change, then reconnect — confirm it appears on Device A exactly once (verifies FR-012/FR-018, offline sync with no duplicates).

## Local development

```bash
# Backend
cd backend && npm install && npm run dev

# Frontend (separate terminal)
cd frontend && npm install && npm run dev
```

Run tests:
```bash
npm run test          # Vitest unit/integration (both backend and frontend)
npm run test:e2e      # Playwright multi-caregiver sync scenarios
```
