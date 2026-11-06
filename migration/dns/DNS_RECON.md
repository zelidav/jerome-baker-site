# DNS recon: jeromebaker.com (+ jeromebakerny.com, jeromebaker.shop)

Read-only. Captured 2026-11-06 ~00:10 ET. Nothing was changed anywhere.

Method: `dnspython` against Google/Cloudflare public resolvers (8.8.8.8, 1.1.1.1), then re-queried
each zone's authoritative GoDaddy nameserver for true TTLs (the TTLs below are authoritative).
WHOIS via RDAP (Verisign for .com, GMO Registry for .shop). Homepage fetched once with curl.

---

## 1. jeromebaker.com

| Record | Value | TTL |
|---|---|---|
| NS | `ns51.domaincontrol.com`, `ns52.domaincontrol.com` (**GoDaddy DNS**) | 3600 |
| SOA | `ns51.domaincontrol.com. dns.jomax.net. 2026110500 28800 7200 604800 600` | 600 |
| A (root) | `23.227.38.32` | 3600 |
| AAAA (root) | none | — |
| CNAME (www) | `jerome-baker-designs.myshopify.com.` → which itself CNAMEs to `shops.myshopify.com.` | 3600 |
| A (www, via chain) | `23.227.38.74` | 3600 |
| AAAA (www, via chain) | `2620:127:f00f:e::` | 3600 |
| MX | `1 aspmx.l.google.com`, `5 alt1.aspmx.l.google.com`, `5 alt2.aspmx.l.google.com`, `10 alt3.aspmx.l.google.com`, `10 alt4.aspmx.l.google.com` (**Google Workspace mail**) | 3600 |
| CAA | none | — |
| `_dmarc` TXT | `"v=DMARC1; p=none;"` | 3600 |
| `_domainconnect` | CNAME → `_domainconnect.gd.domaincontrol.com` (GoDaddy Domain Connect) | 3600 |

**Every TXT record on the root, verbatim (TTL 3600):**

```
"google-site-verification=u_NIOTIVoLQI0gKyQiO1GF6KCLMtnKgYtj7VC19k9n4"
"google-site-verification=GIqv72VFdYrmk67AoZkpGQJjipw8oXddf8DcWJMFeMc"
"v=spf1 include:dc-aa8e722993._spfm.jeromebaker.com include:51196248.spf03.hubspotemail.net ~all"
```

- 2 × `google-site-verification` (Search Console and/or Workspace).
- **No** `ahrefs-site-verification`, **no** `facebook-domain-verification`, no Shopify TXT, no MS/Bing, no Pinterest.
- SPF includes HubSpot portal **51196248** (the JB HubSpot) plus a GoDaddy-managed SPF macro (`dc-aa8e722993._spfm`).

**Plainly:**
- **Root A → Shopify? YES.** `23.227.38.32` is Shopify's storefront IP (23.227.38.x range).
- **www → `shops.myshopify.com`? Not directly.** www is a CNAME to `jerome-baker-designs.myshopify.com`, which
  then CNAMEs to `shops.myshopify.com`. End result is the same (Shopify serves it); it's just the older
  store-specific CNAME style. Shopify's current recommended setup is www → `shops.myshopify.com` direct.
- Note: SOA serial is `2026110500`, i.e. **the zone was edited on 2026-11-05** (yesterday). Worth asking who touched it.

### WHOIS (RDAP)

| | |
|---|---|
| Registrar | **GoDaddy.com, LLC** |
| Created | 2012-04-18 |
| Expires | **2027-04-18** |
| Last changed | 2024-04-19 |
| Nameservers | NS51 / NS52.DOMAINCONTROL.COM |
| Status | client delete / renew / transfer / update prohibited (normal registrar lock) |

### GoDaddy API access

The key in `~/jbd-glass/godaddy_dns.py` **authenticates fine** (it lists 398 domains in David's GoDaddy
account), but **it can NOT read this zone**:

- `GET /v1/domains/jeromebaker.com/records` → `403 ACCESS_DENIED`
- `GET /v1/domains/jeromebaker.com` → `404 Domain not found for shopper`

**Answer: NO.** jeromebaker.com lives in a *different* GoDaddy account (the JB / Jason side), not the one
this API key belongs to. None of the three JB domains are in David's account.

---

## 2. jeromebakerny.com

| Record | Value | TTL |
|---|---|---|
| NS | `ns65.domaincontrol.com`, `ns66.domaincontrol.com` (GoDaddy DNS) | 3600 |
| SOA | `ns65.domaincontrol.com. dns.jomax.net. 2026110301 28800 7200 604800 600` | 3600 |
| A (root) | `141.193.213.10`, `141.193.213.11` (**WP Engine** — the Dopestr WordPress/Woo store) | 600 |
| AAAA | none | — |
| www | no CNAME; A records `141.193.213.10/.11` (same WP Engine) | 600 |
| MX | Google Workspace (same 5 aspmx hosts) | 3600 |
| `_dmarc` | `"v=DMARC1; p=quarantine; adkim=r; aspf=r; rua=mailto:dmarc_rua@onsecureserver.net;"` | 3600 |
| `_domainconnect` | CNAME → GoDaddy Domain Connect | 3600 |

TXT on root, verbatim:

```
"google-site-verification=9bCyxFuHW0oyo-8F12t-acmqLWNOs1CBYDhfykyRyXc"
"v=spf1 include:dc-aa8e722993._spfm.jeromebakerny.com ~all"
```

WHOIS: GoDaddy.com, LLC · created 2026-03-31 · expires **2027-03-31** · NS65/66.DOMAINCONTROL.COM · registrar-locked.
GoDaddy API: records `403`, domain `404` → **not in David's GoDaddy account either.**

---

## 3. jeromebaker.shop

| Record | Value | TTL |
|---|---|---|
| NS | `ns25.domaincontrol.com`, `ns26.domaincontrol.com` (GoDaddy DNS) | 3600 |
| SOA | `ns25.domaincontrol.com. dns.jomax.net. 2023081400 28800 7200 604800 600` (untouched since Aug 2023) | 3600 |
| A (root) | `23.227.38.32` (**Shopify**) | 600 |
| www | CNAME → `jeromebaker.shop.` (→ 23.227.38.32) | 3600 |
| AAAA / MX / TXT / CAA / DMARC | none (no mail, no verification tokens at all) | — |

WHOIS: GoDaddy.com LLC · created 2019-12-20 · expires **2027-12-20** · NS25/26.DOMAINCONTROL.COM · registrar-locked.
GoDaddy API: records `403`, domain `404` → **not in David's GoDaddy account.**

---

## 4. Homepage `<head>` check (https://jeromebaker.com/)

Fetched once: `200`, 153,881 bytes, served by Shopify.

- **google-site-verification meta tag: YES, one:**
  `<meta name="google-site-verification" content="pEoLZP4ktOTDFQ-ckxXggmqFeS9IJCwdRcgn2uDlJsw">`
  This token is **different from both DNS tokens**, so some Search Console property (or user) is verified
  *only* by the theme tag. **That verification dies at cutover** unless it's re-verified by DNS first.
- **ahrefs-site-verification meta tag: NO.**
- No facebook-domain-verification, Bing (`msvalidate`), Pinterest (`p:domain_verify`) or Yandex tags either.

---

## 5. Summary

1. **DNS host:** GoDaddy DNS (domaincontrol.com) for all three domains.
2. **Registrar:** GoDaddy for all three; expiries 2027-04-18 (.com), 2027-03-31 (ny.com), 2027-12-20 (.shop).
3. **Shopify-pointed:** jeromebaker.com yes (root A 23.227.38.32; www → jerome-baker-designs.myshopify.com → shops.myshopify.com). jeromebaker.shop yes. jeromebakerny.com no (WP Engine).
4. **Verification tokens found:** jeromebaker.com DNS has 2 google-site-verification (`u_NIOTIV…`, `GIqv72VF…`); theme has a 3rd (`pEoLZP4k…`) that will die at cutover. jeromebakerny.com has 1 Google token. No Ahrefs/Facebook/Bing anywhere.
5. **To add a TXT record:** the API key here can't touch these zones — they're in a different GoDaddy account. Either (a) log into *that* GoDaddy account → DNS → Add TXT, or (b) have its owner create an API key in that account (or add David as a delegate with DNS rights) so we can do it by API.
