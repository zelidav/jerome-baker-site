"""Site-side product copy for Ritual Merch: Jerome Baker language for the merch whose store description is blank
or a flat store template ("A Jerome Baker towel featuring the Indica drop artwork. Part of the NY Drop 1
collection..."). build_shop.py applies it after pulling the live catalogs, so a rebuild keeps it. Nothing here
writes to WooCommerce or Shopify; the store copy stays as it is.

Keyed by product id (Woo id, or Shopify id for the jeromebaker.com items). Every fact in the old store copy and the
product attributes is kept (material, fit, print vs embroidery, which drop, "this release cycle only"); the art
details come from the product photos. Write it in the site's voice: short, a little weird, glass-shop streetwear,
the crew wears it. Flaggable words go through tools/scrub.py on the way out, so plain spellings get swapped too.

Check what still reads flat:  python tools/shop_copy.py
"""
import re

# The three drop arts, as the photos show them:
#   Indica: legs in heels and fishnets on a teal-blue ground; solid colorway is red; red/orange/gold script
#   Hybrid: luchador masks in pink, teal and yellow; solid colorway is deep blue; green script
#   Sativa: pop-art pin-up faces in sunglasses on bold reds; solid colorway is golden yellow; purple script
COPY = {
    # ---- Classic tees, NY Drop 1 (two listings per style: black tee and white tee)
    7622: "The Indica script, red and gold and loud, on a black tee. Soft ringspun cotton, comfortable everyday fit, nothing fussy. DJ Rivets wears this one behind the decks and has never played the same set twice in it. NY Drop 1, available for this release cycle only.",
    914: "Same Indica drop art, white tee this time, so the hot red and orange script has nowhere to hide. Ringspun cotton, soft from the first wear, cut for an easy everyday fit. Part of NY Drop 1 and only around for this release cycle.",
    7570: "The Hybrid script in green and teal, popping off a black tee like it got beamed in. Beamer wears his to cow pickups. Soft ringspun cotton, comfortable everyday fit. NY Drop 1, available for this release cycle only.",
    1018: "Green Hybrid script on clean white, crossed B0ngs up top, EST. 1991 underneath. Reads from across the room and still looks right at the bodega at 2 a.m. Soft ringspun cotton with a comfortable everyday fit. Part of NY Drop 1, this release cycle only.",
    7498: "The Sativa script in deep purple and cream, stamped on black. Mr. X wears it for tree pose on a mushroom, which tells you how soft the ringspun cotton is. Comfortable everyday fit. NY Drop 1, gone after this release cycle.",
    862: "Purple Sativa script with the crossed B0ngs up top, on a white tee. The day-shift shirt. Soft ringspun cotton, comfortable everyday fit, the name in big letters. Part of NY Drop 1, here for this release cycle only.",

    # ---- Bandeau bikinis
    7485: "Golden yellow bandeau bikini with the Jerome Baker logo printed all over in a tonal pattern you only catch up close. The Sativa color: sunny, a little loud, made for the beach. NY Drop 1, available for this release cycle only.",
    7472: "Indica red, top and bottom, with the Jerome Baker logo printed all over it. A bandeau that reads like a stop sign from the lifeguard chair. Part of NY Drop 1, available for this release cycle only.",
    7459: "Deep blue bandeau bikini with an all-over Jerome Baker logo print, tone on tone. The Hybrid colorway, the cool one of the three. Cold water color, hot weather plans. NY Drop 1, here for this release cycle only.",
    7413: "The Indica art on a bandeau bikini: legs in heels and fishnets kicking across a teal-blue ground. Pin-up on top, pin-up on the bottom, beach-ready all over. Part of NY Drop 1, this release cycle only.",
    7374: "Luchador masks in pink, teal and yellow, wrestling for space on a bandeau bikini. The Hybrid art, and easily the loudest thing on the sand. NY Drop 1, available for this release cycle only.",
    7361: "Pop-art pin-up faces in big sunglasses, stacked in bold reds across a bandeau bikini. The Sativa art. Every one of them is looking at you, and most of them approve. NY Drop 1, for this release cycle only.",

    # ---- Leggings
    7448: "Deep blue leggings, waist to ankle, with the Jerome Baker logo printed all over in tone. The Hybrid colorway: reads solid from across the street, turns into a pattern up close. Part of NY Drop 1, available for this release cycle only.",
    7299: "Indica red leggings with an all-over Jerome Baker logo print. One color, waist to ankle, zero chance of blending in at the gym, the bodega or the back of the show. NY Drop 1, here for this release cycle only.",
    7347: "Luchador masks running the full length of the leg. The Hybrid art, pink, teal and yellow, on leggings for people who walk into a room like it's a ring. Part of NY Drop 1, this release cycle only.",
    7340: "Pop-art pin-up faces in sunglasses, piled up from hip to ankle. The Sativa art on Jerome Baker leggings, bright, crowded and a little nosy. Part of NY Drop 1, available for this release cycle only.",
    7292: "Legs on your legs. The Indica art, heels and fishnets kicking across a teal-blue ground, printed head to toe on Jerome Baker leggings. It's a joke and it works. NY Drop 1, here for this release cycle only.",

    # ---- Stainless steel water bottles with a straw lid
    # 7446 and 7444 are titled Indica in the store but the photos show the Hybrid art, so the copy names neither.
    7446: "Stainless steel water bottle with a straw lid, finished in deep blue with the green Jerome Baker script up front and the logo printed all over. Sip, don't unscrew. Part of NY Drop 1, available for this release cycle only.",
    7440: "Indica red, all over, on a stainless steel water bottle with a straw lid. The Jerome Baker logo repeats around it in print and the drop script sits up front. Sip through the straw, keep moving. NY Drop 1, this release cycle only.",
    7436: "Golden yellow stainless steel water bottle with a straw lid and an all-over Jerome Baker logo print, purple Sativa script front and center. Bench water for long days at the torch. NY Drop 1, available for this release cycle only.",
    7444: "Luchador masks wrapped all the way around a stainless steel water bottle with a straw lid. Pink, teal and yellow, script logo up front. Keeps your hands busy between rounds. Part of NY Drop 1, here for this release cycle only.",
    7442: "The Indica art on stainless steel: legs in heels and fishnets dancing around a teal-blue bottle, straw lid on top. Glass-shop hydration with a pin-up problem. NY Drop 1, available for this release cycle only.",
    7438: "Pop-art faces in sunglasses wrap a stainless steel water bottle with a straw lid. The Sativa art, bold reds and a lot of attitude, with the purple script somewhere in the middle of the crowd. NY Drop 1, this release cycle only.",

    # ---- Reversible bucket hats, NY Drop 1
    7431: "The Hybrid art on a reversible bucket: luchador masks in pink, teal and yellow. Mama Cobra wears it to stay incognito. It is not incognito. Flip it inside out for a different look. NY Drop 1, available for this release cycle only.",
    7426: "Pop-art pin-up faces in sunglasses on a reversible bucket hat. Lunar Larry took the space helmet off and kept this. Wear it on either side and change your mind halfway through the day. NY Drop 1, this release cycle only.",
    7387: "Legs in heels and fishnets all around the brim and crown, the Indica art on a teal-blue ground. Reversible, so you get two looks out of one bucket. Part of NY Drop 1, available for this release cycle only.",
    7287: "Indica red bucket hat with an all-over Jerome Baker logo print and the drop script up front. Reversible: flip it for a different look when the red gets too loud. Part of NY Drop 1, here for this release cycle only.",
    7282: "Deep blue reversible bucket with the green Hybrid script on the front and the Jerome Baker logo printed all over. Turn it inside out and it's a whole other hat. NY Drop 1, this release cycle only.",
    7277: "Golden yellow reversible bucket hat, all-over Jerome Baker logo print, purple Sativa script front and center. Sun on one side, a different look on the other. Part of NY Drop 1, available for this release cycle only.",

    # ---- Cotton crop tops
    7406: "Cotton crop top in Indica red with the Jerome Baker logo printed all over in tone. Simple from far away, a whole pattern up close, JB tag at the neck. Part of NY Drop 1, here for this release cycle only.",
    7399: "Golden yellow cotton crop top with an all-over Jerome Baker logo print. The Sativa color, bright enough to find you at the back of the show. Part of NY Drop 1, available for this release cycle only.",
    7392: "Deep blue cotton crop top, all-over Jerome Baker logo print, JB tag at the neck. The Hybrid colorway and the calm one of the three, which is saying something for this drop. NY Drop 1, this release cycle only.",
    7354: "Pop-art pin-up faces in sunglasses on a cotton crop top. Gutterball wears it rolling down lane six so his belly can breathe. The Sativa art, bold reds, zero chill. NY Drop 1, available for this release cycle only.",
    7333: "The Indica art on a cotton crop top: legs in heels and fishnets kicking across a teal-blue ground. Cabaret up top, whatever you want below. Part of NY Drop 1, here for this release cycle only.",
    7326: "Luchador masks in pink, teal and yellow, crowded onto a cotton crop top. The Hybrid art, for a night out that might turn into a match. Part of NY Drop 1, available for this release cycle only.",

    # ---- Men's board shorts
    7263: "Deep blue men's board shorts with the Jerome Baker logo printed all over, tone on tone. The Hybrid colorway. Looks plain from the parking lot, gets interesting up close. NY Drop 1, available for this release cycle only.",
    7247: "Indica red board shorts for men, all-over Jerome Baker logo print. Lifeguard red with glass-shop attitude, easy to spot from the boardwalk. Part of NY Drop 1, here for this release cycle only.",
    7192: "Golden yellow men's board shorts with an all-over Jerome Baker logo print. The Sativa color, basically a sunrise you can swim in. Part of NY Drop 1, available for this release cycle only.",
    7220: "Pop-art pin-up faces in sunglasses, big and loud on men's board shorts. Crude wears these to surf a wave of oil because he read somewhere that's what you do. The Sativa art. NY Drop 1, this release cycle only.",
    7206: "The Indica art on men's board shorts: legs in heels and fishnets on a teal-blue ground. Weird enough for the boardwalk, New York enough for Rockaway. Part of NY Drop 1, here for this release cycle only.",
    7178: "Luchador masks crowd every inch of these men's board shorts in pink, teal and yellow. The Hybrid art. Walk into the water like it's your entrance music. NY Drop 1, available for this release cycle only.",

    # ---- Stainless steel water bottles
    7175: "Black stainless steel water bottle with the green Hybrid script and the crossed B0ngs on the front. Clean and simple, goes to the studio and comes home again. Part of NY Drop 1, available for this release cycle only.",
    7172: "The Indica script in red, orange and gold on a black stainless steel water bottle. Looks like a sticker slapped on a toolbox, which is the point. NY Drop 1, here for this release cycle only.",
    7154: "Black stainless steel water bottle with the Sativa script in purple and cream. Fill it at the bench, forget it in the car, find it again next week. Part of NY Drop 1, this release cycle only.",

    # ---- Mugs with color inside
    7143: "Ceramic mug with color inside and the purple Sativa script on the front, EST. 1991 underneath. Morning coffee, glass-shop edition. Part of NY Drop 1, available for this release cycle only.",
    7132: "The green Hybrid script on a ceramic mug with color inside. Holds coffee, tea, or the pens nobody ever gives back. EST. 1991 tucked under the logo, the year the torch first lit. Part of NY Drop 1, here for this release cycle only.",
    7121: "Ceramic mug with color inside, the Indica script in red and gold on the front. Made for the slow mornings after the late nights at the bench, when the kiln is still warm. NY Drop 1, available for this release cycle only.",

    # ---- Towels (30x60 or 36x72)
    7117: "Pop-art pin-up faces in sunglasses across the whole towel, the Sativa art edge to edge with the script logo at one end. Two sizes, 30×60 and 36×72. Lay it down and the beach gets louder. NY Drop 1, available for this release cycle only.",
    7053: "Indica red towel with an all-over Jerome Baker logo print and the drop script at one end. Comes in 30×60 or 36×72. Easy to find on a crowded beach. Part of NY Drop 1, here for this release cycle only.",
    7045: "Deep blue towel, all-over Jerome Baker logo print, green Hybrid script at the end. 30×60 or 36×72. Pool, beach, or the floor after a long day at the torch. NY Drop 1, this release cycle only.",
    7041: "The Indica art at towel size: legs in heels and fishnets kicking across a teal-blue ground. Pick 30×60 or 36×72. A pin-up beach towel with a glass-shop sense of humor. NY Drop 1, available for this release cycle only.",
    7037: "Golden yellow towel with the Jerome Baker logo printed all over and the purple Sativa script at one end. Two sizes, 30×60 and 36×72. Basically a patch of sun you can fold. Part of NY Drop 1, here for this release cycle only.",
    7033: "Luchador masks in pink, teal and yellow, wall to wall on a towel. The Hybrid art, in 30×60 or 36×72. Dry off like you just won the belt. NY Drop 1, available for this release cycle only.",

    # ---- Backpacks
    1542: "The Indica art on a backpack: legs in heels and fishnets on a teal-blue ground, script logo down low. Carries your stuff and starts conversations on the train. Part of NY Drop 1, available for this release cycle only.",
    1501: "Deep blue backpack with the Jerome Baker logo printed all over in tone. The Hybrid colorway. Plain enough for the commute, JB enough for everywhere else. NY Drop 1, here for this release cycle only.",
    1302: "Luchador masks all over a backpack, pink, teal and yellow. DJ Rivets keeps his spare antennas in this one, and the records, and a snack. The Hybrid art. NY Drop 1, available for this release cycle only.",
    1298: "Indica red backpack with an all-over Jerome Baker logo print. Red enough to spot across the terminal, quiet enough up close to read as a pattern. Part of NY Drop 1, this release cycle only.",
    1296: "Pop-art pin-up faces in sunglasses, stacked all over a backpack. The Sativa art in bold reds, basically a whole crowd riding on your back. Every one of them has an opinion about where you're going. NY Drop 1, here for this release cycle only.",
    1294: "Golden yellow backpack with the Jerome Baker logo printed all over it. The Sativa color: bright, easy, and very hard to leave behind somewhere. Part of NY Drop 1, available for this release cycle only.",

    # ---- JB Signature bucket hats (embroidered)
    1310: "Black bucket hat with the Jerome Baker script embroidered in red across the front. Sticky Ricky wears his low while he flips honeycomb, so don't talk to him. Part of the Jerome Baker Ritual Collection.",
    1308: "The Jerome Baker script, embroidered in green on a black bucket hat. Lookie Lou says the brim keeps the glare off while the whole porthole crew watches your cursor. Part of the Jerome Baker Ritual Collection.",
    1306: "Black bucket hat with the Jerome Baker script embroidered in yellow. The studio's signature, stitched in thread instead of pulled in glass, and a lot easier to wear. Part of the Jerome Baker Ritual Collection.",

    # ---- JB Signature tees (printed on the chest)
    1122: "White tee with the Jerome Baker script printed across the chest in green. Soft ringspun cotton, comfortable everyday fit. The plain-spoken one in the lineup: the name, the color, done. Part of the Jerome Baker Ritual Collection.",
    1070: "The Jerome Baker script in red, printed across the chest of a white tee. Dr. Squint wears it with the loudest pants in New York. Soft ringspun cotton, comfortable everyday fit. Part of the Jerome Baker Ritual Collection.",
    966: "Yellow script, white tee. Classic, says Gourdo, and he lights his own way, so he'd know. The Jerome Baker logo printed on the chest, soft ringspun cotton, comfortable everyday fit. Part of the Jerome Baker Ritual Collection.",

    # ---- JB Signature hoodies
    852: "Black hoodie with the Jerome Baker logo running down the sleeve. Big Stitch wears it with his pinky out and will tell you the hoodie is evidence of nothing. The signature sleeve hit, part of the Jerome Baker Ritual Collection.",
    824: "Signature hoodie with the Jerome Baker logo embroidered in green on the chest. Torch wears his at the bench, hood down, because fire code. Black or white. Part of the Jerome Baker Ritual Collection.",

    # ---- Polos (embroidered)
    720: "The green Crossed B0ngs polo, logo embroidered on the chest. Mouthy wears it to look professional, which mostly works until it starts talking. Black or white. Part of the Jerome Baker Ritual Collection.",
    696: "The yellow Crossed B0ngs polo, logo embroidered on the chest. Lil' Lucky calls it the management polo and expects you to respect it, even while the ice cream melts. Black or white. Part of the Jerome Baker Ritual Collection.",
    672: "The red Crossed B0ngs polo, logo embroidered on the chest. Sticky Ricky keeps his tucked in at the grill and calls the crossed b0ngs tasteful. Black or white. Part of the Jerome Baker Ritual Collection.",
    586: "Polo with the Jerome Baker script embroidered in green on the chest. Collar up or collar down, it's still the name off the glass, stitched small and clean. Black or white. Part of the Jerome Baker Ritual Collection.",

    # ---- Flip flops
    667: "Pop-art pin-up faces in sunglasses on a pair of flip flops. Ocho owns four, which he says is the correct ratio for eight arms. The Sativa art, bold reds underfoot. NY Drop 1, available for this release cycle only.",
    662: "Legs in heels and fishnets on a teal-blue ground, under your feet. The Indica art on flip flops, which is the most relaxed a pin-up has ever been. Part of NY Drop 1, here for this release cycle only.",
    400: "Golden yellow flip flops with the Jerome Baker logo printed all over and a script patch at the heel. The Sativa color, sand-ready and easy to spot by the door. Part of NY Drop 1, this release cycle only.",
    389: "Deep blue flip flops, all-over Jerome Baker logo print, script patch at the heel. The Hybrid colorway, for boardwalks, backyards and the walk to the corner store. NY Drop 1, available for this release cycle only.",
    378: "Luchador masks in pink, teal and yellow on a pair of flip flops. Beamer says flip flops are universal, and he's been around. The Hybrid art. Part of NY Drop 1, here for this release cycle only.",
    356: "Indica red flip flops with the Jerome Baker logo printed all over and a script patch at the heel. Bright, easy, made for slapping down the boardwalk. Part of NY Drop 1, this release cycle only.",

    # ---- High tops (canvas)
    308: "Men's canvas high tops in golden yellow with an all-over Jerome Baker logo print and a flash of the Sativa pin-up art at the toe. Lace up, walk around, get asked about them. NY Drop 1, available for this release cycle only.",
    290: "Women's canvas high tops in Sativa gold with the Jerome Baker logo printed all over and a peek of the pin-up art at the toe. Bright from every angle, white laces, white soles. Part of NY Drop 1, here for this release cycle only.",
    272: "The Sativa art on women's canvas high tops: pop-art faces in sunglasses wrapped around the whole shoe. Speedbump wears four of these and swears they make him faster. NY Drop 1, this release cycle only.",
    252: "Men's canvas high tops covered in pop-art pin-up faces with sunglasses. Lunar Larry juggles these upside down in zero gravity for the cardio. The Sativa art, bold reds, white laces. NY Drop 1, available for this release cycle only.",
    231: "The Indica art on men's canvas high tops: legs in heels and fishnets on a teal-blue ground. Chomps learned the kickflip in these in a week and never stopped grinning. Part of NY Drop 1, here for this release cycle only.",
    210: "Deep blue men's canvas high tops with an all-over Jerome Baker logo print and the luchador art flashing at the toe. The Hybrid colorway. Quiet shoe, loud secret. NY Drop 1, this release cycle only.",
    192: "Luchador masks in pink, teal and yellow, all over a pair of women's canvas high tops. The Hybrid art. Lace them up and make an entrance, ropes optional. Part of NY Drop 1, available for this release cycle only.",
    174: "Women's canvas high tops in deep blue with the Jerome Baker logo printed all over. The Hybrid colorway, with a little luchador at the toe for anyone looking down. NY Drop 1, here for this release cycle only.",
    154: "Indica red men's canvas high tops with an all-over Jerome Baker logo print and the drop art showing up at the toe. Red from heel to laces, hard to miss on a subway platform. NY Drop 1, this release cycle only.",
    135: "Women's canvas high tops in Indica red with an all-over Jerome Baker logo print. The heels-and-fishnets art sneaks onto the toe, so even the solid pair has a secret. NY Drop 1, available for this release cycle only.",
    116: "Legs in heels and fishnets on your sneakers. The Indica art wraps these women's canvas high tops on a teal-blue ground, which is funnier every time you look down. Part of NY Drop 1, here for this release cycle only.",
    89: "Men's canvas high tops wearing the Hybrid art: luchador masks in pink, teal and yellow, toe to collar. Shoes that look ready to wrestle, and probably would. NY Drop 1, this release cycle only.",

    # ---- jeromebaker.com wall art (blank in the store)
    6849612578973: "A clear glass rig posed like a portrait: round base, a medallion on the chamber, the j0int out the side and a bent neck up top, all lit white against pure black. The glass, the light, nothing else. Available in four sizes, from 11x14 up to 40x60.",
    6847455494301: "A painted bus coming straight at you. FURTHER across the destination sign, a flag flying off the windshield, swirls and stars over every panel, chrome grille grinning, a gold figure dancing on the hood. Road trip as religion. Four sizes, 11x14 up to 40x60.",
    6849601306781: "Bucket hat, big aviators, and a whole field of green leaves reflected in the lenses. Teeth clamped on a long steel tool, a torch flame hitting the tip, a clear glass rig in one hand and bats coming in from the edges. Four sizes, 11x14 up to 40x60.",
}

SHORT = 160  # store copy under this is a label, not a description


def _shape(desc):
    """Text with the drop name taken out, for spotting one template reused across products."""
    return re.sub(r'\b(indica|sativa|hybrid)\b', '#', (desc or '').lower()).strip()


def flat(items):
    """Items whose copy is blank, too short, or a template shared by several products."""
    seen = {}
    for it in items:
        seen[_shape(it['desc'])] = seen.get(_shape(it['desc']), 0) + 1
    return [it for it in items if len((it['desc'] or '').strip()) < SHORT or seen[_shape(it['desc'])] > 1]


def apply(items):
    """Swap in the site copy. Returns how many items it changed; warns about ids no longer in the catalog."""
    ids = {it['id'] for it in items}
    n = 0
    for it in items:
        if it['id'] in COPY:
            it['desc'] = COPY[it['id']]
            n += 1
    gone = sorted(set(COPY) - ids)
    if gone:
        print(f'shop_copy: {len(gone)} ids no longer in the catalog: {gone}')
    left = flat(items)
    if left:
        print(f'shop_copy: {len(left)} items still have flat copy, add them to tools/shop_copy.py:')
        for it in left:
            print(f"  {it['id']}  {it['name']}  ({len(it['desc'] or '')} chars)")
    return n


if __name__ == '__main__':
    import json, os
    path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'js', 'shop-data.js')
    src = open(path, encoding='utf-8').read()
    items = json.loads(src[src.index('window.JBShop = ') + 16:src.rindex(';')])['items']
    left = flat(items)
    print(f'{len(left)} of {len(items)} items have flat copy')
    for it in left:
        print(f"  {it['id']}  {it['name']}")
