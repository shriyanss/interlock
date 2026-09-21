#!/bin/bash
# Guided-mode hook: reports the player's first successful interactive SSH
# login as ops.admin ("gained OT access") back to mission-controller,
# instead of a human describing the pivot over chat. Runs early in
# container init, before ops.admin's home directory necessarily exists —
# waits for it in the background rather than blocking startup.
#
# ops.admin's home in linuxserver/openssh-server is /config, NOT
# /home/ops.admin (verified via /etc/passwd — don't assume the obvious
# path). Appended to .bashrc, .bash_profile, and .profile all three:
# SSH starts a login shell, which reads .bash_profile/.profile, not
# .bashrc, but which of those exists (or whether .bash_profile sources
# .bashrc) isn't guaranteed on a minimal image, so cover all three —
# the snippet's own marker-file check keeps it a no-op after the first.
(
  [ -z "$SESSION_ID" ] && exit 0

  HOME_DIR=/config
  for i in $(seq 1 60); do
    [ -d "$HOME_DIR" ] && break
    sleep 1
  done
  [ -d "$HOME_DIR" ] || exit 0

  MARKER="$HOME_DIR/.interlock-login-hook-installed"
  [ -f "$MARKER" ] && exit 0

  # SSH login shells don't inherit the container's own docker-compose
  # environment — CONTROLLER_URL/SESSION_ID are only visible to this init
  # script's own process right now, so their values are baked into the
  # snippet literally (unquoted heredoc) rather than referenced by name.
  SNIPPET=$(cat <<HOOK

# INTERLOCK guided-mode hook — reports first interactive login, once.
if [ ! -f "\$HOME/.interlock-login-reported" ]; then
  touch "\$HOME/.interlock-login-reported"
  curl -s -X POST "${CONTROLLER_URL}/sessions/${SESSION_ID}/events" \\
    -H 'content-type: application/json' \\
    -d '{"type":"ot-access-achieved"}' >/dev/null 2>&1 &
fi
HOOK
)

  for rc in .bashrc .bash_profile .profile; do
    echo "$SNIPPET" >> "$HOME_DIR/$rc"
  done

  touch "$MARKER"
  echo "[login-hook] installed guided-mode login hook for ops.admin at $HOME_DIR"
) &
