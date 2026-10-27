#!/usr/bin/env bash
# Build locally and ship to the VM.   Usage: deploy/gcp/deploy.sh <ssh-host>
set -euo pipefail
HOST="${1:?usage: deploy.sh <ssh-host>}"

deno task build
# Fresh 2 prod server imports main.ts + islands from source (see _fresh/server.js).
tar czf /tmp/mission-control-build.tgz \
  _fresh deno.json deno.lock static \
  main.ts utils.ts islands components data lib routes
scp /tmp/mission-control-build.tgz "$HOST:/tmp/"
ssh "$HOST" 'sudo tar xzf /tmp/mission-control-build.tgz -C /opt/mission-control \
  && sudo chown -R mission-control:mission-control /opt/mission-control \
  && sudo systemctl restart mission-control && sleep 2 && systemctl is-active mission-control'
