// Lab-only fake "employee portal" reproducing the CONCEPT of the 2015
// spear-phishing/macro compromise. No real Office document or macro ever
// exists — "opening the attachment" is a narrative UI action.
const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 8080;
const CONTROLLER_URL = process.env.CONTROLLER_URL || "http://mission-controller:4000";
const SESSION_ID = process.env.SESSION_ID || "";
const VPN_CLIENT_PATH = "/shared/vpn/client1.conf";

const LAYOUT = (title, body) => `<!doctype html>
<html><head><meta charset="utf-8"><title>${title}</title>
<style>
  body { background:#e8e8e8; font-family: Tahoma, Arial, sans-serif; color:#222; margin:0; }
  .titlebar { background:#003366; color:white; padding:10px 16px; font-weight:bold; }
  .content { padding:24px; max-width:700px; margin:0 auto; }
  a { color:#0645ad; }
  .email { background:white; border:1px solid #bbb; padding:16px; margin-top:16px; }
  .warn { background:#fff3cd; border:1px solid #ffeeba; padding:12px; margin-top:16px; }
  .creds { background:#111; color:#0f0; font-family: monospace; padding:12px; margin-top:12px; }
</style></head>
<body>
  <div class="titlebar">Oblenergo Internal Employee Portal</div>
  <div class="content">${body}</div>
</body></html>`;

app.get("/", (req, res) => {
  res.send(
    LAYOUT(
      "Employee Portal",
      `<h2>Welcome</h2>
       <p><a href="/inbox">Inbox (1 unread)</a></p>
       <p style="color:#888;font-size:12px">INTERLOCK lab — this is a synthetic environment. No real employee, document, or macro exists here.</p>`,
    ),
  );
});

app.get("/inbox", (req, res) => {
  res.send(
    LAYOUT(
      "Inbox",
      `<h2>Inbox</h2>
       <div class="email">
         <b>From:</b> it-security@rada-gov-support.example<br>
         <b>Subject:</b> Important Security Update — Action Required<br>
         <p>Please review the attached document and confirm your credentials are up to date.</p>
         <p><a href="/attachment">📎 security_update.docx</a></p>
       </div>`,
    ),
  );
});

app.get("/attachment", async (req, res) => {
  let vpnAvailable = fs.existsSync(VPN_CLIENT_PATH);

  if (SESSION_ID) {
    fetch(`${CONTROLLER_URL}/sessions/${SESSION_ID}/events`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ type: "initial-access-achieved" }),
    }).catch(() => {});
  }

  res.send(
    LAYOUT(
      "Document Opened",
      `<h2>security_update.docx</h2>
       <div class="warn">
         <b>[LAB SIMULATION]</b> In the real 2015 incident, opening a macro-enabled
         attachment like this silently installed the BlackEnergy3 backdoor. No macro
         or executable runs here — this page stands in for that step.
       </div>
       <p>Background process "helpfully" cached your saved credentials to a local file the malware could read:</p>
       <div class="creds">
         ldap user: phished.employee<br>
         ldap pass: Summer2015!<br>
       </div>
       <p style="margin-top:16px">${
         vpnAvailable
           ? '<a href="/vpn-client">Download cached VPN client config (client1.conf)</a>'
           : "VPN client config not yet provisioned by the lab — try again shortly."
       }</p>`,
    ),
  );
});

app.get("/vpn-client", (req, res) => {
  if (!fs.existsSync(VPN_CLIENT_PATH)) return res.status(404).send("not ready yet");
  res.download(VPN_CLIENT_PATH, "client1.conf");
});

app.listen(PORT, () => console.log(`employee-workstation listening on ${PORT}`));
