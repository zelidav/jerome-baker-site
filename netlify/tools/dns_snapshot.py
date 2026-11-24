#!/usr/bin/env python3
"""READ-ONLY. Saves every GoDaddy DNS record for a domain to JSON, so a rollback is "put these back".

Usage:  python netlify/tools/dns_snapshot.py jeromebaker.com netlify/dns-backups/
Credentials come from the local credential vault (slug godaddy-jb), never from the command line or a file.
Never changes DNS. Run it right before any DNS edit and commit the JSON it writes.
"""
import json, os, subprocess, sys, time, urllib.request

VAULT = r"C:\Users\zelid\credvault\credvault.ps1"


def vault(field):
    return subprocess.run(
        ["powershell", "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", VAULT, "get", "-Service", "godaddy-jb", "-Field", field],
        capture_output=True, text=True, check=True).stdout.strip()


dom, out = sys.argv[1], sys.argv[2]
key, secret = vault("username"), vault("password")
req = urllib.request.Request(f"https://api.godaddy.com/v1/domains/{dom}/records",
                             headers={"Authorization": f"sso-key {key}:{secret}", "Accept": "application/json"})
recs = json.load(urllib.request.urlopen(req, timeout=30))
os.makedirs(out, exist_ok=True)
path = os.path.join(out, f"{dom}-{time.strftime('%Y-%m-%d-%H%M')}.json")
json.dump(recs, open(path, "w"), indent=1)
print(len(recs), "records ->", path)
for r in recs:
    print(f"{r['type']:6} {r['name']:20} {r['data']}  ttl={r['ttl']}")
