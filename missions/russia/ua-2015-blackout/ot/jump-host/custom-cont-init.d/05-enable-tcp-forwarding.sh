#!/bin/bash
# linuxserver/openssh-server ships AllowTcpForwarding disabled by default
# (hardened baseline). The mission's HMI pivot step relies on `ssh -L` to
# reach the control network from the player's own machine, so it needs to
# be explicitly re-enabled — this runs before sshd starts.
sed -i 's/^AllowTcpForwarding no/AllowTcpForwarding yes/' /etc/ssh/sshd_config
sed -i 's/^GatewayPorts no/GatewayPorts yes/' /etc/ssh/sshd_config
echo "[enable-tcp-forwarding] AllowTcpForwarding/GatewayPorts enabled for the HMI pivot step"
