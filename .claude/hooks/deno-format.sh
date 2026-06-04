#!/usr/bin/env bash
# PostToolUse hook: run `deno fmt` + `deno lint` on the edited file.
# Silent on success so it doesn't spam the conversation; errors go to stderr.
set -euo pipefail

file=$(jq -r '.tool_input.file_path // empty')
[[ -z "$file" ]] && exit 0

case "$file" in
  *.ts|*.tsx) ;;
  *) exit 0 ;;
esac

# Only operate on files inside this repo.
[[ "$file" == "$CLAUDE_PROJECT_DIR"/* ]] || exit 0

# Run from the project root so deno picks up deno.json (lint rules, exclusions).
cd "$CLAUDE_PROJECT_DIR"

# Fmt: rewrites in place. Failure here means the file has unparseable syntax —
# surface that to Claude so it can fix it instead of moving on.
if ! deno fmt "$file" >/dev/null 2>&1; then
  echo "deno fmt failed on $file" >&2
  exit 2
fi

# Lint: reports issues but doesn't rewrite. Surface findings non-fatally so
# Claude sees them and can decide whether to address now.
deno lint "$file" 2>&1 || true
