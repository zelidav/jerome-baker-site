"""Site rule: words that get a page flagged (ad networks, payment processors, social link scanners) are written
with a number or symbol swapped in: b0ng, p!pe, sm0ke, tr!pping, w33d, c@nnabis... Visible copy only: page text,
alt/title/aria-label text, page titles and share descriptions, and the prose strings in the data and page scripts.
Links, file names, slugs, CSS classes and code are left alone. js/popfx.js gives the swapped characters a little
graffiti tilt so they read as the look, not as typos.

Run it after any copy change (the build scripts call it at the end):  python tools/scrub.py
Check without writing:                                                python tools/scrub.py --check
"""
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

# (pattern, function that swaps the characters). Each pattern is matched case-insensitively as a whole word;
# the swap keeps the original capitals around the swapped character.
def at(i, ch):
    return lambda w: w[:i] + ch + w[i + 1:]


def sub_in(part, i, ch):
    # swap character i of the first occurrence of `part` inside the word (for compounds like blowpipe)
    def f(w):
        k = w.lower().find(part)
        return w if k < 0 else w[:k + i] + ch + w[k + i + 1:]
    return f


RULES = [
    (r'bongs?', at(1, '0')),
    (r'(?:blow)?pipes?', sub_in('pipe', 1, '!')),
    (r'smok(?:e|es|ed|er|ers|ing|ey|y|in)', at(2, '0')),
    (r'tripp(?:ing|in|y|ier|iest)', at(2, '!')),
    (r'weeds?', lambda w: w[0] + '33' + w[3:]),
    (r'cannabis', at(1, '@')),
    (r'marijuana', at(1, '@')),
    (r'ston(?:ed|er|ers)', at(2, '0')),
    (r'joints?', at(1, '0')),
    (r'blunts?', at(2, '*')),
    (r'narcotics?', at(1, '@')),
    (r'psychedelics?', at(5, '3')),
    (r'mushrooms?', at(2, '$')),
    (r'acid', at(0, '@')),
    (r'tok(?:e|es|ed|ing)', at(1, '0')),
    (r'baked', at(1, '@')),
    (r'hash', at(1, '@')),
    (r'bowls?', at(1, '0')),
    (r'rolling papers?', at(1, '0')),
    (r'(?:get|gets|getting|got|so|stay|feel|feeling) high', lambda w: w[:-3] + '!' + w[-2:]),
    (r'kush', at(1, '*')),
    (r'spliffs?', at(3, '!')),
    (r'dabs?|dabbing', at(1, '@')),
    (r'vap(?:e|es|ing|or|ors)', at(1, '@')),
    (r'edibles?', at(0, '3')),
    (r'dispensar(?:y|ies)', at(1, '!')),
    (r'drugs?', at(2, '*')),
    (r'dope', at(1, '0')),
    (r'ganja', at(1, '@')),
    (r'stash(?:es)?', at(0, '$')),
]
# no swap when the word is glued to code or a path: .hash, slug-bongs, file_pipe, /smoke/, smoke( , key: , #hash
BEFORE_BAD = set('.#-_/\\=$@')
AFTER_BAD = set('-_/\\(=')
WORDS = re.compile(r'(?<![A-Za-z0-9])(' + '|'.join(p for p, _ in RULES) + r')(?![A-Za-z0-9])', re.I)
FIXERS = [(re.compile(r'^(?:' + p + r')$', re.I), f) for p, f in RULES]


def swap_word(m, text):
    w = m.group(1)
    s, e = m.start(1), m.end(1)
    before = text[s - 1] if s > 0 else ' '
    after = text[e] if e < len(text) else ' '
    # a dash only means slug when it joins two words (polo-crossed-bongs); "Bongs- Green" is a name
    if before in BEFORE_BAD and not (before == '-' and (s < 2 or not text[s - 2].isalnum())):
        return w
    if after in AFTER_BAD and not (after == '-' and (e + 1 >= len(text) or not text[e + 1].isalnum())):
        return w
    if text[e:e + 5] in ('.webp', '.html', '.png', '.jpg', '.svg') or text[e:e + 3] == '.js':
        return w
    for rx, f in FIXERS:
        if rx.match(w):
            return f(w)
    return w


def prose(text):
    return WORDS.sub(lambda m: swap_word(m, text), text)


def js_prose(code):
    """Swap only inside prose: a quoted string or comment run that has spaces in it (sentences, names, labels).
    Single-token strings ('smoke', 'pointerdown') and code outside strings are never touched."""
    out, i, n = [], 0, len(code)
    while i < n:
        c = code[i]
        if c in '\'"`':
            j, buf = i + 1, []
            while j < n and code[j] != c:
                if code[j] == '\\':
                    buf.append(code[j:j + 2]); j += 2; continue
                if c != '`' and code[j] == '\n':
                    break
                buf.append(code[j]); j += 1
            body = ''.join(buf)
            mark = (lambda t: html(t)) if '<' in body else prose  # markup in a string: swap text, never class names
            if j < n and code[j] == c and ' ' in body and '${' not in body:
                out.append(c + mark(body) + c)
            elif j < n and code[j] == c and c == '`' and ' ' in body:
                # template: swap the literal parts, leave ${...} alone
                parts = re.split(r'(\$\{[^}]*\})', body)
                out.append('`' + ''.join(p if p.startswith('${') else mark(p) for p in parts) + '`')
            else:
                out.append(code[i:j + 1])
            i = j + 1
            continue
        if code.startswith('//', i):
            j = code.find('\n', i)
            j = n if j < 0 else j
            out.append(prose(code[i:j])); i = j; continue
        if code.startswith('/*', i):
            j = code.find('*/', i + 2)
            j = n if j < 0 else j + 2
            out.append(prose(code[i:j])); i = j; continue
        out.append(c); i += 1
    return ''.join(out)


ATTRS = re.compile(r'''(\b(?:alt|title|aria-label|placeholder|data-text)=)(["'])(.*?)\2''', re.S)
META = re.compile(r'''(<meta\b[^>]*\b(?:name|property)=["'](?:description|og:title|og:description|twitter:title|twitter:description)["'][^>]*\bcontent=)(["'])(.*?)\2''', re.I | re.S)
META2 = re.compile(r'''(<meta\b[^>]*\bcontent=)(["'])(.*?)\2([^>]*\b(?:name|property)=["'](?:description|og:title|og:description|twitter:title|twitter:description)["'])''', re.I | re.S)


def html(doc):
    out = []
    for part in re.split(r'(<script\b[^>]*>.*?</script>|<style\b[^>]*>.*?</style>|<[^>]+>)', doc, flags=re.S | re.I):
        if not part:
            continue
        low = part[:7].lower()
        if low.startswith('<script'):
            k = part.find('>') + 1
            if 'src=' in part[:k] or 'application/ld+json' in part[:k] and False:
                out.append(part)
            else:
                out.append(part[:k] + js_prose(part[k:-9]) + part[-9:])
        elif low.startswith('<style'):
            out.append(part)
        elif part.startswith('<'):
            t = ATTRS.sub(lambda m: m.group(1) + m.group(2) + prose(m.group(3)) + m.group(2), part)
            t = META.sub(lambda m: m.group(1) + m.group(2) + prose(m.group(3)) + m.group(2), t)
            t = META2.sub(lambda m: m.group(1) + m.group(2) + prose(m.group(3)) + m.group(2) + m.group(4), t)
            out.append(t)
        else:
            out.append(prose(part))
    return ''.join(out)


SKIP_DIRS = {'.git', 'node_modules', 'tools', '.studio', 'assets'}
SKIP_FILES = {'holo.js'}  # the 3D engine bundle


def files():
    for p in ROOT.rglob('*'):
        if p.is_dir() or set(p.relative_to(ROOT).parts) & SKIP_DIRS or p.name in SKIP_FILES:
            continue
        if p.suffix in ('.html', '.js'):
            yield p


def main(check=False):
    changed = []
    for p in files():
        src = p.read_text(encoding='utf-8')
        new = html(src) if p.suffix == '.html' else js_prose(src)
        if new != src:
            changed.append(p.relative_to(ROOT).as_posix())
            if not check:
                p.write_text(new, encoding='utf-8', newline='')
    print(('would change' if check else 'scrubbed'), len(changed), 'files')
    for c in changed:
        print('  ', c)
    return changed


if __name__ == '__main__':
    main(check='--check' in sys.argv)
