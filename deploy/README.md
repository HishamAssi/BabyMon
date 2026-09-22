# Self-hosting BabyMon

BabyMon runs as a single Docker container (the API/sync server, which also
serves the built web app) plus a persisted SQLite volume for your household's
data. See `specs/001-shared-baby-tracker/quickstart.md` for the end-to-end
verification walkthrough once it's running.

## 1. Run it

**Option A — pull the pre-built image (recommended for a home server)**:

```bash
docker run -d --name babymon --restart unless-stopped \
  -p 127.0.0.1:3000:3000 \
  -v babymon-data:/data \
  ghcr.io/hishamassi/babymon:main
```

`-p 127.0.0.1:3000:3000` binds only to localhost — the app isn't reachable
from your home LAN at all, only through whatever tunnel you set up in step 2
(see Tailscale Funnel below). Drop the `127.0.0.1:` prefix if you also want
it reachable directly on your home network.

**Option B — build it yourself**, from the repository root:

```bash
docker compose -f deploy/docker-compose.yml up -d --build
```

Either way, this creates a named volume holding `babymon.sqlite`. Your data
lives only in that volume — nothing is sent to a third-party service
(FR-015).

Once it's running, open it in a browser to complete first-run setup (create
your baby's profile and get your first invite link) — either directly at
`http://<basement-machine-ip>:3000` on your home network, or at your Tailscale
Funnel URL from step 2 once that's set up.

## 2. Make it reachable away from home, without port-forwarding (FR-019)

This uses **Tailscale Funnel**: it gives you a public `https://<name>.<tailnet>.ts.net`
URL that any caregiver can open in a normal browser — no app install needed on
their end — while your basement machine only ever makes *outbound* connections
to Tailscale's network. No router configuration, no port-forwarding, no
exposed port on your home IP.

1. **Install Tailscale on the basement machine** and join your tailnet:

   ```bash
   curl -fsSL https://tailscale.com/install.sh | sh
   sudo tailscale up
   ```

   (Follow the printed login link once, in any browser, to authorize the
   machine — it doesn't need to be the basement machine's own browser.)

2. **Enable HTTPS certificates for your tailnet** (one-time, required for
   Funnel): in the [Tailscale admin console](https://login.tailscale.com/admin/dns),
   under *DNS*, toggle **HTTPS Certificates** on.

3. **Enable Funnel**, if this is your first time using it: run

   ```bash
   sudo tailscale funnel status
   ```

   If it reports that Funnel isn't enabled for your tailnet, it prints a
   link to the admin console's access-control policy where you add:

   ```json
   "nodeAttrs": [
     { "target": ["autogroup:member"], "attr": ["funnel"] }
   ]
   ```

   (Funnel is available on Tailscale's free/personal plan — this is a
   one-time ACL toggle, not a paid feature.)

4. **Expose BabyMon** (port 3000, matching the `docker run`/compose port
   above):

   ```bash
   sudo tailscale funnel --bg 3000
   ```

5. **Get your public URL**:

   ```bash
   sudo tailscale funnel status
   ```

   This prints something like `https://basement.your-tailnet.ts.net` —
   that's the link to share in the Invite page, and the one caregivers use
   away from home. Tailscale terminates HTTPS at the edge and proxies plain
   HTTP to your local port, including the WebSocket `/sync` connection, so
   nothing else needs to change in the app.

   This Funnel configuration is stored by `tailscaled` and survives reboots
   automatically, as long as `tailscaled` itself is running (it's installed
   as a systemd service and enabled by default).

**Alternative**: a reverse proxy with a domain you own (e.g.
[Caddy](https://caddyserver.com/) for automatic HTTPS) works too, if you'd
rather use your own domain — but that does require forwarding a port through
your router, which Tailscale Funnel avoids entirely.

## 3. Backups

Everything lives in the `babymon-data` volume as a single SQLite file. To
back it up:

```bash
docker exec babymon sqlite3 /data/babymon.sqlite ".backup /data/backup-$(date +%F).sqlite"
docker cp babymon:/data/backup-$(date +%F).sqlite .
```

(Replace `babymon` with `deploy-babymon-1` if you used docker-compose's
default container naming from Option B.)

## 4. Updating

**Option A (pre-built image)**:

```bash
docker pull ghcr.io/hishamassi/babymon:main
docker stop babymon && docker rm babymon
# re-run the `docker run` command from step 1
```

**Option B (built locally)**:

```bash
git pull
docker compose -f deploy/docker-compose.yml up -d --build
```

Migrations run automatically on container start (`backend/src/db/migrate.ts`).

## Configuration

Environment variables:

| Variable | Default | Purpose |
|---|---|---|
| `DB_PATH` | `/data/babymon.sqlite` | SQLite file location inside the container |
| `PORT` | `3000` | Server port |
| `INVITE_EXPIRY_DAYS` | `7` | How long a `new_caregiver` invite link stays valid |
