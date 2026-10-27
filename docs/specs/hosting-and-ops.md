# Hosting & Operations

Production runtime for Kerala Mission Control: a Google Compute Engine VM,
file-backed Deno KV, Caddy HTTPS, and GCS for nightly KV backups.

## Topology

| Piece         | Production value                                                                                       |
| ------------- | ------------------------------------------------------------------------------------------------------ |
| Cloud project | `scenic-lane-184013`                                                                                   |
| VM            | `mission-control` — e2-micro, Debian 12, `us-central1-a`                                               |
| Static IP     | `35.222.232.148`                                                                                       |
| Public URL    | `https://mission-control.35.222.232.148.sslip.io` (temporary sslip.io DNS)                             |
| Process       | systemd `mission-control` → `deno serve -A --unstable-kv --unstable-cron --port 8000 _fresh/server.js` |
| Reverse proxy | Caddy → `127.0.0.1:8000` (automatic HTTPS)                                                             |
| App files     | `/opt/mission-control`                                                                                 |
| Secrets       | `/etc/mission-control/env`                                                                             |
| KV            | `KV_PATH=/var/lib/mission-control/kv.db` (**single writer / single instance only**)                    |
| KV backups    | nightly → `gs://scenic-lane-184013-mission-control-backups`                                            |

Local development remains `deno task dev` with default local KV — not the
production file.

Note: this is a **second** e2-micro in the project (Accounts already uses the
Always Free slot), so expect normal e2-micro charges (~covered by AI Pro Cloud
credits).

## Deploy

### Automatic (GitHub Actions)

Push to `main` (or **Actions → Deploy → Run workflow**) deploys production.

Workflow: `.github/workflows/deploy.yml` — fmt/lint/check/test/ml-glyphs, then
`deno task deploy` over SSH. Secrets on `joesaby/kerala-gov-mission-control`:

| Secret                   | Purpose                                                               |
| ------------------------ | --------------------------------------------------------------------- |
| `DEPLOY_HOST`            | SSH target, e.g. `josesebastian@35.222.232.148`                       |
| `DEPLOY_SSH_PRIVATE_KEY` | Ed25519 key; pubkey in that user's `~/.ssh/authorized_keys` on the VM |

GitHub Actions is not on the VPC, so deploy uses SSH to the public IP (dedicated
deploy key — not your laptop key). Provisioning/admin uses local `gcloud` auth.

### Manual

```bash
gcloud compute config-ssh   # once
DEPLOY_HOST=mission-control.us-central1-a.scenic-lane-184013 deno task deploy
```

`deno task deploy` → `deploy/gcp/deploy.sh`: local build, tarball `_fresh` +
source needed at runtime (`main.ts`, `islands`, `routes`, `data`, `lib`,
`components`, …), scp, extract under `/opt/mission-control`, restart service.

First-time OS packages / Caddy / systemd: `deploy/gcp/setup-vm.sh <hostname>`.

## Environment

Authoritative keys live in `/etc/mission-control/env` on the VM:

| Variable                                             | Role                         |
| ---------------------------------------------------- | ---------------------------- |
| `KV_PATH`                                            | File-backed Deno KV path     |
| `ADMIN_PASSWORD`                                     | HTTP Basic Auth for `/admin` |
| `GEMINI_API_KEY`                                     | Ingest / AI pipeline         |
| `NVIDIA_KEY` / `OPENROUTER_API_KEY` / `GROQ_API_KEY` | Optional LLM fallbacks       |

`/etc/mission-control/backup.env` holds
`BUCKET=gs://scenic-lane-184013-mission-control-backups`.

## Ops

```bash
gcloud compute ssh mission-control --zone=us-central1-a -- \
  'journalctl -u mission-control -f'
systemctl is-active mission-control caddy
```

## Domain cutover

1. Point DNS A record at `35.222.232.148`.
2. Update `/etc/caddy/Caddyfile` site name; `systemctl reload caddy`.
3. Disconnect Deno Deploy Git Integration / delete the Deno Deploy project when
   ready.
