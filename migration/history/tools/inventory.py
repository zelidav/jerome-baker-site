import json, csv, sys, urllib.parse
from common import *
FL = "urlkey,timestamp,original,mimetype,statuscode,digest,length"
rows = []
for target in ("jeromebaker.com", "www.jeromebaker.com"):
    key = None; page = 0
    while True:
        q = {"url": target, "matchType": "prefix", "output": "json", "fl": FL,
             "from": "1998", "to": "20220930", "collapse": "digest",
             "limit": "5000", "showResumeKey": "true"}
        if key: q["resumeKey"] = key
        body = get("https://web.archive.org/cdx/search/cdx?" + urllib.parse.urlencode(q))
        if body is None: print("FAILED page", target, page); break
        data = json.loads(body) if body.strip() else []
        key = None
        if data and data[0][0] == "urlkey": data = data[1:]
        # resume key arrives as [] then [key]
        if len(data) >= 2 and data[-2] == []: key = data[-1][0]; data = data[:-2]
        rows += [dict(zip(FL.split(","), r)) for r in data if r]
        print(target, "page", page, "rows", len(data), flush=True); page += 1
        if not key: break
seen = set(); out = []
for r in rows:
    k = (r["timestamp"], r["original"], r["digest"])
    if k in seen: continue
    seen.add(k); r["era"] = era_of(r["timestamp"]); out.append(r)
out.sort(key=lambda r: (r["timestamp"], r["original"]))
(ROOT/"cdx_all.jsonl").write_text("\n".join(json.dumps(r) for r in out))
with open(ROOT/"cdx_inventory.csv", "w", newline="") as f:
    w = csv.DictWriter(f, ["era","url","timestamp","mimetype","status","digest","length"]); w.writeheader()
    for r in out: w.writerow({"era":r["era"],"url":r["original"],"timestamp":r["timestamp"],"mimetype":r["mimetype"],"status":r["statuscode"],"digest":r["digest"],"length":r["length"]})
print("total", len(out))
