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

// Scrapling backend URL resolution:
// 1. EXPO_PUBLIC_SCRAPER_URL env var (highest priority — set in .env)
// 2. Local dev-server host auto-detected from Expo Metro (local dev only)
// 3. Live Render backend as the hardcoded production default
//
// The hardcoded Render URL ensures Expo Go cloud builds never accidentally
// fall back to localhost when the env var isn't embedded by EAS Update.
const _PRODUCTION_BACKEND = 'https://trustguard-1-cc0l.onrender.com';

function _scraperUrl() {
  // Explicit override always wins (set via .env EXPO_PUBLIC_SCRAPER_URL)
  const override = process.env.EXPO_PUBLIC_SCRAPER_URL;
  if (override && override !== _PRODUCTION_BACKEND) return override;

  // If a Metro dev server is running (local development), auto-detect its IP
  const hostUri = Constants.expoConfig?.hostUri ?? Constants.manifest?.debuggerHost ?? '';
  const host = hostUri.split(':')[0];
  if (host && host !== 'localhost' && !host.startsWith('u.expo')) {
    // Looks like a real local IP (e.g. 192.168.x.x) — use local backend
    return `http://${host}:8000`;
  }

  // Cloud / Expo Go published build — use the live Render backend
  return _PRODUCTION_BACKEND;
}
const SCRAPER_URL = _scraperUrl();
console.log('[TrustGuard] Backend URL:', SCRAPER_URL);

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

// Wrap fetch() with an AbortController timeout so we always get a real error
// instead of a silent hang (Render free-tier cold starts can take 30-60s).
async function _fetchWithTimeout(url, options = {}, timeoutMs = 90000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: ctrl.signal });
  } catch (e) {
    if (e.name === 'AbortError') throw new Error('Backend timed out — the server may be waking up, please try again in a moment.');
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

// Wake up a cold-started Render instance by pinging /health first.
// If the health check itself times out we proceed anyway (maybe the main
// request will still succeed or give a clearer error).
async function _wakeBackend() {
  try {
    console.log('[TrustGuard] Pinging backend /health to wake from cold start...');
    await _fetchWithTimeout(`${SCRAPER_URL}/health`, {}, 60000);
    console.log('[TrustGuard] Backend is awake');
  } catch (e) {
    console.warn('[TrustGuard] Health ping failed (proceeding anyway):', e.message);
  }
}

async function _scrapeUrl(productUrl) {
  console.log('[TrustGuard] Scrapling ->', productUrl.slice(0, 80));
  // Wake cold-started Render server before the real (slow) scrape request
  await _wakeBackend();
  const res = await _fetchWithTimeout(
    `${SCRAPER_URL}/scrape?url=${encodeURIComponent(productUrl)}`,
    {},
    90000,
  );
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

// ── Alternatives: built directly from real Egyptian market search results ──
// Same mapping as the camera scan flow — no LLM sourceIndex picking.
// The TONES cycle deterministically so cards always have a colour.
const _ALT_TONES = ['sage', 'cream', 'bottle', 'rose', 'sand', 'slate', 'bronze', 'forest', 'coral', 'sky', 'cocoa', 'moss'];

function _injectAlternatives(result, marketResults) {
  const list = (marketResults ?? []).filter((m) => m.link && (m.price > 0 || m.price === null));

  if (list.length === 0) {
    result.alternatives = [];
    return;
  }

  result.alternatives = list.slice(0, 6).map((src, i) => ({
    id:    `a${i + 1}`,
    brand: '',
    name:  src.title || '',
    price: src.price != null ? `EGP ${Math.round(src.price).toLocaleString()}` : 'Check store',
    score: 75,
    store: src.store || 'Online store',
    link:  src.link,
    tone:  _ALT_TONES[i % _ALT_TONES.length],
    tags:  [],
  }));
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
Build this section ONLY from seller_info.
- seller_info present: title should mention the seller's name naturally (e.g. "Sold by {name}"). flags: only things actually evidenced in page_text (e.g. "third-party seller, not the brand store").
- seller_info is null: title = "No information provided about the seller", status = "warn", flags = [{ "icon":"info", "label":"The page does not disclose who is selling this product", "sev":"mid" }].
Do NOT output a "reputation" field — it is computed separately from real data and will be discarded if present.

════ RATINGS ════
Always set ratings.value=0, ratings.total=0, ratings.breakdown=[] — the system injects the real scraped rating afterward. Fill "knownRating" from general knowledge ONLY as a last-resort fallback for when nothing was scraped.

════ FEEDBACK — STRICT, NO FABRICATION ════
social_results now comes from a targeted review search on Amazon.eg, Jumia Egypt, and Arabic review queries — these snippets contain real customer opinion text.
feedback.quotes: COPY verbatim text ONLY from social_results[*].snippet. Do NOT paraphrase, combine, or invent. If a snippet says "Great product, fast delivery" copy that exact phrase. Each quote.src must be the matching social_results[*].title. Each quote.who should be empty string "".
feedback.themes: summarize recurring sentiments you actually see across the snippets (e.g. "Delivery speed", "Build quality"). If no real patterns exist, return themes=[].
feedback.summary: write a 1-2 sentence summary of what the snippets actually say about this product. If social_results is empty or none of the snippets contain opinion language (e.g. they're all product descriptions/prices), set summary="No customer feedback was found for this product from public sources.", themes=[], quotes=[], status="warn".
NEVER invent quotes or attribute words to customers that don't appear in the raw snippet text.


════ PRICE ════
price.our: your best numeric read of meta_price / structured_data / page_text — this is only a fallback; the system overwrites it with the resolved real price whenever one was scraped.
price.marketLow/marketAvg/marketHigh: the system overwrites these with real numbers computed from market_results whenever ≥3 usable real listings exist. Your numbers here are only a fallback for when market_results is too sparse — base them on general EGP price knowledge for this exact product type, and don't write the verdict as if it's certain (the system appends a "limited data" caveat automatically when it falls back to your numbers).

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
  }
}`;

// ── Egyptian market helpers (JS mirrors of backend scraper.py) ───────────────

const _KNOWN_STORE_LABELS = [
  ['amazon.eg',        'Amazon.eg'],
  ['noon.com',         'Noon Egypt'],
  ['jumia.com.eg',     'Jumia Egypt'],
  ['2b.com.eg',        '2B Egypt'],
  ['btech.com',        'B.TECH'],
  ['lcwaikiki.com',    'LC Waikiki Egypt'],
  ['namshi.com',       'Namshi Egypt'],
  ['eezaby.com',       'El Ezaby'],
  ['carefer.com',      'Carefer'],
  ['carrefouregypt.com', 'Carrefour Egypt'],
  ['virgin.com.eg',    'Virgin Megastore Egypt'],
  ['ounass.com',       'Ounass Egypt'],
];

const _NON_MERCHANT_DOMAINS = [
  'wikipedia.org', 'youtube.com', 'facebook.com', 'instagram.com',
  'twitter.com', 'x.com', 'reddit.com', 'quora.com', 'pinterest.com',
  'linkedin.com', 'tiktok.com', 'blogspot.com', 'medium.com',
  'wordpress.com', 'blogger.com',
  'pricena.com', 'yaoota.com', 'egprices.com',
  'dubizzle.com', 'olx.com', 'opensooq.com',
];

// Fallback search URLs for when no priced organic results are found.
const _FALLBACK_STORES = [
  { name: 'Amazon.eg',      url: (q) => `https://www.amazon.eg/s?k=${q}` },
  { name: 'Noon Egypt',     url: (q) => `https://www.noon.com/egypt-en/search/?q=${q}` },
  { name: 'Jumia Egypt',    url: (q) => `https://www.jumia.com.eg/catalog/?q=${q}` },
  { name: 'B.TECH',         url: (q) => `https://btech.com/en/s?q=${q}` },
  { name: '2B Egypt',       url: (q) => `https://2b.com.eg/en/catalogsearch/result/?q=${q}` },
];

function _storeNameFromDomain(domain) {
  for (const [needle, label] of _KNOWN_STORE_LABELS) {
    if (domain.includes(needle)) return label;
  }
  // Derive a readable name from the domain (same logic as backend)
  let name = domain.replace(/\.(com|net|org|store|shop)?\.eg$/, '');
  name = name.replace(/\.(com|net|org|store|shop|io)$/, '');
  const parts = name.split(/[.\-_]/);
  return parts
    .map((p) => (p.length <= 3 ? p.toUpperCase() : p.charAt(0).toUpperCase() + p.slice(1)))
    .join(' ') || domain;
}

// JS port of Python _best_price_from_snippet.
// Searches the text for EGP amounts, ignores promotional contexts ("save",
// "EMI", etc.), and returns the smallest remaining candidate — same heuristic
// the backend uses.
function _extractPriceFromSnippet(text) {
  const PATTERNS = [
    /(?:EGP|L\.?E\.?)\s*([\d,]+(?:\.\d{1,2})?)/gi,
    /([\d,]+(?:\.\d{1,2})?)\s*(?:EGP|L\.?E\.)\b/gi,
    /ج\.\u0645\.?\s*([\d,]+(?:\.\d{1,2})?)/g,
    /([\d,]+(?:\.\d{1,2})?)\s*ج\.م/g,
    /([\d,]+(?:\.\d{1,2})?)\s*جنيه/g,
  ];
  const BLACKLIST = ['save', 'was', 'off', 'discount', 'emi', 'installment', '/mo', 'per month', 'monthly', 'original price'];

  const candidates = [];
  for (const pattern of PATTERNS) {
    let m;
    const re = new RegExp(pattern.source, pattern.flags);
    while ((m = re.exec(text)) !== null) {
      const context = text.slice(Math.max(0, m.index - 25), m.index).toLowerCase();
      if (BLACKLIST.some((bad) => context.includes(bad))) continue;
      const val = parseFloat((m[1] || m[0]).replace(/,/g, ''));
      if (val > 0 && val < 10_000_000) candidates.push(val);
    }
  }
  return candidates.length > 0 ? Math.min(...candidates) : null;
}

/**
 * Search Google Egypt (gl=eg) for a product query via SerpAPI.
 * requirePrice=true (default for camera scan): only return results with EGP
 *   price found in the snippet.
 * requirePrice=false (used by URL-scan supplement): accept any merchant result
 *   even without a price — shows 'Check store' so the card is still functional.
 */
async function _searchEgyptianMarket(query, requirePrice = true) {
  if (!SERPAPI_KEY) {
    console.warn('[TrustGuard] SERPAPI_KEY not set — skipping Egyptian market search');
    return [];
  }
  try {
    const qs = new URLSearchParams({
      engine: 'google',
      q: `${query} سعر مصر`,   // append Arabic "price Egypt" for better EGP results
      gl: 'eg',
      hl: 'en',
      google_domain: 'google.com.eg',
      api_key: SERPAPI_KEY,
      num: '10',
    });
    console.log('[TrustGuard] Egyptian market search →', query.slice(0, 60));
    const res = await fetch(`${SERPAPI_BASE_URL}?${qs.toString()}`);
    if (!res.ok) {
      console.warn('[TrustGuard] SerpApi Google Egypt failed:', res.status);
      return [];
    }
    const data = await res.json();

    const results = [];
    for (const item of (data.organic_results ?? [])) {
      const link = (item.link ?? '').trim();
      if (!link) continue;
      let domain;
      try { domain = new URL(link).hostname.replace('www.', ''); } catch { continue; }
      if (_NON_MERCHANT_DOMAINS.some((bad) => domain.includes(bad))) continue;

      const snippetText = `${item.snippet ?? ''} ${item.title ?? ''}`;
      const price = _extractPriceFromSnippet(snippetText);

      // When requirePrice is true (camera scan), skip results with no EGP price.
      // When false (URL-scan supplement), keep them with price=null.
      if (requirePrice && !price) continue;

      results.push({
        title: item.title ?? '',
        store: _storeNameFromDomain(domain),
        price: price ?? null,   // null means 'Check store'
        link,
      });
      if (results.length >= 8) break;
    }
    console.log('[TrustGuard] Egyptian market results:', results.length);
    return results;
  } catch (e) {
    console.warn('[TrustGuard] Egyptian market search error:', e.message);
    return [];
  }
}

// Minimal prompt — only used to extract a clean product name from Lens data
// when knowledge_graph is absent or too vague. No store-picking.
const IMAGE_DETECT_PROMPT = `You receive Google Lens results from a product photo.
Return ONLY valid JSON with a single field:
{ "detected": "<concise product name and brand if known, e.g. 'Samsung Galaxy S24' or 'Nike Air Force 1 Low White'>" }
Do not include any other field.`;


function _calculateTrustScore(result, scraped, marketResults) {
  // Start from a base score of 25
  let score = 25;

  // 1. Ratings (max 15 points)
  let ratingPoints = 0;
  const ratingVal = result.sections.ratings?.value ?? 0;
  const ratingCount = result.sections.ratings?.total ?? 0;
  if (ratingVal > 0) {
    // Up to 10 points based on star rating (e.g., 5.0/5 = 10 pts)
    ratingPoints += (ratingVal / 5) * 10;
  }
  if (ratingCount > 0) {
    // Up to 5 points based on review volume
    if (ratingCount >= 500) ratingPoints += 5;
    else if (ratingCount >= 100) ratingPoints += 4;
    else if (ratingCount >= 20) ratingPoints += 2;
    else ratingPoints += 1;
  }
  score += ratingPoints;

  // 2. Well known of the website (max 15 points)
  let sitePoints = 0;
  const scannedUrl = result.scannedUrl || scraped.scannedUrl || '';
  if (scannedUrl) {
    try {
      const host = new URL(scannedUrl).hostname.replace('www.', '').toLowerCase();
      const isKnown = _KNOWN_STORE_LABELS.some(([needle]) => host.includes(needle));
      if (isKnown) {
        sitePoints = 15;
      } else {
        sitePoints = 5;
      }
    } catch {
      sitePoints = 5;
    }
  }
  score += sitePoints;

  // 3. Certification (max 15 points)
  let certPoints = 0;
  const claims = result.sections.certificates?.claims ?? [];
  const verifiedClaims = claims.filter(c => c.verified === true);
  if (verifiedClaims.length > 0) {
    certPoints = 15;
  } else if (claims.length > 0) {
    certPoints = 5;
  }
  score += certPoints;

  // 4. Reviews (max 15 points)
  let reviewPoints = 0;
  const quotesCount = (result.sections.feedback?.quotes ?? []).length;
  if (quotesCount > 0) {
    // +3 points per review quote up to 15 max
    reviewPoints = Math.min(15, quotesCount * 3);
  }
  score += reviewPoints;

  // 5. Price compared to alternatives (max 15 points)
  let pricePoints = 0;
  const priceStatus = result.sections.price?.status;
  if (priceStatus === 'pass') {
    pricePoints = 15;
  } else if (priceStatus === 'warn') {
    pricePoints = 5;
  } else {
    pricePoints = 0;
  }
  score += pricePoints;

  // 6. Eco-friendly category bonus (+10 points)
  // Raising score if eco friendly (low impact), no decrease if moderate/harmful or missing.
  const ecoImpact = result.sections.certificates?.classification?.ecoImpact;
  if (ecoImpact === 'low') {
    score += 10;
  }

  // Round and clamp to [0, 100]
  score = Math.max(0, Math.min(100, Math.round(score)));

  // If no seller info exists at all on the page, cap score at 55 to protect users
  if (!scraped.sellerInfo) {
    score = Math.min(score, 55);
  }

  return score;
}


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

  // ── Real alternatives via Egyptian market search (same pipeline as camera scan)
  // The backend already ran _search_market (Google Egypt) and returned marketResults.
  // If that came back with fewer than 3 priced listings (cold backend, anti-bot block,
  // or a very niche product), supplement with a client-side _searchEgyptianMarket
  // call — identical to what the camera scan flow does.
  let marketData = (scraped.marketResults ?? []).filter((m) => m.link && m.price > 0);
  if (marketData.length < 3) {
    const productQuery = `${result.brand ?? ''} ${result.product ?? ''}`.trim();
    if (productQuery) {
      console.log('[TrustGuard] Supplementing alternatives with client-side Egyptian market search:', productQuery.slice(0, 60));
      // requirePrice=false: accept merchant results even without EGP in snippet
      // so we always get some results to show (price shown as 'Check store').
      const extra = await _searchEgyptianMarket(productQuery, false);
      const seenLinks = new Set(marketData.map((m) => m.link));
      const newItems  = extra.filter((m) => !seenLinks.has(m.link));
      marketData = [...marketData, ...newItems];
    }
  }
  _injectAlternatives(result, marketData);

  // ── Last-resort fallback: if BOTH backend and client-side search returned
  // nothing, show Egyptian store search links so the section is never empty.
  if ((result.alternatives ?? []).length === 0) {
    console.log('[TrustGuard] No market results — using fallback Egyptian store search links');
    const productQuery = `${result.brand ?? ''} ${result.product ?? ''}`.trim();
    const q = encodeURIComponent(productQuery || 'product');
    result.alternatives = _FALLBACK_STORES.map((store, i) => ({
      id:    `a${i + 1}`,
      brand: '',
      name:  productQuery || 'Search results',
      price: 'Check store',
      score: 75,
      store: store.name,
      link:  store.url(q),
      tone:  _ALT_TONES[i % _ALT_TONES.length],
      tags:  [],
    }));
  }


  // ── Inject real scraped page reviews directly — no LLM interpretation ──────
  // pageReviews contains verbatim text scraped from the product page itself
  // (Amazon review bodies, site testimonials, star-sentence patterns).
  // We bypass the LLM entirely for quotes so it cannot fabricate.
  const scrapedPageReviews = (scraped.pageReviews ?? []).filter(
    (r) => ((r.snippet ?? '').trim().length >= 15)
  );

  const fb = result.sections.feedback;

  if (scrapedPageReviews.length > 0) {
    // Use real scraped review text verbatim as quotes
    fb.quotes = scrapedPageReviews.slice(0, 6).map((r) => ({
      text: (r.snippet ?? '').trim(),
      src:  (r.title ?? '').trim() || 'Customer review',
      who:  '',
      sev:  'good',
    }));
    fb.status  = fb.status && fb.status !== 'warn' ? fb.status : 'pass';
    // Keep LLM-generated summary/themes (they are still useful summaries)
    // but guarantee they reflect the real reviews, not fabrication.
    if (!fb.summary || fb.summary.toLowerCase().includes('could not')) {
      fb.summary = `Based on ${scrapedPageReviews.length} customer review${scrapedPageReviews.length > 1 ? 's' : ''} scraped from the product page.`;
    }
    if (!fb.themes || fb.themes.length === 0) {
      fb.themes = [];
    }
  } else {
    // ── No page reviews — sanitize LLM quotes (may still be fabricated) ────
    fb.quotes = (fb.quotes ?? []).filter((q) => {
      const txt = (q.text ?? '').trim();
      return txt.length >= 10 && /[a-zA-Z\u0600-\u06FF]/.test(txt);
    });

    // Backfill from social snippets when LLM produced nothing usable
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

    // Wipe fabricated feedback when no real content was found at all
    if (mergedReviews.length === 0 && fb.quotes.length === 0) {
      fb.quotes  = [];
      fb.themes  = [];
      fb.sources = [];
      fb.summary = 'No customer feedback found from public sources.';
      fb.status  = 'warn';
    }
  }


  // ── Calculate deterministic trust score ──────────────────────────────────
  result.trustScore = _calculateTrustScore(result, scraped, marketData);

  return result;
}

export async function uploadToImgBB(imageUri) {
  return _uploadToImgBB(imageUri);
}

export async function searchByImage(imageUri) {
  // ── Step 1: Upload & Google Lens identify ─────────────────────────────────
  const { url: publicUrl } = await _uploadToImgBB(imageUri);
  const lensData = await _serpLens(publicUrl);

  // ── Step 2: Extract product name ──────────────────────────────────────────
  // Prefer knowledge_graph.title (Google's own entity label — most reliable).
  // Fall back to top visual match title, then use a minimal LLM call to
  // produce a cleaner name if both are too vague or missing.
  let detected =
    (lensData.knowledge_graph?.title ?? '').trim() ||
    (lensData.visual_matches?.[0]?.title ?? '').trim();

  if (!detected && GROK_API_KEY) {
    console.log('[TrustGuard] Lens gave no title — asking LLM to identify product');
    const lensPayload = {
      visual_matches: (lensData.visual_matches ?? []).slice(0, 5).map((m) => ({ title: m.title, source: m.source })),
      knowledge_graph: lensData.knowledge_graph ? { title: lensData.knowledge_graph.title, type: lensData.knowledge_graph.type } : null,
    };
    try {
      const identified = await _callLLM(IMAGE_DETECT_PROMPT, JSON.stringify(lensPayload));
      detected = (identified.detected ?? '').trim();
    } catch (e) {
      console.warn('[TrustGuard] LLM identify failed:', e.message);
    }
  }

  if (!detected) throw new Error('Could not identify the product from the photo. Please try a clearer image.');
  console.log('[TrustGuard] Detected product:', detected);

  // ── Step 3: Search Egyptian market for real listings ──────────────────────
  const marketResults = await _searchEgyptianMarket(detected);

  // ── Step 4: Build match cards from real search results ───────────────────
  const TONES = ['sage', 'cream', 'bottle', 'rose', 'sand', 'slate', 'bronze', 'forest', 'coral', 'sky', 'cocoa', 'moss'];

  let matches = marketResults.map((item, i) => ({
    id:    `p${i + 1}`,
    brand: '',
    name:  item.title,
    price: `EGP ${Math.round(item.price).toLocaleString()}`,
    score: 75,
    store: item.store,
    link:  item.link,
    tone:  TONES[i % TONES.length],
    why:   `Listed on ${item.store} in the Egyptian market`,
  }));

  // ── Step 5: Fallback — if no priced listings found, surface search URLs ───
  // This can happen when snippets contain no EGP text (rare but possible).
  // Show real Egyptian store search links so the user can still shop.
  if (matches.length === 0) {
    console.log('[TrustGuard] No priced results — using fallback store search links');
    const q = encodeURIComponent(detected);
    matches = _FALLBACK_STORES.map((store, i) => ({
      id:    `p${i + 1}`,
      brand: '',
      name:  detected,
      price: 'Check store',
      score: 75,
      store: store.name,
      link:  store.url(q),
      tone:  TONES[i % TONES.length],
      why:   `Search \"${detected}\" on ${store.name}`,
    }));
  }

  return { detected, matches };
}
