#!/usr/bin/env bash

base_ref="${1:-HEAD^}"
head_ref="${2:-HEAD}"

git diff --quiet "$base_ref" "$head_ref" -- \
  apps/web \
  package.json \
  pnpm-lock.yaml \
  pnpm-workspace.yaml \
  patches \
  vercel.json \
  scripts/vercel-ignore-build.sh \
  .vercelignore
result=$?

if [ "$result" -eq 0 ]; then
  echo "No frontend build inputs changed; skipping build."
  exit 0
fi

if [ "$result" -eq 1 ]; then
  echo "Frontend build inputs changed; proceeding with build."
  exit 1
fi

echo "Unable to compare commits; proceeding with build."
exit 1
