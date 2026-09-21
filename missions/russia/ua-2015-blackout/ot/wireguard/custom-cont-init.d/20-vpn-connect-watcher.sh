#!/bin/bash
# Guided-mode hook: reports the first successful WireGuard handshake back
# to mission-controller as a real detected event, rather than a human
# describing "I connected the VPN" over chat. Backgrounded and one-shot —
# stops polling as soon as it fires once.
(
  [ -z "$SESSION_ID" ] && exit 0

  for i in $(seq 1 60); do
    ip link show wg0 >/dev/null 2>&1 && break
    sleep 1
  done

  while true; do
    HANDSHAKE=$(wg show wg0 latest-handshakes 2>/dev/null | awk '{print $2}')
    if [ -n "$HANDSHAKE" ] && [ "$HANDSHAKE" != "0" ]; then
      curl -s -X POST "${CONTROLLER_URL}/sessions/${SESSION_ID}/events" \
        -H 'content-type: application/json' \
        -d '{"type":"vpn-connected"}' >/dev/null 2>&1
      echo "[vpn-connect-watcher] reported vpn-connected"
      break
    fi
    sleep 3
  done
) &
