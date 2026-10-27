#!/usr/bin/env bash
# Run ONCE on the fresh e2-micro VM (Debian 12) as a sudo-capable user.
#   scp -r deploy/gcp <vm>:~ && ssh <vm> 'bash ~/gcp/setup-vm.sh mission-control.example.com'
set -euo pipefail
DOMAIN="${1:?usage: setup-vm.sh <domain>}"

sudo apt-get update
sudo apt-get install -y curl unzip git debian-keyring debian-archive-keyring \
  apt-transport-https gpg sqlite3

# Deno
if ! command -v deno >/dev/null; then
  curl -fsSL https://deno.land/install.sh | sudo DENO_INSTALL=/usr/local sh
fi

# Caddy (automatic HTTPS)
if ! command -v caddy >/dev/null; then
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' \
    | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' \
    | sudo tee /etc/apt/sources.list.d/caddy-stable.list
  sudo apt-get update && sudo apt-get install -y caddy
fi

sudo useradd --system --home /opt/mission-control --shell /usr/sbin/nologin \
  mission-control 2>/dev/null || true
sudo mkdir -p /opt/mission-control /var/lib/mission-control /etc/mission-control
sudo chown mission-control:mission-control /opt/mission-control /var/lib/mission-control

if [ ! -f /etc/mission-control/env ]; then
  sudo tee /etc/mission-control/env >/dev/null <<EOF
KV_PATH=/var/lib/mission-control/kv.db
ADMIN_PASSWORD=
GEMINI_API_KEY=
NVIDIA_KEY=
OPENROUTER_API_KEY=
GROQ_API_KEY=
EOF
  sudo chmod 600 /etc/mission-control/env
  echo ">> Edit /etc/mission-control/env with your real secrets."
fi

sudo cp "$(dirname "$0")/mission-control.service" \
  /etc/systemd/system/mission-control.service
sed "s/mission-control.example.com/${DOMAIN}/" "$(dirname "$0")/Caddyfile" \
  | sudo tee /etc/caddy/Caddyfile >/dev/null
sudo cp "$(dirname "$0")/backup.sh" /usr/local/bin/mission-control-backup
sudo chmod +x /usr/local/bin/mission-control-backup
echo "23 3 * * * root /usr/local/bin/mission-control-backup" \
  | sudo tee /etc/cron.d/mission-control-backup >/dev/null

sudo systemctl daemon-reload
sudo systemctl enable mission-control
sudo systemctl restart caddy
echo "Done. Next: deploy code (deploy/gcp/deploy.sh) and fill /etc/mission-control/env."
