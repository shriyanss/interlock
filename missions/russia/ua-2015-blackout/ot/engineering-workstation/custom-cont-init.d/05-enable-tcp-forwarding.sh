#!/bin/bash
# linuxserver/openssh-server ships AllowTcpForwarding disabled by default
# (hardened baseline). The mission's HMI pivot step relies on `ssh -L` to
# reach the control network from the player's own machine, so it needs to
# be explicitly re-enabled — this runs before sshd starts.
#
# sshd actually reads /config/sshd/sshd_config at runtime (confirmed via
# `ps aux` showing `sshd ... -f /config/sshd/sshd_config`), NOT
# /etc/ssh/sshd_config — patching the latter (tried first) had no effect
# on live behavior. /config has no persistent volume in this compose file
# so it's regenerated fresh from the image's baked-in default every
# container start; patch both files defensively in case that changes.
for CONF in /etc/ssh/sshd_config /config/sshd/sshd_config; do
  [ -f "$CONF" ] || continue
  sed -i 's/^AllowTcpForwarding no/AllowTcpForwarding yes/' "$CONF"
  sed -i 's/^GatewayPorts no/GatewayPorts yes/' "$CONF"
done
echo "[enable-tcp-forwarding] AllowTcpForwarding/GatewayPorts enabled for the HMI pivot step"
