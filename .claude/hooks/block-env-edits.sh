#!/usr/bin/env bash
# PreToolUse hook: refuse any Edit/Write that targets a .env file.
# Exit 2 = block, with the message sent to Claude as a tool error.
set -euo pipefail

file=$(jq -r '.tool_input.file_path // empty')
[[ -z "$file" ]] && exit 0

case "$(basename "$file")" in
  .env|.env.*)
    echo "Blocked: refusing to edit '$file'. Env files hold secrets and are gitignored — ask the user to edit them by hand." >&2
    exit 2
    ;;
esac

exit 0
