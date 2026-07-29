#!/bin/bash
cd /home/z/my-project/mini-services/realtime-service
while true; do
  bun --hot index.ts >> /home/z/my-project/realtime.log 2>&1
  echo "[$(date)] Realtime crashed, restarting in 2s..." >> /home/z/my-project/realtime.log
  sleep 2
done
