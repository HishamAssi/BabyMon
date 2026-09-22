# Self-hosting BabyMon

BabyMon runs as a single Docker container (the API/sync server, which also
serves the built web app) plus a persisted SQLite volume for your household's
data. See `specs/001-shared-baby-tracker/quickstart.md` for the end-to-end
verification walkthrough once it's running.

## 1. Run it

From the repository root:

```bash
docker compose -f deploy/docker-compose.yml up -d --build
```

This builds the frontend and backend, starts the server on port 3000, and
creates a named volume (`babymon-data`) holding `babymon.sqlite`. Your data
lives only in that volume — nothing is sent to a third-party service
(FR-015).

Open `http://<this-machine's-address>:3000` to complete first-run setup
(create your baby's profile and get your first invite link).

## 2. Make it reachable away from home (FR-019)

The container only needs to be served over HTTPS at whatever address you
expose it at — BabyMon itself doesn't care which method you use. Two
reasonable defaults:

- **A reverse proxy with a domain you own**, e.g. [Caddy](https://caddyserver.com/)
  in front of this container, for automatic HTTPS via Let's Encrypt.
- **A zero-config private network**, e.g. [Tailscale](https://tailscale.com/)
  or a Cloudflare Tunnel, if you'd rather not expose a public port at all.

Either way, once caregivers' devices can reach that address, invite links
generated from the Invite page will work from anywhere, not just your home
network.

## 3. Backups

Everything lives in the `babymon-data` volume as a single SQLite file. To
back it up:

```bash
docker compose -f deploy/docker-compose.yml exec babymon \
  sqlite3 /data/babymon.sqlite ".backup /data/backup-$(date +%F).sqlite"
docker cp $(docker compose -f deploy/docker-compose.yml ps -q babymon):/data/backup-*.sqlite .
```

## 4. Updating

```bash
git pull
docker compose -f deploy/docker-compose.yml up -d --build
```

Migrations run automatically on container start (`backend/src/db/migrate.ts`).

## 5. Using a pre-built image instead of building locally

CI publishes an image to GitHub Container Registry on every push to `main`
(see `.github/workflows/ci.yml` and `docker-publish.yml`). To use it instead
of building locally, point `deploy/docker-compose.yml`'s `image:` at
`ghcr.io/hishamassi/babymon:main` (or a specific commit SHA tag) and drop the
`build:` block.

## Configuration

Environment variables (set in `deploy/docker-compose.yml`):

| Variable | Default | Purpose |
|---|---|---|
| `DB_PATH` | `/data/babymon.sqlite` | SQLite file location inside the container |
| `PORT` | `3000` | Server port |
| `INVITE_EXPIRY_DAYS` | `7` | How long a `new_caregiver` invite link stays valid |
