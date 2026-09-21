#!/bin/bash
# linuxserver/wireguard's own default NAT rules only handle a single
# "eth0"-style egress interface. This container is deliberately
# multi-homed (enterprise = eth0, ot_dmz = eth1) so a connected player can
# reach BOTH the enterprise network (domain-auth, for LDAP recon) and the
# ot_dmz network (jump-host) through the tunnel — that forwarding/NAT and
# the peer's AllowedIPs both need patching in on top of the image's
# defaults. Backgrounded because wg0 and the peer config don't exist yet
# at custom-cont-init.d time; this waits for them without blocking the
# rest of container startup.
(
  for i in $(seq 1 60); do
    ip link show wg0 >/dev/null 2>&1 && break
    sleep 1
  done

  ROUTED_CIDRS=""
  for IFACE in eth0 eth1; do
    CIDR=$(ip -4 -o addr show "$IFACE" 2>/dev/null | awk '{print $4}')
    if [ -n "$CIDR" ]; then
      iptables -A FORWARD -i wg0 -o "$IFACE" -j ACCEPT
      iptables -A FORWARD -i "$IFACE" -o wg0 -j ACCEPT
      iptables -t nat -A POSTROUTING -o "$IFACE" -j MASQUERADE
      ROUTED_CIDRS="${ROUTED_CIDRS:+$ROUTED_CIDRS, }${CIDR}"
      echo "[lab-routing] forwarding wg0 <-> ${IFACE} (${CIDR})"
    else
      echo "[lab-routing] could not detect interface ${IFACE} — not routed"
    fi
  done

  for i in $(seq 1 60); do
    [ -f /config/peer1/peer1.conf ] && break
    sleep 1
  done

  mkdir -p /shared/vpn
  if [ -f /config/peer1/peer1.conf ]; then
    # Drop the DNS line entirely rather than trust PEERDNS=off — the image
    # writes it as the literal (invalid) "DNS = off" instead of omitting
    # it, and any DNS value at all makes wg-quick depend on resolvconf,
    # which several common distros (e.g. Kali) don't ship by default and
    # which aborts the whole `wg-quick up` if missing. The lab has nothing
    # meaningful to resolve over that DNS entry anyway.
    ALLOWED_IPS="10.13.13.0/24${ROUTED_CIDRS:+, $ROUTED_CIDRS}"
    sed "s#^AllowedIPs.*#AllowedIPs = ${ALLOWED_IPS}#" /config/peer1/peer1.conf | grep -v '^DNS' > /shared/vpn/client1.conf
    echo "[lab-routing] published client1.conf for employee-workstation (AllowedIPs: ${ALLOWED_IPS})"
  fi
) &
