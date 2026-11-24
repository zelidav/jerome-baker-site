#!/usr/bin/env python3
"""Cutover checker for the new Jerome Baker site. Standard library only.

  python netlify/tools/check.py redirects BASE   every exact rule in _redirects.cutover: right status, right target, target answers 200 (one hop)
  python netlify/tools/check.py links BASE       every internal link and image on the key pages answers 200, and the shopping paths work
  python netlify/tools/check.py all BASE

BASE is the deploy to test, e.g. https://deploy-preview-1--jb-new.netlify.app  (never needs DNS).
Exit code 1 if anything fails, so it can gate the DNS switch. Writes netlify/tools/last-report.txt.
"""
import re, sys, urllib.request, urllib.error, urllib.parse, concurrent.futures as cf
from html.parser import HTMLParser
from pathlib import Path

HERE = Path(__file__).resolve().parent
RULES = HERE.parent / "_redirects.cutover"
KEY_PAGES = ["/", "/glass/", "/shop/", "/crew/", "/wholesale/", "/contact/", "/story/", "/story/tour/", "/travel/", "/comics/", "/privacy/", "/terms/", "/returns/", "/404.html", "/robots.txt", "/sitemap.xml",
             "/glass/bongs/", "/glass/studio/", "/glass/dab-rigs/", "/glass/accessories/", "/glass/tommy-chong/", "/glass/calumets/", "/glass/limited-edition/",
             "/glass/original-series/", "/glass/everyday/", "/glass/spirit-creatures/", "/glass/tubes/", "/glass/pipes/", "/glass/second-life/"]
# the shopping spine: if any of these break, do not cut over
SHOPPING = ["/glass/", "/shop/", "/wholesale/", "/contact/", "/returns/"]
UA = {"User-Agent": "jb-cutover-checker/1.0"}


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *a, **k):
        return None


OPENER = urllib.request.build_opener(NoRedirect)


def hit(url, method="GET"):
    """Return (status, location, body) without following redirects. One retry on a network error or 5xx."""
    r = _hit(url, method)
    return r if r[0] not in (0, 500, 502, 503, 504) else _hit(url, method)


def _hit(url, method):
    req = urllib.request.Request(url, headers=UA, method=method)
    try:
        with OPENER.open(req, timeout=25) as r:
            return r.status, r.headers.get("Location"), (r.read() if method == "GET" else b"")
    except urllib.error.HTTPError as e:
        return e.code, e.headers.get("Location"), b""
    except Exception as e:  # network
        return 0, str(e), b""


def load_rules():
    out = []
    for line in RULES.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        p = line.split()
        out.append((p[0], p[1], int(p[2].rstrip("!")) if len(p) > 2 else 301))
    return out


def norm_target(t, base):
    return urllib.parse.urljoin(base + "/", t) if t.startswith("/") else t


def check_redirects(base):
    rules = [r for r in load_rules() if not r[0].startswith("http") and not re.search(r"[:*]", r[0])]
    fails = []

    def one(r):
        src, dst, code = r
        st, loc, _ = hit(base + src)
        if st != code:
            return f"{src}: wanted {code}, got {st}"
        want = norm_target(dst, base)
        got = norm_target(loc or "", base)
        if got.rstrip("/") != want.rstrip("/"):
            return f"{src}: wanted -> {dst}, got -> {loc}"
        if dst.startswith("/"):
            st2, _, _ = hit(base + dst, "HEAD")
            if st2 != 200:
                return f"{src} -> {dst}: target answers {st2} (a second hop or a 404)"
        return None

    with cf.ThreadPoolExecutor(16) as ex:
        for res in ex.map(one, rules):
            if res:
                fails.append(res)
    # pattern rules: one synthetic sample each
    samples = [("/collections/x/products/y", "/products/y"), ("/posts/anything", "/news/"), ("/collections/zzz-not-real", "/glass/"), ("/products/zzz-not-real", "/glass/")]
    for src, dst in samples:
        st, loc, _ = hit(base + src)
        if st not in (301, 302) or norm_target(loc or "", base).rstrip("/") != norm_target(dst, base).rstrip("/"):
            fails.append(f"pattern {src}: wanted 301 -> {dst}, got {st} -> {loc}")
    print(f"redirects: {len(rules)} exact rules + {len(samples)} pattern samples, {len(fails)} failed")
    return fails


class Links(HTMLParser):
    def __init__(self):
        super().__init__()
        self.found = set()

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        for k in ("href", "src"):
            v = a.get(k)
            if v and not v.startswith(("#", "mailto:", "tel:", "javascript:", "data:")):
                self.found.add(v)


def check_links(base):
    fails, seen = [], set()
    host = urllib.parse.urlparse(base).netloc
    for page in KEY_PAGES:
        st, _, body = hit(base + page)
        if st != 200:
            fails.append(f"PAGE {page}: {st}" + ("  <-- SHOPPING" if page in SHOPPING else ""))
            continue
        text = body.decode("utf-8", "replace")
        if "noindex" in text and host in ("jeromebaker.com", "www.jeromebaker.com") and page not in ("/404.html",):
            fails.append(f"NOINDEX on live host: {page}")
        p = Links()
        p.feed(text)
        for v in p.found:
            u = urllib.parse.urljoin(base + page, v).split("#")[0]
            if urllib.parse.urlparse(u).netloc == host:
                seen.add((u, page))
    urls = {}
    for u, page in seen:
        urls.setdefault(u, page)

    def one(item):
        u, page = item
        st, loc, _ = hit(u, "HEAD")
        if st in (405, 403):
            st, loc, _ = hit(u)
        return None if st == 200 else f"{u}  ({st})  linked from {page}"

    with cf.ThreadPoolExecutor(16) as ex:
        for res in ex.map(one, urls.items()):
            if res:
                fails.append(res)
    print(f"links: {len(KEY_PAGES)} pages, {len(urls)} internal links/assets, {len(fails)} failed")
    return fails


def main():
    if len(sys.argv) != 3 or sys.argv[1] not in ("redirects", "links", "all"):
        sys.exit(__doc__)
    mode, base = sys.argv[1], sys.argv[2].rstrip("/")
    fails = []
    if mode in ("redirects", "all"):
        fails += check_redirects(base)
    if mode in ("links", "all"):
        fails += check_links(base)
    (HERE / "last-report.txt").write_text(f"{base}\n" + ("\n".join(fails) or "ALL PASS") + "\n", encoding="utf-8")
    print("\n".join(fails[:60]) if fails else "ALL PASS")
    if len(fails) > 60:
        print(f"... and {len(fails) - 60} more, see netlify/tools/last-report.txt")
    sys.exit(1 if fails else 0)


if __name__ == "__main__":
    main()
