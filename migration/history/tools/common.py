"""Shared helpers for the Wayback harvest: polite fetch, eras, state."""
import json, time, urllib.request, urllib.error, pathlib
UA = "JB-history-harvest/1.0 (david@canismajorpartners.com)"
ROOT = pathlib.Path(__file__).resolve().parents[1]
STATE = ROOT / "state.json"
_last = [0.0]
BACKOFF = [90, 300, 900]

def era_of(ts):
    ym = ts[:6]
    if ym <= "200302": return "1998-original"
    if ym <= "200512": return "2003-seizure"
    if ym <= "200712": return "2006-decks"
    if "201301" <= ym <= "201605": return "2013-squatter"
    if "201606" <= ym <= "202209": return "2016-custom"
    return "other"

def get(url, binary=False, timeout=90):
    """One request at a time, >=1s apart, backoff on 429/503. Returns bytes/str or None."""
    for attempt in range(len(BACKOFF) + 1):
        wait = 1.05 - (time.time() - _last[0])
        if wait > 0: time.sleep(wait)
        _last[0] = time.time()
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA})
            with urllib.request.urlopen(req, timeout=timeout) as r:
                data = r.read()
            return data if binary else data.decode("utf-8", "replace")
        except urllib.error.HTTPError as e:
            if e.code in (429, 503) and attempt < len(BACKOFF):
                print(f"  {e.code}; sleeping {BACKOFF[attempt]}s", flush=True)
                time.sleep(BACKOFF[attempt]); continue
            if e.code in (404, 403, 400, 410): return None
            if attempt < len(BACKOFF):
                time.sleep(BACKOFF[attempt]); continue
            return None
        except Exception as e:
            if attempt < len(BACKOFF):
                print(f"  {type(e).__name__}; sleeping {BACKOFF[attempt]}s", flush=True)
                time.sleep(BACKOFF[attempt]); continue
            return None

def load_state():
    return json.loads(STATE.read_text()) if STATE.exists() else {}
def save_state(s):
    STATE.write_text(json.dumps(s, indent=1))
