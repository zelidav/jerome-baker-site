#!/usr/bin/env python3
"""Puts <script defer src="/js/analytics.js"></script> before </head> on every page (idempotent).
Run after adding pages:  python tools/build_analytics.py   (--check to list pages missing it)"""
import re, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
TAG = '<script defer src="/js/analytics.js"></script>'
SKIP = {'.git', 'node_modules', 'dist', 'tools', 'assets', 'dev'}


def pages():
    for p in ROOT.rglob('*.html'):
        if set(p.relative_to(ROOT).parts[:-1]) & SKIP:
            continue
        yield p


def main(check=False):
    missing = []
    for p in pages():
        s = p.read_text(encoding='utf-8')
        if 'js/analytics.js' in s:
            continue
        missing.append(p.relative_to(ROOT).as_posix())
        if not check:
            new, n = re.subn(r'</head>', TAG + '\n</head>', s, count=1, flags=re.I)
            if n:
                p.write_text(new, encoding='utf-8', newline='')
    print(('missing' if check else 'tagged'), len(missing), 'pages')
    for m in missing:
        print('  ', m)


if __name__ == '__main__':
    main('--check' in sys.argv)
