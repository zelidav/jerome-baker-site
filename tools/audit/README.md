# Site audit

Needs `pip install playwright && python -m playwright install chromium`.

- `python tools/audit/func.py [base_url]`: clicks through every feature (shop filters/search/sort/product/cart link, crew floaters, quiz, comics gate and motion, travel, studio auth). Prints PASS/FAIL; defaults to the live site.
- `python tools/audit/crawl.py out.json [base_url]`: every page at desktop and phone width, with console errors, broken requests, horizontal overflow, page weight, load/LCP timing and head tags.

Run against a local copy with `python -m http.server 8796` and `http://127.0.0.1:8796/`.
