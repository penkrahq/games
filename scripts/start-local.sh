#!/bin/zsh
set -e
SCRIPT_DIR="${0:A:h}"
cd "$SCRIPT_DIR/.."
export PORT="${PORT:-4173}"
exec /Users/emmanuelgyekyeatta-penkra/.nvm/versions/node/v24.19.0/bin/node dist/server/apps/server/src/index.js
