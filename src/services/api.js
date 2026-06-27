import Constants from 'expo-constants';

// ── Credentials ───────────────────────────────────────────────────────────────
const GROK_API_KEY = process.env.EXPO_PUBLIC_GROK_API_KEY ?? '';
const IS_GROQ = GROK_API_KEY.startsWith('gsk_');
const LLM_BASE_URL = IS_GROQ ? 'https://api.groq.com/openai/v1' : 'https://api.x.ai/v1';
const LLM_MODEL = IS_GROQ ? 'meta-llama/llama-4-scout-17b-16e-instruct' : 'grok-2-1212';

// SerpAPI — camera scan only (Google Lens)
const SERPAPI_KEY = process.env.EXPO_PUBLIC_SERPAPI_KEY ?? '';
const SERPAPI_BASE_URL = 'https://serpapi.com/search.json';

const IMGBB_KEY = process.env.EXPO_PUBLIC_IMGBB_API_KEY ?? '';
const IMGBB_UPLOAD_URL = 'https://api.imgbb.com/1/upload';

// Scrapling backend — auto-detects host from Expo dev server so it works on
// any device (emulator, Expo Go on real phone) without manual IP config.
function _scraperUrl() {
  const override = process.env.EXPO_PUBLIC_SCRAPER_URL;
  if (override) return override;
  const hostUri = Constants.expoConfig?.hostUri ?? Constants.manifest?.debuggerHost ?? '';
  const host = hostUri.split(':')[0];
  return host ? `http://${host}:8000` : 'http://localhost:8000';
}
const SCRAPER_URL = _scraperUrl();

// ── LLM ───────────────────────────────────────────────────────────────────────

function _callLLM(systemPrompt, userMessage) {
  console.log('[TrustGuard] LLM ->', LLM_MODEL);
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${LLM_BASE_URL}/chat/completions`);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.setRequestHeader('Authorization', `Bearer ${GROK_API_KEY}`);
    xhr.timeout = 45000;
    xhr.ontimeout = () => reject(new Error('LLM timed out'));
    xhr.onerror   = () => reject(new Error('LLM network error'));
    xhr.onload = () => {
      if (xhr.status < 200 || xhr.status >= 300)
        return reject(new Error(`LLM ${xhr.status}: ${xhr.responseText.slice(0, 300)}`));
      try {
        const data = JSON.parse(xhr.responseText);
        const text = data.choices[0].message.content;
        const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
        resolve(JSON.parse(fenced ? fenced[1].trim() : text.trim()));
      } catch (e) {
        reject(new Error(`LLM parse error: ${e.message} — ${xhr.responseText.slice(0, 200)}`));
      }
    };
    xhr.send(JSON.stringify({
      model: LLM_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: userMessage  },
      ],
      temperature: 0.2,
    }));
  });
}

// ── Scrapling backend ─────────────────────────────────────────────────────────

async function _scrapeUrl(productUrl) {
  console.log('[TrustGuard] Scrapling ->', productUrl.slice(0, 80));
  const res = await fetch(`${SCRAPER_URL}/scrape?url=${encodeURIComponent(productUrl)}`);
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    let detail = body.slice(0, 200);
    try { detail = JSON.parse(body).detail || detail; } catch { /* not JSON */ }
    throw new Error(detail || `Scraper request failed (${res.status})`);
  }
  return res.json();
}

// ── SerpAPI — camera scan only ────────────────────────────────────────────────

async function _serpLens(imageUrl) {
  const qs = new URLSearchParams({ api_key: SERPAPI_KEY, engine: 'google_lens', url: imageUrl });
  console.log('[TrustGuard] SerpApi -> google_lens');
  const res = await fetch(`${SERPAPI_BASE_URL}?${qs.toString()}`);
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`SerpApi ${res.status}: ${body.slice(0, 150)}`);
  }
  return res.json();
}

// ── ImgBB ─────────────────────────────────────────────────────────────────────

async function _uploadToImgBB(imageUri) {
  const formData = new FormData();
  formData.append('image', { uri: imageUri, type: 'image/jpeg', name: 'scan.jpg' });
  const res = await fetch(`${IMGBB_UPLOAD_URL}?key=${IMGBB_KEY}`, { method: 'POST', body: formData });
  if (!res.ok) throw new Error(`ImgBB ${res.status}`);
  const data = await res.json();
  return { url: data.data.url, deleteUrl: data.data.delete_url };
}

// ── Build reliable store search URLs ─────────────────────────────────────────
// Used only as a fallback when an alternative isn't grounded in a real
// market_results listing (see _injectAlternatives). Every branch here must
// resolve to a real, working store search page — never a Google search.

function _storeSearchUrl(store, brand, name) {
  const product = encodeURIComponent(`${brand} ${name}`.trim());
  const s = (store ?? '').toLowerCase();
  if (s.includes('amazon'))                          return `https://www.amazon.eg/s?k=${product}`;
  if (s.includes('noon'))                             return `https://www.noon.com/egypt-en/search/?q=${product}`;
  if (s.includes('jumia'))                            return `https://www.jumia.com.eg/catalog/?q=${product}`;
  if (s.includes('2b'))                               return `https://2b.com.eg/en/catalogsearch/result/?q=${product}`;
  if (s.includes('btech') || s.includes('b.tech'))    return `https://btech.com/en/s?q=${product}`;
  if (s.includes('ikea'))                             return `https://www.ikea.com/eg/en/search/?q=${product}`;
  // Unknown/unverified store — fall back to a real, always-working Egyptian
  // marketplace search rather than a bare Google search link.
  return `https://www.amazon.eg/s?k=${product}`;
}

// ── Resolve the product's own price from real scraped data ──────────────────

const CURRENCY_TO_EGP = { EGP: 1, USD: 50, GBP: 65, EUR: 55 };

function _resolveOurPrice(scraped) {
  const raw = (scraped.metaPrice ?? '').toString().replace(/,/g, '').trim();
  const value = parseFloat(raw);
  if (!value || Number.isNaN(value)) return null;
  const currency = (scraped.metaCurrency || 'EGP').toString().toUpperCase();
  const rate = CURRENCY_TO_EGP[currency] ?? 1;
  return Math.round(value * rate);
}

// ── Real market price range from scraped competing listings ─────────────────

function _computeMarketStats(marketResults) {
  const prices = (marketResults ?? [])
    .map((m) => m.price)
    .filter((p) => typeof p === 'number' && p > 0)
    .sort((a, b) => a - b);
  if (prices.length < 3) return null;

  // Trim outliers more than 3x away from the median before computing range
  const median = prices[Math.floor(prices.length / 2)];
  const filtered = prices.filter((p) => p <= median * 3 && p >= median / 3);
  if (filtered.length < 3) return null;

  return {
    low:   filtered[0],
    high:  filtered[filtered.length - 1],
    avg:   Math.round(filtered.reduce((a, b) => a + b, 0) / filtered.length),
    count: filtered.length,
  };
}

function _injectMarketPrice(result, stats) {
  const p = result.sections.price;
  if (!stats) {
    p.verdict = `${p.verdict ?? ''} (Limited market data — based on general price knowledge, not live listings.)`.trim();
    return;
  }
  p.marketLow  = Math.round(stats.low);
  p.marketAvg  = stats.avg;
  p.marketHigh = Math.round(stats.high);

  const our = p.our;
  if (our > p.marketHigh * 1.15) {
    p.status  = 'fail';
    p.verdict = `Priced ~${Math.round((our / p.marketHigh - 1) * 100)}% above the highest of ${stats.count} comparable listings found in Egypt.`;
  } else if (our < p.marketLow * 0.5) {
    p.status  = 'warn';
    p.verdict = `Unusually low compared to ${stats.count} comparable listings — verify authenticity before buying.`;
  } else if (our >= p.marketLow && our <= p.marketHigh) {
    p.status  = 'pass';
    p.verdict = `In line with ${stats.count} comparable listings found for this product in Egypt.`;
  } else {
    p.status  = 'warn';
    p.verdict = `Slightly outside the typical range across ${stats.count} comparable listings.`;
  }
}

// ── Deterministic harmful-category backstop — never rely on the LLM alone to
// flag categories like vapes/tobacco as harmful; force it even if the model
// misses it or the page's own marketing claims otherwise. ───────────────────

const _HARMFUL_KEYWORDS = [
  'vape', 'vaping', 'e-cigarette', 'electronic cigarette', 'e-cig',
  'tobacco', 'cigarette', 'cigar', 'shisha', 'hookah', 'nicotine',
];

function _applyHarmfulBackstop(result, scraped) {
  const haystack = `${scraped.ogTitle ?? ''} ${result.product ?? ''} ${result.brand ?? ''}`.toLowerCase();
  if (!_HARMFUL_KEYWORDS.some((kw) => haystack.includes(kw))) return;

  const cert = result.sections.certificates;
  cert.classification = {
    category: cert.classification?.category || 'Tobacco / vaping product',
    isRegulated: true,
    ecoImpact: 'harmful',
    ecoNote: 'This product category (vaping/tobacco) carries inherent health and environmental risks regardless of any certification claims.',
  };
}

// ── Cross-check: an unverified "100% Authentic" self-claim from the seller
// isn't real evidence when the page doesn't even disclose who the seller is.
// Downgrades verified=true on authenticity-style claims to "unknown" in that
// case, so the seller and certificates sections can't contradict each other. ─

function _crossCheckSellerAuth(result, sellerInfo) {
  if (sellerInfo) return;
  const claims = result.sections.certificates?.claims ?? [];
  for (const cl of claims) {
    const isAuthClaim = /authentic|genuine|original/i.test(cl.name ?? '');
    if (isAuthClaim && cl.verified === true) {
      cl.verified = 'unknown';
      cl.note = 'Seller claims this, but the page does not disclose who is selling it — cannot independently verify.';
    }
  }
}

// ── Real seller info only — never a fabricated reputation score ─────────────

function _injectSeller(result, sellerInfo) {
  const s = result.sections.seller;
  s.flags = s.flags ?? [];
  s.sellerName = sellerInfo?.name ?? null;
  s.reputation = sellerInfo?.ratingText ? { ratingText: sellerInfo.ratingText } : null;

  if (!sellerInfo) {
    s.title = 'No information provided about the seller';
    s.status = 'warn';
    s.flags = [
      { icon: 'info', label: 'This page does not disclose who is selling this product — verify manually before buying', sev: 'mid' },
      ...s.flags,
    ];
    result.trustScore = Math.min(result.trustScore, 55);
  }
}

// ── Real alternatives — grounded in scraped market listings, never invented ─

function _injectAlternatives(result, marketResults) {
  const list = marketResults ?? [];
  result.alternatives = (result.alternatives ?? []).slice(0, 6).map((alt, i) => {
    const src = typeof alt.sourceIndex === 'number' ? list[alt.sourceIndex] : null;
    if (src) {
      return {
        id:    alt.id ?? `a${i + 1}`,
        brand: alt.brand ?? '',
        name:  src.title || alt.name || '',
        price: `EGP ${Math.round(src.price).toLocaleString()}`,
        score: typeof alt.score === 'number' ? alt.score : 70,
        store: src.store || alt.store || 'Online store',
        link:  src.link,
        tone:  alt.tone ?? 'sand',
        tags:  alt.tags ?? [],
      };
    }
    return {
      id:    alt.id ?? `a${i + 1}`,
      brand: alt.brand ?? '',
      name:  alt.name ?? '',
      price: alt.price ?? '',
      score: typeof alt.score === 'number' ? alt.score : 70,
      store: alt.store ?? '',
      link:  _storeSearchUrl(alt.store, alt.brand, alt.name),
      tone:  alt.tone ?? 'sand',
      tags:  [...(alt.tags ?? []).slice(0, 2), 'Estimated'],
    };
  });
}

// ── Inject scraped rating into LLM result ────────────────────────────────────

function _injectRating(result, aggregateRating) {
  if (!aggregateRating) return;
  const { value, count } = aggregateRating;
  const s = result.sections.ratings;
  s.value  = value;
  s.total  = count;
  s.status = value >= 4 ? 'pass' : value >= 3 ? 'warn' : 'fail';
  if (!s.breakdown || !s.breakdown.some((b) => b.pct > 0)) {
    const p5 = Math.round(Math.max(0, (value - 3) / 2 * 100));
    const p1 = Math.round(Math.max(0, (3.5 - value) / 2 * 55));
    const p4 = Math.round(Math.max(0, (value - 3) / 2 * 55));
    const p2 = Math.round(Math.max(0, (3.5 - value) / 2 * 28));
    const p3 = Math.max(0, 100 - p5 - p4 - p2 - p1);
    s.breakdown = [
      { stars: 5, pct: p5 },
      { stars: 4, pct: p4 },
      { stars: 3, pct: p3 },
      { stars: 2, pct: p2 },
      { stars: 1, pct: p1 },
    ];
  }
}

// ── Prompts ───────────────────────────────────────────────────────────────────

const URL_SYSTEM_PROMPT = `You are a consumer-protection analyst for the Egyptian e-commerce market.

You receive REAL data already collected for you — do not invent facts, prices, scores, or links that aren't grounded in it:
- page_text / structured_data / og_title / og_description — scraped from the product's own page
- social_results — review snippets found by searching the web for this product
- seller_info — the seller's name/rating as disclosed on the page, or null if the page discloses nothing
- market_results — REAL, currently-listed competing products found via Google Shopping (Egypt), each with a real title, store, price, and link

YOUR JOB is analysis and copywriting only. Where data is missing, say so plainly instead of guessing.

════ CERTIFICATES ════
Base every claim strictly on structured_data / page_text. Only mark verified=true if the certification is actually mentioned on the page AND backed by real evidence — not just the seller's own marketing text. Authenticity/genuineness claims ("100% Authentic", "Genuine") specifically must NEVER be verified=true on the seller's word alone: mark them verified="unknown" with a note saying it's an unverified seller claim, unless seller_info shows the seller IS the official brand store or a verified marketplace badge is present in page_text.
- Note if page_text indicates a third-party/knockoff listing vs an official brand store.
status: "pass" if strong page-evidenced certs + eco-safe, "warn" if mixed/unclear, "fail" if page evidence suggests counterfeit/harmful.

classification (required, nested inside this section): classify the product itself regardless of what the page claims.
- category: short string, e.g. "Skincare", "Vape/e-cigarette", "Electronics".
- isRegulated: true for age-restricted/regulated categories (tobacco, vapes, alcohol, pharmaceuticals, weapons), else false.
- ecoImpact: "low" | "moderate" | "harmful" — based on general category knowledge (e.g. vapes/disposable batteries/single-use plastics = "harmful"), independent of any certification on the page.
- ecoNote: one sentence explaining the ecoImpact, labeled as general category guidance, not a claim about this specific listing's certification.

════ SELLER — DO NOT USE OUTSIDE KNOWLEDGE HERE ════
Build this section ONLY from seller_info. "Trusted Egyptian sellers" knowledge belongs in ALTERNATIVES, not here.
- seller_info present: title should mention the seller's name naturally (e.g. "Sold by {name}"). flags: only things actually evidenced in page_text (e.g. "third-party seller, not the brand store").
- seller_info is null: title = "No information provided about the seller", status = "warn", flags = [{ "icon":"info", "label":"The page does not disclose who is selling this product", "sev":"mid" }].
Do NOT output a "reputation" field — it is computed separately from real data and will be discarded if present.

════ RATINGS ════
Always set ratings.value=0, ratings.total=0, ratings.breakdown=[] — the system injects the real scraped rating afterward. Fill "knownRating" from general knowledge ONLY as a last-resort fallback for when nothing was scraped.

════ FEEDBACK — STRICT ════
feedback.quotes: ONLY text that literally appears in social_results snippets. themes/summary must summarize what's actually in social_results. If social_results is empty, summary must say feedback could not be found, themes=[], quotes=[].

════ PRICE ════
price.our: your best numeric read of meta_price / structured_data / page_text — this is only a fallback; the system overwrites it with the resolved real price whenever one was scraped.
price.marketLow/marketAvg/marketHigh: the system overwrites these with real numbers computed from market_results whenever ≥3 usable real listings exist. Your numbers here are only a fallback for when market_results is too sparse — base them on general EGP price knowledge for this exact product type, and don't write the verdict as if it's certain (the system appends a "limited data" caveat automatically when it falls back to your numbers).

════ ALTERNATIVES — PICK FROM REAL DATA FIRST ════
Prefer items from market_results: for each chosen entry, output "sourceIndex" = its 0-based index in market_results, plus your own "tags" (1-2 words, e.g. "Authentic", "Bestseller"), a "tone", and a "score" (0-100) reflecting how much you generally trust that STORE in the Egyptian market (not the specific listing, which you can't verify). Do NOT output brand/name/price/store/link for sourceIndex items — the system fills those in from the real listing and ignores anything you put there.
Only when market_results has fewer than 3 usable items for this product's category, add additional suggestions from your own knowledge of real Egyptian retailers (omit sourceIndex). For those: price is your best EGP estimate, store must be a real, well-known Egyptian retailer name, and never output a link — the system builds a safe one.
Max 6 alternatives total. Prefer sourceIndex-backed ones first.

════ FORMAT RULES ════
- trustScore: 0-100 integer (>=70 trusted, 40-69 caution, <40 risky). If seller_info is null or social_results is empty, do not score above 65 unless certificates are strongly page-evidenced.
- All prices in EGP. USD×50, GBP×65, EUR×55.
- tone: sage|cream|bottle|rose|sand|slate|bronze|forest|coral|moss|sky|cocoa
- status: "pass"|"warn"|"fail"
- flag icon: "warn"|"flag"|"x"|"info"|"check" — flag sev: "high"|"mid"|"low"
- feedback sev: "bad"|"warn"|"good"

Return ONLY valid JSON:
{
  "knownRating": { "value": number, "total": number },
  "scannedUrl": "string",
  "brand": "string",
  "product": "string",
  "price": "EGP x,xxx",
  "tone": "string",
  "trustScore": number,
  "summary": "string (2 sentences, direct and actionable for Egyptian consumers)",
  "sections": {
    "certificates": {
      "status": "pass|warn|fail",
      "title": "string",
      "claims": [{ "name": "string", "verified": true, "note": "string" }],
      "classification": {
        "category": "string",
        "isRegulated": false,
        "ecoImpact": "low|moderate|harmful",
        "ecoNote": "string"
      }
    },
    "seller": {
      "status": "pass|warn|fail",
      "title": "string",
      "flags": [{ "icon": "string", "label": "string", "sev": "string" }]
    },
    "ratings": { "status": "warn", "value": 0, "total": 0, "breakdown": [] },
    "feedback": {
      "status": "pass|warn|fail",
      "summary": "string",
      "sources": ["string"],
      "themes": [{ "label": "string", "count": number, "sev": "string" }],
      "quotes": []
    },
    "price": {
      "status": "pass|warn|fail",
      "our": number,
      "marketLow": number,
      "marketAvg": number,
      "marketHigh": number,
      "currency": "EGP",
      "verdict": "string"
    }
  },
  "specifications": {
    "items": [{ "label": "string", "value": "string" }]
  },
  "alternatives": [
    {
      "id": "a1",
      "sourceIndex": number,
      "brand": "string",
      "name": "string",
      "price": "EGP X,XXX",
      "score": number,
      "store": "string",
      "tone": "string",
      "tags": ["string"]
    }
  ]
}`;

const IMAGE_SYSTEM_PROMPT = `You are a consumer-protection AI with deep knowledge of the Egyptian e-commerce market.
You receive Google Lens results identifying a product from a photo.
Your job: identify the product category and list trusted Egyptian sellers for it.

USE YOUR KNOWLEDGE of the Egyptian market:
- Electronics → B.TECH, 2B, Virgin Megastore, Amazon.eg
- Fashion → Zara Egypt, H&M, LC Waikiki, Noon Egypt
- Shoes → Shoe Room, Aldo, Steve Madden Egypt, Amazon.eg
- Beauty → Faces, Nocibe, El Ezaby pharmacy, Noon
- Sports → Intersport, Decathlon Egypt
- General → Amazon.eg, Noon, Jumia

RULES:
- score > 70 only
- Prices in EGP (USD×50, GBP×65, EUR×55) — estimate if needed
- link: real store website URL from your training knowledge
- tone: sage|cream|bottle|rose|sand|slate|bronze|forest|coral|moss|sky|cocoa
- Max 8 matches

Return ONLY valid JSON:
{
  "detected": "string",
  "thumbnailTone": "string",
  "matches": [
    {
      "id": "p1",
      "brand": "string",
      "name": "string",
      "price": "EGP x,xxx",
      "score": number,
      "store": "string",
      "link": "string",
      "tone": "string",
      "why": "string"
    }
  ]
}`;

// ── Public API ────────────────────────────────────────────────────────────────

export async function analyzeUrl(url) {
  // Scrapling does all the scraping — page content, seller info, social
  // reviews, and real competing-listing market data in one call. If this
  // fails (network error, or the target site blocked the scraper), there is
  // nothing real to analyze — let it throw rather than silently continuing
  // with empty data, which used to produce a fake-looking "all 0 / not
  // found" report instead of a clear error.
  const scraped = await _scrapeUrl(url);

  // Merge on-page reviews (actual customer text from the product page) with
  // DuckDuckGo social snippets — on-page reviews come first since they're the
  // most direct signal; DDG snippets add broader web sentiment.
  const pageReviews   = (scraped.pageReviews   ?? []).slice(0, 6);
  const socialResults = (scraped.socialResults  ?? []).slice(0, 8);
  // De-duplicate: drop DDG snippets whose text already appears verbatim in
  // page reviews (e.g. Amazon's own review widget text mirrored in search results).
  const seenSnippets  = new Set(pageReviews.map((r) => r.snippet?.slice(0, 80)));
  const dedupedSocial = socialResults.filter((r) => !seenSnippets.has((r.snippet ?? '').slice(0, 80)));
  const mergedReviews = [...pageReviews, ...dedupedSocial].slice(0, 10);

  const payload = {
    url,
    meta_price:      scraped.metaPrice,
    meta_currency:   scraped.metaCurrency,
    og_title:        scraped.ogTitle,
    og_description:  scraped.ogDesc,
    page_text:       scraped.plainText,
    structured_data: scraped.structuredData,
    // On-page customer reviews + broader web social snippets
    social_results:  mergedReviews,
    // Seller info disclosed on the page — null if nothing was found
    seller_info:     scraped.sellerInfo ?? null,
    // Real competing listings found via Google Shopping (Egypt)
    market_results:  (scraped.marketResults ?? []).slice(0, 8),
  };

  console.log('[TrustGuard] Payload:', JSON.stringify(payload).length, 'chars');
  const result = await _callLLM(URL_SYSTEM_PROMPT, JSON.stringify(payload));

  // Inject scraped rating — prefer real page data, fall back to LLM knowledge
  const pageRating = scraped.aggregateRating;
  let rating = pageRating ?? null;
  if ((!rating || rating.value === 0) && (result.knownRating?.value ?? 0) > 0) {
    rating = { value: result.knownRating.value, count: result.knownRating.total ?? 0 };
    console.log('[TrustGuard] Rating: using LLM knowledge', rating);
  }
  _injectRating(result, rating);

  // Real seller info only — never a fabricated reputation score
  _injectSeller(result, scraped.sellerInfo ?? null);

  // Force harmful categories (vapes/tobacco/etc.) to be flagged eco-harmful
  // even if the LLM missed it, and stop unverified seller authenticity
  // claims from contradicting a "no seller disclosed" message.
  _applyHarmfulBackstop(result, scraped);
  _crossCheckSellerAuth(result, scraped.sellerInfo ?? null);

  // Real product photo scraped from the page — never a placeholder when one exists
  result.imageUrl = scraped.imageUrl || null;

  // Real scraped price — overrides whatever the LLM guessed, when available
  const ourPriceEGP = _resolveOurPrice(scraped);
  if (ourPriceEGP) {
    result.sections.price.our = ourPriceEGP;
    result.price = `EGP ${ourPriceEGP.toLocaleString()}`;
  }

  // Real market price range computed from actual competing listings
  _injectMarketPrice(result, _computeMarketStats(scraped.marketResults));

  // Real alternative links/prices from actual competing listings
  _injectAlternatives(result, scraped.marketResults);

  // ── Sanitize LLM quotes — drop blank / dot-placeholder / trivially short ──
  // The LLM sometimes returns quotes: [{text:".", src:"", who:""}] when it has
  // nothing real to quote from the source snippets. Filter those out first.
  const fb = result.sections.feedback;
  fb.quotes = (fb.quotes ?? []).filter((q) => {
    const txt = (q.text ?? '').trim();
    // Must be at least 10 real characters and not just punctuation/whitespace
    return txt.length >= 10 && /[a-zA-Z\u0600-\u06FF]/.test(txt);
  });

  // ── Backfill from raw review snippets when LLM produced no real quotes ────
  // If sanitization left us with zero quotes but we DID fetch real review text,
  // promote the raw snippets directly so the boxes are never empty.
  if (fb.quotes.length === 0 && mergedReviews.length > 0) {
    fb.quotes = mergedReviews
      .filter((r) => (r.snippet ?? '').trim().length >= 15)
      .slice(0, 5)
      .map((r) => ({
        text: r.snippet.trim(),
        src:  r.title?.trim() || 'Customer review',
        who:  '',
        sev:  'good',
      }));
  }

  // ── Wipe fabricated feedback when no real content was found at all ─────────
  if (mergedReviews.length === 0) {
    fb.quotes  = [];
    fb.themes  = [];
    fb.sources = [];
    fb.summary = 'No customer feedback found from public sources.';
    fb.status  = 'warn';
  }

  return result;
}

export async function uploadToImgBB(imageUri) {
  return _uploadToImgBB(imageUri);
}

export async function searchByImage(imageUri) {
  const { url: publicUrl } = await _uploadToImgBB(imageUri);
  const lensData = await _serpLens(publicUrl);
  const payload = {
    visual_matches: (lensData.visual_matches ?? []).slice(0, 8).map((m) => ({
      title: m.title, source: m.source, price: m.price,
    })),
    knowledge_graph: lensData.knowledge_graph
      ? { title: lensData.knowledge_graph.title, type: lensData.knowledge_graph.type }
      : null,
  };
  return _callLLM(IMAGE_SYSTEM_PROMPT, JSON.stringify(payload));
}
