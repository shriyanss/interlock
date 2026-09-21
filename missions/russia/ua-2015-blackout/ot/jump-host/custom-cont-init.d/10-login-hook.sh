#!/bin/bash
# Guided-mode hook: reports the player's first successful interactive SSH
# login as ops.admin ("gained OT access") back to mission-controller,
# instead of a human describing the pivot over chat. Runs early in
# container init, before the ops.admin home directory necessarily exists —
# waits for it in the background rather than blocking startup.
(
  [ -z "$SESSION_ID" ] && exit 0

  for i in $(seq 1 60); do
    [ -d /home/ops.admin ] && break
    sleep 1
  done
  [ -d /home/ops.admin ] || exit 0

  MARKER="/home/ops.admin/.interlock-login-hook-installed"
  [ -f "$MARKER" ] && exit 0

  # SSH login shells don't inherit the container's own docker-compose
  # environment — CONTROLLER_URL/SESSION_ID are only visible to this init
  # script's own process right now, so their values are baked into the
  # snippet literally (unquoted heredoc) rather than referenced by name.
  cat >> /home/ops.admin/.bashrc <<HOOK

# INTERLOCK guided-mode hook — reports first interactive login, once.
if [ ! -f "\$HOME/.interlock-login-reported" ]; then
  touch "\$HOME/.interlock-login-reported"
  curl -s -X POST "${CONTROLLER_URL}/sessions/${SESSION_ID}/events" \\
    -H 'content-type: application/json' \\
    -d '{"type":"ot-access-achieved"}' >/dev/null 2>&1 &
fi
HOOK

  touch "$MARKER"
  echo "[login-hook] installed guided-mode login hook for ops.admin"
) &
