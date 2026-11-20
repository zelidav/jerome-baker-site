import json, re, hashlib, urllib.parse
from common import *
KW = ("about","burnt","post","gallery","press","story","bakercast","nft","bitcoin")
SKIP16 = ("/product/","/product-category/","/shop","/cart","/my-account","/checkout","wp-login","wp-json","wp-admin","wp-cron","xmlrpc","feed","/tag/","/category/")
rows = [json.loads(l) for l in (ROOT/"cdx_all.jsonl").read_text().splitlines()]

def path_of(u):
    p = urllib.parse.urlsplit(u); path = p.path or "/"
    if path.endswith("/"): path += "index.html"
    path = re.sub(r'[<>:"|?*\\]', "_", path).lstrip("/")
    if p.query: 
        h = hashlib.md5(p.query.encode()).hexdigest()[:6]; b, _, e = path.rpartition("."); path = f"{b or path}__q{h}" + (f".{e}" if b else "")
    return "/".join(s[:80] for s in path.split("/"))

def cat(r):
    m = (r["mimetype"] or "").lower(); u = r["original"].lower(); L = int(r["length"] or 0)
    if "html" in m: return 0
    if m.startswith("image"): return 1 if L > 10000 else 4
    if "flash" in m or u.endswith((".swf",".pdf")): return 2
    if "css" in m or "javascript" in m: return 3
    return 5

def wanted(r):
    if r["statuscode"] != "200" or r["era"] == "other": return False
    u = r["original"].lower(); p = urllib.parse.urlsplit(u).path
    if p.endswith("robots.txt"): return False
    if r["era"] == "2013-squatter":
        return p in ("", "/") or "name.aspx" in p
    if r["era"] == "2016-custom":
        if p in ("", "/"): return True
        if any(s in u for s in SKIP16): return False
        return cat(r) in (1,3,4) or any(k in u for k in KW)
    return cat(r) != 5 or r["mimetype"] not in ("warc/revisit","unk","-")

todo = sorted([r for r in rows if wanted(r)], key=lambda r: (r["era"] != "1998-original", r["era"] != "2003-seizure", cat(r), r["timestamp"]))
print("planned", len(todo), flush=True)
st = load_state(); done = st.setdefault("downloaded", {}); failed = st.setdefault("failed", {})
cat_rows = []
for i, r in enumerate(todo):
    dest = ROOT/"wayback"/r["era"]/"raw"/r["timestamp"]/path_of(r["original"])
    key = f'{r["timestamp"]}|{r["original"]}'
    if key in done and dest.exists(): continue
    data = get(f'https://web.archive.org/web/{r["timestamp"]}id_/{r["original"]}', binary=True)
    if data is None: failed[key] = "fail"; print("FAIL", key, flush=True)
    else:
        dest.parent.mkdir(parents=True, exist_ok=True); dest.write_bytes(data)
        done[key] = len(data); failed.pop(key, None)
    if i % 25 == 0: save_state(st); print(i, "/", len(todo), flush=True)
save_state(st); print("DONE", len(done), "ok", len(failed), "failed", flush=True)
