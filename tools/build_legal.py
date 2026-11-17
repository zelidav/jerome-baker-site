"""Builds the policy pages (privacy/, terms/, returns/) and puts the policy links in every page footer.

The copy lives here so the three pages share one head, header and footer. Business terms come from David
(2026-11-17): seller is Green Garden NY LLC or Jerome Baker Designs; glass returnable in original packaging and
condition; breakage in shipping gets a replacement, photos may be required; no merch returns, store credit only
for a manufacturing error or breakage. Windows marked DEFAULT below were filled in by Claude and need David's OK.

Run:  python tools/build_legal.py   (then python tools/scrub.py --check)
"""
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
UPDATED = 'November 17, 2026'
EMAIL = 'info@jeromebakerny.com'

# DEFAULT values (not given by David yet)
RETURN_DAYS = 14        # glass return window, days from delivery
BREAK_DAYS = 7          # report shipping breakage within, days from delivery
MERCH_DAYS = 14         # report a merch defect within, days from delivery

PAGES = [('privacy', 'Privacy'), ('terms', 'Terms'), ('returns', 'Returns')]

MAIL = f'<a href="mailto:{EMAIL}">{EMAIL}</a>'

PRIVACY = {
    'title': 'Privacy policy',
    'lede': 'What this site collects, why, and what you can ask us to do with it. Short version: only what you type into a form, used to answer you and send what you signed up for. We do not sell it.',
    'sections': [
        ('who', 'Who we are', f'''
<p>This site, jeromebaker.cannacrypted.com, is run by Jerome Baker Designs together with Green Garden NY LLC ("Jerome Baker", "we", "us"). Questions about this policy go to {MAIL}.</p>'''),
        ('collect', 'What we collect', '''
<p>We only collect what you choose to send us through a form on this site:</p>
<ul>
<li><b>Join the JB fam:</b> first name, email, phone (if you give it), state, ZIP, what you are interested in, and whether you said yes to texts.</li>
<li><b>Contact:</b> your name, email, phone (if you give it), the topic and your message.</li>
<li><b>Wholesale:</b> your business name and type, contact name, email, phone, state, license number and message.</li>
<li><b>Feedback button:</b> your note plus the page you were on, the part of the page in view, your screen size, browser and device type, so we can find and fix what you saw. Your name is optional.</li>
</ul>
<p>We do not run advertising trackers or analytics scripts on this site, and we do not use cookies to follow you around the web.</p>'''),
        ('use', 'How we use it', '''
<ul>
<li>To answer your message, quote a custom piece or set up a wholesale account.</li>
<li>To send the drop alerts, emails and texts you signed up for.</li>
<li>To fix the site when you report something.</li>
<li>To keep records we are required to keep, and to prevent fraud and abuse.</li>
</ul>'''),
        ('texts', 'Texts', '''
<p>We only text you if you ticked the box to get texts. Expect a few a month at most: drop reminders with a link. Message and data rates may apply. Reply STOP to stop at any time, or HELP for help. Your phone number and text consent are never sold or shared with anyone for their own marketing.</p>'''),
        ('share', 'Who we share it with', '''
<p>We do not sell or rent your information. We share it only with the companies that run things for us, and only so they can do that job:</p>
<ul>
<li>Our hosting and database provider, where the forms are stored.</li>
<li>The services that send our emails and texts.</li>
<li>The customer list we use to keep track of retailers and fans.</li>
<li>Payment processors and shipping carriers, when you buy something (see below).</li>
</ul>
<p>We will also share information if the law requires it, or to protect our rights, our customers or the public.</p>'''),
        ('buying', 'When you buy', '''
<p>Glass is bought through our studio checkout and merch through our Ritual Merch store at jeromebakerny.com. Those pages collect your shipping address and payment. Card payments are handled by the payment processor; we do not store your full card number. Our order records keep what we need to ship, support and account for the order.</p>'''),
        ('third', 'Third-party content', '''
<p>The site loads its fonts from Google Fonts, which means Google sees the request from your browser. The story video only loads from YouTube when you press play. Links to Instagram and other sites go to services with their own privacy policies.</p>'''),
        ('device', 'Settings saved on your device', '''
<p>A few choices, like Lite mode or hiding the crew, are saved in your own browser so the site remembers them next time. They never leave your device, and clearing your browser data removes them.</p>'''),
        ('age', 'Adults only', '''
<p>This site is for adults 21 and over. We do not knowingly collect information from anyone under 21. If you think someone under 21 has sent us their details, tell us and we will delete them.</p>'''),
        ('rights', 'Your choices', f'''
<p>Email {MAIL} to see what we have about you, correct it, or have it deleted. Unsubscribe from emails with the link in any email, and from texts by replying STOP. We keep information only as long as we need it for the reasons above or as the law requires.</p>'''),
        ('changes', 'Changes', '''
<p>If we change this policy we will update it here and change the date at the top.</p>'''),
    ],
}

TERMS = {
    'title': 'Terms of service',
    'lede': 'The rules for using this site and buying from us. By using the site or placing an order you agree to them.',
    'sections': [
        ('who', 'Who you are dealing with', f'''
<p>This site is run by Jerome Baker Designs together with Green Garden NY LLC ("Jerome Baker", "we", "us"). The seller of each order is Green Garden NY LLC or Jerome Baker Designs, as shown on your order confirmation or receipt. Reach us at {MAIL}.</p>'''),
        ('age', 'Adults 21 and over', '''
<p>You must be 21 or older to use this site or buy from us. By using it you confirm that you are. We may ask for proof of age and may cancel an order if we cannot confirm it.</p>'''),
        ('use', 'Intended use', '''
<p class="caps"><b>Our glass is sold for use with tobacco and legal herbs only, by adults 21 and over, where it is legal.</b></p>
<p>We do not sell glass for, and do not intend it to be used with, any substance that is illegal where you are. It is your responsibility to know and follow the laws where you live and where the item is shipped. We may refuse or cancel any order we believe would break the law.</p>'''),
        ('products', 'Products, photos and prices', '''
<ul>
<li>Most of our glass is handmade and one of a kind. Colors, size and details vary from piece to piece and can look different on your screen. Small marks, bubbles and variations are part of handmade glass, not defects.</li>
<li>Prices and availability come live from the studio and can change at any time. A piece is not reserved until your order is confirmed.</li>
<li>If a price or description is wrong, or a piece sells out before we can confirm your order, we may cancel the order and refund you in full.</li>
<li>The JB Crew characters and The Hot Shop comics are fiction. The merch is real.</li>
</ul>'''),
        ('orders', 'Orders, payment and shipping', '''
<p>Your order is an offer to buy. It is accepted when we confirm it and charge your payment method. You agree to give accurate payment, shipping and contact details. Glass ships from the studio, packed for the trip; merch is made to order and ships from Ritual Merch. Delivery times are estimates.</p>'''),
        ('returns', 'Returns and breakage', '''
<p>Returns, refunds and shipping breakage are covered in our <a href="../returns/">returns policy</a>, which is part of these terms.</p>'''),
        ('warranty', 'Warranty and disclaimer', '''
<p>Other than what our returns policy promises, our products and this site are provided "as is". Glass is glass: it can break if dropped, knocked, overheated or cooled too fast, and that kind of damage after delivery is not covered.</p>
<p class="caps">To the fullest extent the law allows, we disclaim all other warranties, express or implied, including any implied warranties of merchantability, fitness for a particular purpose and non-infringement.</p>'''),
        ('liability', 'Limit of liability', '''
<p class="caps">To the fullest extent the law allows, Jerome Baker, Green Garden NY LLC, Jerome Baker Designs and their owners, artists and staff are not liable for any indirect, incidental, special or consequential damages, or for any injury or loss from the use or misuse of our products. Our total liability for any claim about an order is limited to the amount you paid for that order.</p>
<p>Some places do not allow these limits, so some of them may not apply to you.</p>'''),
        ('ip', 'Our work', '''
<p>The Jerome Baker name and marks, the artwork, glass designs, photos, characters, comics and everything else on this site belong to us or the artists we work with. You are welcome to share links and screenshots for personal, non-commercial use. Anything else needs our written OK.</p>'''),
        ('yours', 'What you send us', '''
<p>If you send us feedback, ideas or photos, you agree we can use them to improve the site and our products without owing you anything. Please do not send anything you do not want us to use.</p>'''),
        ('site', 'Using the site', '''
<p>Do not misuse the site: no scraping, attacking, overloading or trying to get into parts of it that are not public, and no using it to break the law. We can change, pause or take down any part of the site at any time.</p>'''),
        ('law', 'Law', '''
<p>These terms are governed by the laws of the State of New York, without regard to its conflict-of-laws rules. Any dispute will be handled in the state or federal courts located in New York, and you agree to their jurisdiction.</p>'''),
        ('changes', 'Changes', '''
<p>We may update these terms. The version posted here, with the date at the top, is the one that applies. Orders are governed by the terms in place when you placed them.</p>'''),
    ],
}

RETURNS = {
    'title': 'Returns and refunds',
    'lede': 'Glass comes back if it is the way it left us. Broken in the mail, we replace it. Merch is made to order, so it is store credit for our mistakes only.',
    'sections': [
        ('glass', 'Glass returns', f'''
<p>You can return glass within {RETURN_DAYS} days of delivery as long as it is unused and in its original packaging and condition.</p>
<ul>
<li>Email {MAIL} with your order number before you send anything back. We will reply with the return address and instructions.</li>
<li>Pack it the way it came. Glass that arrives back broken because it was packed badly cannot be refunded.</li>
<li>Return shipping is on you, unless we sent the wrong piece.</li>
<li>Once the piece is back and checked, we refund the price of the piece to your original payment method. Original shipping is not refunded.</li>
</ul>'''),
        ('breakage', 'Broken in shipping', f'''
<p>If glass arrives broken, we replace it.</p>
<ul>
<li>Email {MAIL} within {BREAK_DAYS} days of delivery with your order number.</li>
<li>Photos may be required: the piece, the box and the packing, before you throw anything out. Keep the packaging until we have sorted it out, in case the carrier needs to see it.</li>
<li>Most of our glass is one of a kind. If the exact piece cannot be made again, we will work with you on a comparable piece or refund it.</li>
</ul>'''),
        ('merch', 'Merch', f'''
<p>Ritual Merch is printed to order, so we cannot take merch back for size, color or a change of mind. Check sizes before you order.</p>
<p>If merch arrives with a manufacturing error (wrong item, misprint, flaw) or damaged in shipping, email {MAIL} within {MERCH_DAYS} days of delivery with your order number and a photo, and we will give you store credit for it.</p>'''),
        ('final', 'Not returnable', '''
<ul>
<li>Glass that has been used, or is not in its original packaging and condition.</li>
<li>Merch, other than store credit for a manufacturing error or breakage as above.</li>
</ul>'''),
        ('warranty', 'Warranty', '''
<p>Our promise is the one on this page: we stand behind the piece arriving as described and in one piece. Damage after delivery, like drops, knocks or heat and cold shock, is not covered. See our <a href="../terms/">terms</a> for the full warranty disclaimer.</p>'''),
        ('contact', 'Questions', f'''
<div class="box"><p>Anything not covered here, or a problem with an order: {MAIL}. Include your order number and we will sort it out.</p></div>'''),
    ],
}

DOCS = {'privacy': PRIVACY, 'terms': TERMS, 'returns': RETURNS}

FOOT_LINKS = lambda up: ('<nav class="sf-policy" aria-label="Policies">'
                         + ''.join(f'<a href="{up}{k}/">{t}</a>' for k, t in
                                   [('privacy', 'Privacy policy'), ('terms', 'Terms of service'), ('returns', 'Returns and refunds')])
                         + '</nav>')


def page(key):
    d = DOCS[key]
    src = (ROOT / 'story' / 'index.html').read_text(encoding='utf-8')
    head_end = src.index('<link rel="stylesheet" href="../css/story.css">')
    head = src[:head_end] + '<link rel="stylesheet" href="../css/legal.css">\n</head>\n'
    head = re.sub(r'<title>.*?</title>', f'<title>{d["title"].capitalize()}. Jerome Baker</title>', head)
    desc = d['lede'].replace('"', '&quot;')
    head = re.sub(r'<meta name="description" content="[^"]*">', f'<meta name="description" content="{desc}">', head)
    head = re.sub(r'<meta property="og:title" content="[^"]*">', f'<meta property="og:title" content="{d["title"].capitalize()}. Jerome Baker">', head)
    head = re.sub(r'<meta property="og:description" content="[^"]*">', f'<meta property="og:description" content="{desc}">', head)
    lines = src.splitlines()
    header = next(l for l in lines if l.startswith('<header class="topbar'))
    header = header.replace(' aria-current="page"', '')
    foot = next(l for l in lines if l.startswith('<!-- FOOT -->'))
    tabs = ''.join(f'<a href="../{k}/"{" aria-current=\"page\"" if k == key else ""}>{t}</a>' for k, t in PAGES)
    toc = ''.join(f'<li><a href="#{sid}">{h}</a></li>' for sid, h, _ in d['sections'])
    body = ''.join(f'<h2 id="{sid}">{h}</h2>{html.strip()}\n' for sid, h, html in d['sections'])
    return f'''{head}<body>
<a class="skip" href="#main">Skip to content</a>
<div class="page" id="page">
<div class="ticker" aria-hidden="true"><div class="marq"><span>STRAIGHT ANSWERS ✱ ADULTS 21+ ✱ HAND PULLED SINCE 1991 ✱ ONE OF ONE ✱ </span><span>STRAIGHT ANSWERS ✱ ADULTS 21+ ✱ HAND PULLED SINCE 1991 ✱ ONE OF ONE ✱ </span></div></div>
{header}

<main id="main">
<section class="lg-hero pad">
<div class="wrap">
<p class="kicker">THE FINE PRINT</p>
<h1>{d["title"].capitalize()}</h1>
<p>{d["lede"]}</p>
<p class="upd">LAST UPDATED {UPDATED.upper()}</p>
<nav class="lg-tabs" aria-label="Policies">{tabs}</nav>
</div>
</section>
<section class="lg-body pad">
<div class="wrap">
<nav class="lg-toc" aria-label="On this page"><b>ON THIS PAGE</b><ol>{toc}</ol></nav>
<article class="lg-doc">
{body}</article>
</div>
</section>
</main>

{foot}
</div>
<script src="../js/dock.js" defer></script>
<script src="../js/feedback.js" defer></script>
</body>
</html>
'''


def footers():
    """Add the policy links under the legal line of every page footer (idempotent)."""
    n = 0
    for f in ROOT.rglob('index.html'):
        rel = f.relative_to(ROOT)
        if rel.parts[0] in ('node_modules', 'assets', 'dev', 'docs', 'src'):
            continue
        s = f.read_text(encoding='utf-8')
        if 'class="sf-legal"' not in s and 'class="sfoot' not in s:   # site footer, or the shop's own footer
            continue
        up = '../' * (len(rel.parts) - 1)
        s2 = re.sub(r'<nav class="sf-policy".*?</nav>', '', s)
        s2 = re.sub(r'(<p class="(?:sf-legal|legal)">.*?</p>)', lambda m: m.group(1) + FOOT_LINKS(up), s2, count=1, flags=re.S)
        if s2 != s:
            f.write_bytes(s2.encode('utf-8'))
            n += 1
    return n


if __name__ == '__main__':
    for k in DOCS:
        out = ROOT / k / 'index.html'
        out.parent.mkdir(exist_ok=True)
        out.write_bytes(page(k).encode('utf-8'))
    print('pages written; footers updated:', footers())
