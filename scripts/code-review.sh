#!/bin/sh
# ---------------------------------------------------------------------------
# Headless Claude Code review of the STAGED diff. Advisory only — always exits 0
# so it can never block a commit (see .githooks/pre-commit).
#
# Standalone use:   deno task review        (reviews staged changes)
# Skip:             SKIP_REVIEW=1 git commit ...
# Guidelines:       docs/code-review-guidelines.md
# ---------------------------------------------------------------------------
[ "${SKIP_REVIEW:-0}" = "1" ] && exit 0

if ! command -v claude >/dev/null 2>&1; then
  echo "  claude CLI not found on PATH — skipping advisory review."
  exit 0
fi

# Only review when TypeScript/TSX or data is actually staged.
CHANGED=$(git diff --cached --name-only --diff-filter=ACM -- '*.ts' '*.tsx' 'data/*' 2>/dev/null)
if [ -z "$CHANGED" ]; then
  exit 0
fi

PROMPT="You are doing a headless pre-commit code review for the kerala-gov-mission-control \
repo. Read docs/code-review-guidelines.md and CLAUDE.md, then review ONLY the staged diff \
(\`git diff --cached\`). Report concrete, high-signal findings against the project guidelines: \
data defensibility (every figure has a government source + sourceUrl), SEED_VERSION bumped when \
a fixture changed, bilingual *Ml parity, no machine-translated Malayalam, type-safety, and \
correctness. Be concise: list findings as 'file:line — issue' with severity, or say 'No blocking \
issues.' Do not edit files. This review is advisory."

echo "  Running headless Claude review of staged changes (advisory)…"
# --permission-mode plan keeps the session read-only (no edits/commands applied).
claude -p "$PROMPT" --permission-mode plan 2>/dev/null || \
  echo "  (Claude review unavailable — advisory only, commit proceeds.)"

exit 0
