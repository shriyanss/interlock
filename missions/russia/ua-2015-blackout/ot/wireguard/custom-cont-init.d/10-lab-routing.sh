#!/bin/bash
# linuxserver/wireguard's own default NAT rules only handle a single
# "eth0"-style egress interface. This container is deliberately
# multi-homed (enterprise = eth0, ot_dmz = eth1) so a connected player can
# be routed from the VPN tunnel into the ot_dmz network where jump-host
# lives — that forwarding/NAT and the peer's AllowedIPs both need patching
# in on top of the image's defaults. Backgrounded because wg0 and the peer
# config don't exist yet at custom-cont-init.d time; this waits for them
# without blocking the rest of container startup.
(
  for i in $(seq 1 60); do
    ip link show wg0 >/dev/null 2>&1 && break
    sleep 1
  done

  OT_DMZ_CIDR=$(ip -4 -o addr show eth1 2>/dev/null | awk '{print $4}')
  if [ -n "$OT_DMZ_CIDR" ]; then
    iptables -A FORWARD -i wg0 -o eth1 -j ACCEPT
    iptables -A FORWARD -i eth1 -o wg0 -j ACCEPT
    iptables -t nat -A POSTROUTING -o eth1 -j MASQUERADE
    echo "[lab-routing] forwarding wg0 <-> eth1 (ot_dmz: ${OT_DMZ_CIDR})"
  else
    echo "[lab-routing] could not detect ot_dmz interface (eth1) — routing into ot_dmz not configured"
  fi

  for i in $(seq 1 60); do
    [ -f /config/peer1/peer1.conf ] && break
    sleep 1
  done

  mkdir -p /shared/vpn
  if [ -f /config/peer1/peer1.conf ]; then
    if [ -n "$OT_DMZ_CIDR" ]; then
      sed "s#^AllowedIPs.*#AllowedIPs = 10.13.13.0/24, ${OT_DMZ_CIDR}#" /config/peer1/peer1.conf > /shared/vpn/client1.conf
    else
      cp /config/peer1/peer1.conf /shared/vpn/client1.conf
    fi
    echo "[lab-routing] published client1.conf for employee-workstation"
  fi
) &
