#!/usr/bin/env bash
# Stellt sicher, dass Tests und Linter in einer frischen Web-Session laufen können.
set -euo pipefail
cd "$(dirname "$0")/../.."

if [ ! -d node_modules ]; then
  echo "Installiere Abhängigkeiten …"
  npm ci --no-audit --no-fund
fi
