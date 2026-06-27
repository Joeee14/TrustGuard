import html as html_lib
import json
import os
import re
import sys
import time
import urllib.parse
import urllib.request

from scrapling.fetchers import Fetcher, PlayWrightFetcher


_DDG_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0 Safari/537.36',
    'Accept-Language': 'en-US,en;q=0.9',
}

SERPAPI_KEY = os.environ.get('SERPAPI_KEY', '')
SERPAPI_URL = 'https://serpapi.com/search.json'


def _log(*args):
    try:
        print(*args, file=sys.stderr)
        sys.stderr.flush()
    except UnicodeEncodeError:
        safe = ' '.join(str(a).encode('ascii', 'replace').decode() for a in args)
        print(safe, file=sys.stderr)
        sys.stderr.flush()


# ── Public entry point ────────────────────────────────────────────────────────

def scrape_product_page(url: str) -> dict:
    """
    Scrape the product page, search for social reviews, and search for real
    competing listings (market data). Returns a single dict with page data +
    review snippets + market results — all real, none LLM-invented.
    """
    page = _scrape_page(url)
    product_query = _build_query(url, page)
    reviews = _search_reviews(product_query)
    market = _search_market(product_query, url)

    _log(f"[scraper] reviews found: {len(reviews)}")
    _log(f"[scraper] market results found: {len(market)}")
    page['socialResults'] = reviews
    page['marketResults'] = market
    return page


# ── Page scraper ──────────────────────────────────────────────────────────────

def _scrape_page(url: str, attempts: int = 2) -> dict:
    last_error = None
    for attempt in range(1, attempts + 1):
        try:
            response = PlayWrightFetcher().fetch(url, headless=True, stealth=True, timeout=45000)
            status = getattr(response, 'status', None)
            html = response.html_content or response.body or ""
            if not html:
                raise RuntimeError(f"Empty response (status {status})")
            # A non-2xx/3xx status (403/429/503 are the common ones) almost
            # always means we got an anti-bot/WAF block page, not the real
            # product page — treating its (often short) HTML as real content
            # silently feeds garbage ("Access Denied") through the whole
            # pipeline instead of failing loudly.
            if status is not None and status >= 400:
                raise RuntimeError(f"Blocked by target site (HTTP {status}) — anti-bot protection likely triggered")
            _log(f"[scraper] page OK  status={status}  len={len(html)}")
            return _parse_page(html)
        except Exception as e:
            import traceback as tb
            full = tb.format_exc()
            _log(f"[scraper] page failed (attempt {attempt}/{attempts}):\n{full}")
            last_error = full.strip().splitlines()[-1]
            if attempt < attempts:
                time.sleep(2)
    raise RuntimeError(f"Failed to scrape {url}: {last_error}")


# ── Social review search via DuckDuckGo ───────────────────────────────────────

def _build_query(url: str, page: dict) -> str:
    # Prefer og_title (e.g. "Cotton Sweatpants H&M Egypt"), fall back to domain
    title = page.get('ogTitle') or ''
    if title:
        # Strip pipe-delimited suffixes (e.g. "Product | Tax Paid | Warranty").
        # Deliberately NOT splitting on hyphens/en-dashes — they show up
        # constantly inside real product names ("Ultra-Clear", "Face-ID")
        # and splitting on them truncates the query mid-name.
        product = title.split('|')[0].strip()[:90].strip()
    else:
        domain = urllib.parse.urlparse(url).netloc.replace('www.', '')
        product = domain

    return product


def _search_reviews(product: str) -> list:
    try:
        query = f'"{product}" reviews customers'
        encoded = urllib.parse.quote(query)
        response = Fetcher(auto_match=False).get(
            f'https://html.duckduckgo.com/html/?q={encoded}',
            headers=_DDG_HEADERS,
        )
        if not response or response.status != 200:
            _log(f"[scraper] DDG failed status={getattr(response,'status','?')}")
            return []

        results = []
        # Title + snippet for each organic result
        titles   = response.css('.result__title')
        snippets = response.css('.result__snippet')

        for i, snippet in enumerate(snippets[:8]):
            title_text = titles[i].get_all_text().strip() if i < len(titles) else ''
            snip_text  = snippet.get_all_text().strip()
            if snip_text:
                results.append({'title': title_text, 'snippet': snip_text})

        _log(f"[scraper] DDG '{query[:60]}' -> {len(results)} snippets")
        return results

    except Exception as e:
        _log(f"[scraper] DDG search failed: {e}")
        return []


# ── Real market/competing-listing search via SerpApi ─────────────────────────
# NOTE: SerpApi's `google_shopping` engine doesn't support gl=eg (Egypt isn't
# a supported Google Shopping market) and only returns generic
# google.com/search?ibp=oshop redirect links, not real merchant URLs — useless
# for an Egypt-local, real-link feature. A normal `google` search with
# gl=eg/google_domain=google.com.eg DOES return real direct product links.
#
# We deliberately do NOT restrict the query to a handful of known stores
# (site:noon.com OR site:amazon.eg OR ...) — the product page being analyzed
# can come from ANY site, including small local brands and boutique
# Shopify/WooCommerce stores we have no way to enumerate in advance. Instead
# we run an open query and only filter OUT domains that clearly aren't
# merchants (social media, forums, news, price-comparison aggregators whose
# links point back to a comparison page rather than the actual seller).

_KNOWN_STORE_LABELS = [
    ('noon.com',      'Noon Egypt'),
    ('amazon.eg',     'Amazon.eg'),
    ('jumia.com.eg',  'Jumia Egypt'),
    ('2b.com.eg',     '2B Egypt'),
    ('btech.com',     'B.TECH'),
]

_NON_MERCHANT_DOMAINS = (
    'wikipedia.org', 'youtube.com', 'facebook.com', 'instagram.com',
    'twitter.com', 'x.com', 'reddit.com', 'quora.com', 'pinterest.com',
    'linkedin.com', 'tiktok.com',
    'blogspot.com', 'medium.com', 'wordpress.com', 'blogger.com',
    # Price-comparison aggregators — their links point to a comparison page,
    # not the actual seller, so they'd break the "real direct link" guarantee.
    'pricena.com', 'yaoota.com', 'egprices.com',
    # Peer-to-peer classifieds — listings are unvetted individual sellers, not
    # registered merchants. Surfacing these as "safer alternatives" would
    # undercut the whole point of a trust-scoring app.
    'dubizzle.com', 'olx.com', 'opensooq.com',
)


def _store_name_from_domain(domain: str) -> str:
    for needle, label in _KNOWN_STORE_LABELS:
        if needle in domain:
            return label
    # No known label — derive a readable name from the domain itself rather
    # than requiring every store to be enumerated ahead of time.
    name = re.sub(r'\.(?:com|net|org|store|shop)?\.eg$', '', domain)
    name = re.sub(r'\.(?:com|net|org|store|shop|io)$', '', name)
    parts = re.split(r'[.\-_]', name)
    name = ' '.join(p.upper() if len(p) <= 3 else p.capitalize() for p in parts if p)
    return name or domain


def _normalize_url(u: str) -> str:
    """domain+path only, no query string — so tracking params like ?srsltid=
    don't make the same listing look like a different one, but a domain-wide
    match isn't required either (other listings on the same marketplace are
    legitimate comparisons, just not THIS exact product page)."""
    p = urllib.parse.urlparse(u)
    return f"{p.netloc.replace('www.', '')}{p.path}".rstrip('/')


def _search_market(product: str, original_url: str) -> list:
    """
    Search for real, currently-listed competing products in Egypt — any
    site, not just a handful of known marketplaces — so price comparison and
    "alternatives" are grounded in actual data with real direct links, never
    LLM-guessed prices/links.
    """
    if not SERPAPI_KEY:
        _log("[scraper] SERPAPI_KEY not set — skipping market search")
        return []

    try:
        original_key = _normalize_url(original_url)
        qs = urllib.parse.urlencode({
            'engine': 'google',
            'q': f'{product} price Egypt',
            'gl': 'eg',
            'hl': 'en',
            'google_domain': 'google.com.eg',
            'api_key': SERPAPI_KEY,
        })
        req = urllib.request.Request(
            f'{SERPAPI_URL}?{qs}',
            headers={'User-Agent': _DDG_HEADERS['User-Agent']},
        )
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = json.loads(resp.read().decode('utf-8', errors='replace'))

        results = []
        for item in data.get('organic_results', []):
            link = item.get('link') or ''
            if not link:
                continue
            link_domain = urllib.parse.urlparse(link).netloc.replace('www.', '')
            if not link_domain or _normalize_url(link) == original_key:
                continue
            if any(bad in link_domain for bad in _NON_MERCHANT_DOMAINS):
                continue
            price = _best_price_from_snippet(f"{item.get('snippet', '')} {item.get('title', '')}")
            if price is None:
                continue
            results.append({
                'title':    item.get('title') or '',
                'store':    _store_name_from_domain(link_domain),
                'price':    price,
                'currency': 'EGP',
                'link':     link,
            })
            if len(results) >= 10:
                break

        _log(f"[scraper] market search '{product[:60]}' -> {len(results)} results")
        return results

    except Exception as e:
        _log(f"[scraper] market search failed: {e}")
        return []


# ── HTML parser ───────────────────────────────────────────────────────────────

def _ld_nodes(ld):
    """Flatten a parsed JSON-LD entry (dict, dict with @graph, or list) into dict nodes."""
    if isinstance(ld, list):
        nodes = []
        for item in ld:
            nodes.extend(_ld_nodes(item))
        return nodes
    if isinstance(ld, dict):
        graph = ld.get('@graph')
        if isinstance(graph, list):
            return graph
        return [ld]
    return []


def _offers_of(node: dict):
    offers = node.get('offers')
    if isinstance(offers, list):
        offers = offers[0] if offers else None
    return offers if isinstance(offers, dict) else None


def _price_from_structured_data(structured_data: list):
    for ld in structured_data:
        for node in _ld_nodes(ld):
            offers = _offers_of(node)
            if not offers:
                continue
            price = offers.get('price') or offers.get('lowPrice')
            if price is not None and str(price).strip() not in ('', '0', '0.0'):
                return str(price), (offers.get('priceCurrency') or '')
    return '', ''


_CURRENCY_TEXT_PATTERNS = [
    r'(?:EGP|L\.?E\.?)\s*([\d,]+(?:\.\d{1,2})?)',
    r'([\d,]+(?:\.\d{1,2})?)\s*(?:EGP|L\.?E\.?)\b',
    r'ج\.م\.?\s*([\d,]+(?:\.\d{1,2})?)',
    r'([\d,]+(?:\.\d{1,2})?)\s*ج\.م',
    r'([\d,]+(?:\.\d{1,2})?)\s*جنيه',
    # Egyptian Pound symbol (£E) used by some sites
    r'£E\s*([\d,]+(?:\.\d{1,2})?)',
    r'([\d,]+(?:\.\d{1,2})?)\s*£E',
]


def _price_from_text(plain: str):
    for pattern in _CURRENCY_TEXT_PATTERNS:
        m = re.search(pattern, plain)
        if not m:
            continue
        value = m.group(1).replace(',', '')
        try:
            f = float(value)
            # Reject obviously garbage values (0, or astronomically large)
            if f <= 0 or f > 10_000_000:
                continue
        except ValueError:
            continue
        return value, 'EGP'
    return '', ''


def _price_from_html_attributes(html: str):
    """Extract price from HTML data attributes and embedded JSON strings.
    Amazon.eg and similar sites often store the displayed price in hidden
    span/div data attributes or inline JS objects rather than visible text."""
    candidates = []

    # Amazon-style: data-a-color-price, data-price, data-asin-price, etc.
    for m in re.finditer(
        r'data-(?:a-color-price|price|asin-price|csa-c-content)[^>]*?>\s*'
        r'(?:<[^>]+>)*?([\d,\.]+)(?:</[^>]+>)*?\s*(?:EGP|ج\.م|جنيه|L\.?E\.?)',
        html, re.IGNORECASE,
    ):
        try:
            candidates.append(float(m.group(1).replace(',', '')))
        except ValueError:
            pass

    # Inline JS: "priceAmount":1234 or "price":"1,234.00" or 'buyingPrice':1234
    for m in re.finditer(
        r'(?:"priceAmount"|"displayPrice"|"buyingPrice"|"listPrice"|"ourPrice"|"price")\s*:\s*["\']?([\d,]+(?:\.\d{1,2})?)["\']?',
        html, re.IGNORECASE,
    ):
        try:
            v = float(m.group(1).replace(',', ''))
            if 1 < v < 10_000_000:
                candidates.append(v)
        except ValueError:
            pass

    # Amazon coremetrics / window.ue_* price fields
    for m in re.finditer(
        r'"price"\s*:\s*["\']?([\d]+(?:\.[\d]{1,2})?)["\']?',
        html,
    ):
        try:
            v = float(m.group(1))
            if 1 < v < 10_000_000:
                candidates.append(v)
        except ValueError:
            pass

    if not candidates:
        return '', ''
    # Use median to avoid outliers (e.g. tiny sub-item prices or huge retail tags)
    candidates.sort()
    median_val = candidates[len(candidates) // 2]
    return str(int(median_val) if median_val == int(median_val) else median_val), 'EGP'


# Search-result snippets often lead with a promo/installment figure ("Save
# EGP 21,800", "EMI from EGP 2,750/mo") before the real price — taking the
# first EGP-amount in a snippet (as _price_from_text does) grabs the wrong
# number. Ignore amounts in those contexts and take the largest of what's left.
_SNIPPET_PRICE_BLACKLIST = (
    'save', 'was', 'off', 'discount', 'emi', 'installment', 'down payment',
    '/mo', 'per month', 'monthly', 'original price',
)


def _best_price_from_snippet(text: str):
    candidates = []
    for pattern in _CURRENCY_TEXT_PATTERNS:
        for m in re.finditer(pattern, text):
            context = text[max(0, m.start() - 20):m.start()].lower()
            if any(bad in context for bad in _SNIPPET_PRICE_BLACKLIST):
                continue
            try:
                candidates.append(float(m.group(1).replace(',', '')))
            except ValueError:
                continue
    # The current/sale price is consistently the smaller figure in these
    # snippets — "was"/"save" amounts are excluded above, but unrelated
    # small mentions (e.g. an add-on insurance fee) can still slip through;
    # downstream outlier-trimming in api.js's _computeMarketStats catches those.
    return min(candidates) if candidates else None


_SELLER_NAME_PATTERNS = [
    # The optional ".xx" suffix lets names like "Amazon.eg" capture in full —
    # without it, the [^.] in the main group stops right at the period.
    r'Ships from and sold by\s+([^.\n<]{2,40}(?:\.[a-z]{2,3})?)',
    r'Sold by\s+([^.\n<]{2,40}(?:\.[a-z]{2,3})?)',
    r'Seller\s+name:?\s*([^.\n<]{2,40}(?:\.[a-z]{2,3})?)',
    r'يباع من قبل\s*([^.\n<]{2,40})',
]
_SELLER_RATING_PATTERNS = [
    r'\d{1,3}%\s*(?:positive|good)',
    r'seller rating[^\d]*\d(?:\.\d)?',
]
# Words that show up in site navigation/UI chrome near the literal word
# "Seller" (e.g. Amazon's "Your Seller Account") — reject matches containing
# these rather than risk treating nav text as a real seller disclosure.
_SELLER_STOPWORDS = (
    'account', 'cart', 'sign in', 'menu', 'search', 'categor', 'home',
    'help', 'order', 'list', 'wishlist', 'today', 'sell ', 'subscribe',
    'deal', 'login', 'register',
)


def _looks_like_seller_name(name: str) -> bool:
    lowered = name.lower()
    return not any(stop in lowered for stop in _SELLER_STOPWORDS)


def _extract_seller(plain: str, structured_data: list):
    """Real seller info only — returns None if nothing is disclosed on the page."""
    for ld in structured_data:
        for node in _ld_nodes(ld):
            offers = _offers_of(node)
            seller = (offers.get('seller') if offers else None) or node.get('seller')
            if isinstance(seller, dict):
                name = (seller.get('name') or '').strip()
                if name and _looks_like_seller_name(name):
                    return {'name': name, 'ratingText': ''}

    for pattern in _SELLER_NAME_PATTERNS:
        m = re.search(pattern, plain, re.IGNORECASE)
        if not m:
            continue
        name = m.group(1).strip().rstrip(',.')
        if len(name) < 2 or not _looks_like_seller_name(name):
            continue
        # Only look for a rating in the text immediately around this specific
        # seller mention — searching the whole page risks picking up an
        # unrelated "X% positive" from a totally different widget.
        nearby = plain[m.start():m.end() + 150]
        rating_text = ''
        for rp in _SELLER_RATING_PATTERNS:
            rm = re.search(rp, nearby, re.IGNORECASE)
            if rm:
                rating_text = rm.group(0).strip()
                break
        return {'name': name, 'ratingText': rating_text}

    return None


def _extract_page_reviews(html: str, plain_full: str) -> list:
    """Extract actual customer review text written on the product page itself.
    Targets Amazon.eg review widgets and generic review/testimonial patterns.
    Returns a list of dicts with 'title' and 'snippet' keys."""
    reviews = []

    # ── Amazon.eg review blocks ───────────────────────────────────────────────
    # Amazon renders review titles in .review-title and bodies in .review-text
    # These appear in the HTML even with JS-rendering via Playwright.
    review_title_pattern = re.compile(
        r'<span[^>]+class=["\'][^"\']*(review-title)[^"\'][^>]*>\s*(<span[^>]*>[^<]*</span>)?\s*([^<]{3,200})\s*</span>',
        re.IGNORECASE,
    )
    review_body_pattern = re.compile(
        r'<span[^>]+class=["\'][^"\']*(review-text-content|reviewText)[^"\'][^>]*>[\s\S]{0,50}<span[^>]*>([^<]{20,1000})</span>',
        re.IGNORECASE,
    )

    titles = [html_lib.unescape(m.group(3)).strip() for m in review_title_pattern.finditer(html)]
    bodies = [html_lib.unescape(m.group(2)).strip() for m in review_body_pattern.finditer(html)]

    for i, body in enumerate(bodies[:6]):
        if len(body) < 20:
            continue
        title = titles[i] if i < len(titles) else ''
        reviews.append({'title': title, 'snippet': body})

    if reviews:
        _log(f"[scraper] on-page reviews extracted: {len(reviews)}")
        return reviews

    # ── Generic fallback: look for review/testimonial JSON in page scripts ───
    # Some sites embed reviews as JSON arrays in script tags
    for m in re.finditer(
        r'(?:"reviews?"\s*:\s*\[|"testimonials?"\s*:\s*\[)([\s\S]{0,4000}?)\]',
        html, re.IGNORECASE,
    ):
        chunk = m.group(0)
        # Pull out "body"/"text"/"content" strings from this JSON chunk
        for tm in re.finditer(
            r'"(?:body|text|content|comment|description)"\s*:\s*"([^"]{20,500})"',
            chunk,
        ):
            snippet = html_lib.unescape(tm.group(1)).strip()
            if snippet and len(reviews) < 5:
                reviews.append({'title': '', 'snippet': snippet})

    if reviews:
        _log(f"[scraper] on-page reviews (JSON fallback): {len(reviews)}")
        return reviews

    # ── Generic plain-text fallback: sentences near star/rating mentions ─────
    # e.g. "5 stars — Great product, very fast delivery. I recommend it."
    for m in re.finditer(
        r'(?:[1-5](?:\.\d)?\s*(?:stars?|نجوم|نجمة))\s*[—\-–:]?\s*([^.!?]{20,300}[.!?])',
        plain_full, re.IGNORECASE,
    ):
        snippet = m.group(1).strip()
        if snippet and len(reviews) < 5:
            reviews.append({'title': '', 'snippet': snippet})

    if reviews:
        _log(f"[scraper] on-page reviews (star-sentence fallback): {len(reviews)}")

    return reviews


def _parse_page(html: str) -> dict:
    # ── JSON-LD structured data ───────────────────────────────────────────────
    structured_data = []
    for m in re.finditer(
        r'<script[^>]+type=["\']application/ld\+json["\'][^>]*>([\s\S]*?)</script>',
        html, re.IGNORECASE,
    ):
        try:
            structured_data.append(json.loads(m.group(1).strip()))
        except Exception:
            pass

    # ── Open Graph / product meta tags ───────────────────────────────────────
    def _meta(pattern):
        m = re.search(pattern, html, re.IGNORECASE)
        return html_lib.unescape(m.group(1)) if m else ''

    og_title = _meta(r'og:title["\s]+content=["\']([^"\']+)')
    if not og_title:
        title_m = re.search(r'<title[^>]*>([^<]+)</title>', html, re.IGNORECASE)
        if title_m:
            og_title = html_lib.unescape(title_m.group(1)).strip()
    og_desc  = _meta(r'og:description["\s]+content=["\']([^"\']+)')
    og_image = _meta(r'og:image["\s]+content=["\']([^"\']+)')

    # ── Plain text — keep the FULL text for our own extraction (the real
    # price/seller/rating block on a long page is often well past the first
    # few thousand characters of nav/header); only truncate the copy sent to
    # the LLM, at the very end, for payload size. ─────────────────────────────
    plain_full = re.sub(r'<script[\s\S]*?</script>', '', html, flags=re.IGNORECASE)
    plain_full = re.sub(r'<style[\s\S]*?</style>',   '', plain_full, flags=re.IGNORECASE)
    plain_full = re.sub(r'<!--[\s\S]*?-->',           '', plain_full)
    plain_full = re.sub(r'<[^>]+>', ' ', plain_full)
    plain_full = html_lib.unescape(plain_full)
    plain_full = re.sub(r'\s+', ' ', plain_full).strip()

    # ── Price + rating: prefer ONE combined anchor over independent searches.
    # A page can mention "X out of 5 stars" and "EGP Y" many times (related
    # products, accessories, sponsored items) — picking the first occurrence
    # of each independently risks pairing unrelated values together. When the
    # rating-count-then-price pattern Amazon-style pages use is found
    # ("4.2 out of 5 stars (4,214) EGP 3,299.00"), both numbers are tied to
    # the same DOM element, which is much more trustworthy. ───────────────────
    aggregate_rating = None

    # ── Combined rating+price anchor (Amazon-style) ───────────────────────────
    # Matches: "4.2 out of 5 stars (4,214) EGP 3,299.00"
    # Also handles Arabic star notation and variations without parentheses
    combined_m = re.search(
        r'([0-9.]+)\s+out of\s+5\s+stars\s*(?:\(([0-9,]+)\))?[^.]{0,120}?(?:EGP|L\.?E\.?)\s*([\d,]+(?:\.\d{1,2})?)',
        plain_full, re.IGNORECASE,
    )
    if combined_m:
        aggregate_rating = {
            'value': float(combined_m.group(1)),
            'count': int((combined_m.group(2) or '0').replace(',', '')),
        }

    # Arabic star pattern: "4.2 من 5 نجوم" (x out of 5 stars in Arabic)
    if not aggregate_rating:
        ar_m = re.search(
            r'([0-9.]+)\s+من\s+5\s+(?:نجوم|نجمة)',
            plain_full,
        )
        if ar_m:
            # Try to find a nearby count
            pos = ar_m.end()
            nearby = plain_full[pos:pos + 200]
            rc_m = re.search(r'([0-9,]+)\s*(?:تقييم|تقييمات|rating)', nearby, re.IGNORECASE)
            aggregate_rating = {
                'value': float(ar_m.group(1)),
                'count': int((rc_m.group(1) if rc_m else '0').replace(',', '')),
            }

    # ── Price: JSON-LD offers > combined anchor > meta tags > HTML attrs > plain-text
    meta_price, meta_currency = _price_from_structured_data(structured_data)
    _log(f"[scraper] structured_data price: '{meta_price}' {meta_currency}")

    if not meta_price and combined_m:
        meta_price = combined_m.group(3).replace(',', '')
        meta_currency = meta_currency or 'EGP'
        _log(f"[scraper] combined anchor price: '{meta_price}'")

    if not meta_price:
        meta_price = (
            _meta(r'product:price:amount["\s]+content=["\']([^"\']+)') or
            _meta(r'property=["\']product:price:amount["\'][^>]*content=["\']([^"\']+)') or
            _meta(r'itemprop=["\']price["\'][^>]*content=["\']([^"\']+)')
        )
        if meta_price:
            _log(f"[scraper] meta-tag price: '{meta_price}'")

    if not meta_currency:
        meta_currency = (
            _meta(r'product:price:currency["\s]+content=["\']([^"\']+)') or
            _meta(r'property=["\']product:price:currency["\'][^>]*content=["\']([^"\']+)')
        )

    # ── Amazon.eg-specific HTML attribute / inline-JS price extraction ────────
    if not meta_price:
        attr_price, attr_currency = _price_from_html_attributes(html)
        if attr_price:
            meta_price = attr_price
            meta_currency = meta_currency or attr_currency
            _log(f"[scraper] HTML-attribute price: '{meta_price}'")

    if not meta_price:
        text_price, text_currency = _price_from_text(plain_full)
        if text_price:
            meta_price = text_price
            meta_currency = meta_currency or text_currency
            _log(f"[scraper] plain-text price: '{meta_price}'")

    if not og_image:
        for ld in structured_data:
            for node in _ld_nodes(ld):
                img = node.get('image')
                if isinstance(img, list) and img:
                    img = img[0]
                if isinstance(img, dict):
                    img = img.get('url') or ''
                if isinstance(img, str) and img:
                    og_image = img
                    break
            if og_image:
                break

    seller_info = _extract_seller(plain_full, structured_data)
    plain = plain_full[:4000]

    # ── Aggregate rating (continued) — JSON-LD beats the combined anchor;
    # everything else is a last-resort fallback for sites without either. ────
    for ld in structured_data:
        found_in_ld = False
        for node in _ld_nodes(ld):
            ar = node.get('aggregateRating') or {}
            rv = float(ar.get('ratingValue') or 0)
            rc = int(ar.get('reviewCount') or ar.get('ratingCount') or 0)
            if rv > 0:
                aggregate_rating = {'value': rv, 'count': rc}
                found_in_ld = True
                break
        if found_in_ld:
            break

    if not aggregate_rating:
        rv_m = re.search(r'itemprop=["\']ratingValue["\'][^>]*content=["\']([^"\']+)', html, re.IGNORECASE) or \
               re.search(r'itemprop=["\']ratingValue["\'][^>]*>([0-9.]+)', html, re.IGNORECASE)
        rc_m = re.search(r'itemprop=["\']reviewCount["\'][^>]*content=["\']([^"\']+)', html, re.IGNORECASE) or \
               re.search(r'itemprop=["\']reviewCount["\'][^>]*>([0-9,]+)', html, re.IGNORECASE)
        if rv_m:
            rv = float(rv_m.group(1))
            rc = int((rc_m.group(1) if rc_m else '0').replace(',', ''))
            if rv > 0:
                aggregate_rating = {'value': rv, 'count': rc}

    if not aggregate_rating:
        rv_m = (
            re.search(r'([0-9.]+)\s+out of\s+5\s+stars', html, re.IGNORECASE) or
            # Arabic: "4.2 من 5 نجوم"
            re.search(r'([0-9.]+)\s+من\s+5\s+(?:نجوم|نجمة)', html)
        )
        rc_m = (
            re.search(r'([0-9,]+)\s+(?:global |customer )?ratings?', html, re.IGNORECASE) or
            re.search(r'([0-9,]+)\s+(?:تقييم|تقييمات)', html)
        )
        if rv_m:
            rv = float(rv_m.group(1))
            if 0 < rv <= 5:
                rc = int((rc_m.group(1) if rc_m else '0').replace(',', ''))
                aggregate_rating = {'value': rv, 'count': rc}

    if not aggregate_rating:
        # Amazon embeds rating in JS: {"ratingScore":"4.2"} or data-hook="rating-out-of-text"
        rv_m = (
            re.search(r'"ratingScore"\s*:\s*"([0-9.]+)"', html) or
            re.search(r'data-hook=["\']rating-out-of-text["\'][^>]*>\s*([0-9.]+)', html, re.IGNORECASE) or
            re.search(r'["\']ratingValue["\']\s*:\s*["\']?([0-9.]+)', html, re.IGNORECASE)
        )
        if rv_m:
            rv = float(rv_m.group(1))
            if 0 < rv <= 5:
                aggregate_rating = {'value': rv, 'count': 0}

    if not combined_m:
        gr_m = (
            re.search(r'([0-9,]+)\s+global\s+ratings?',  html, re.IGNORECASE) or
            re.search(r'([0-9,]+)\s+customer\s+ratings?', html, re.IGNORECASE) or
            re.search(r'"ratingCount"\s*:\s*(\d+)',        html, re.IGNORECASE) or
            re.search(r'"totalRatingCount"\s*:\s*(\d+)',   html, re.IGNORECASE)
        )
        if gr_m:
            global_count = int(gr_m.group(1).replace(',', ''))
            if aggregate_rating and global_count > aggregate_rating['count']:
                aggregate_rating['count'] = global_count

    # ── On-page customer reviews ──────────────────────────────────────────────
    page_reviews = _extract_page_reviews(html, plain_full)

    _log(f"[scraper] final price='{meta_price}' currency='{meta_currency}' rating={aggregate_rating}")

    return {
        'structuredData':  structured_data[:3],
        'metaPrice':       meta_price,
        'metaCurrency':    meta_currency or ('EGP' if meta_price else ''),
        'ogTitle':         og_title,
        'ogDesc':          og_desc,
        'imageUrl':        og_image,
        'plainText':       plain,
        'aggregateRating': aggregate_rating,
        'sellerInfo':      seller_info,
        'pageReviews':     page_reviews,
    }
