#!/bin/bash
while true; do
  bun run dev 2>&1
  echo "[RESTART] $(date)"
  sleep 2
done
