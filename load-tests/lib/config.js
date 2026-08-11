// Central configuration for the load-testing suite.
//
// Everything tunable lives here and is overridable via `-e KEY=value` env vars,
// so the same scripts run unchanged across laptop / CI / staging by only
// changing environment variables.

export function envInt(name, def) {
  const v = __ENV[name];
  return v === undefined ? def : parseInt(v, 10);
}

export function envFloat(name, def) {
  const v = __ENV[name];
  return v === undefined ? def : parseFloat(v);
}

export function envStr(name, def) {
  const v = __ENV[name];
  return v === undefined ? def : v;
}

// Target service. Defaults to the nginx front on :80 (which reverse-proxies to
// the app on :9000 and caches /expand) so load tests exercise the real edge
// path. Point BASE_URL straight at the app (e.g. http://localhost:9000) to
// bypass nginx.
export const BASE_URL = envStr('BASE_URL', 'http://localhost:80');

// Max time allowed for setup() to seed the dataset. Seeding is serial (one POST
// per URL), so the default 5000-URL pool takes ~1-2 min — well past k6's default
// setupTimeout of 60s. Bump this (or lower INITIAL_URL_COUNT) for big seeds.
export const setupTimeout = envStr('SETUP_TIMEOUT', '300s');

// Seeded dataset + access pattern (Zipf-like hot/cold skew).
export const dataset = {
  // Number of short URLs created once in setup() and reused (read-heavy model).
  initialUrlCount: envInt('INITIAL_URL_COUNT', 5000),
  // Fraction of the pool considered "hot".
  hotUrlPercent: envFloat('HOT_URL_PERCENT', 0.2),
  // Fraction of redirect traffic that targets the hot subset.
  hotTrafficShare: envFloat('HOT_TRAFFIC_SHARE', 0.8),
};

// Request mix. Error traffic is the remainder (1 - redirect - create).
export const mix = {
  redirect: envFloat('REDIRECT_RATIO', 0.9),
  create: envFloat('CREATE_RATIO', 0.08),
};

// Within error traffic, fraction that is a 404 lookup (rest is a malformed body).
export const errorMix = {
  notFoundShare: envFloat('NOT_FOUND_SHARE', 0.7),
};

// =========================================================
// SLO thresholds (shared by all open-model scenarios)
// =========================================================
//
// Notes:
//  - Failures are gated PER success-endpoint (tagged), not globally. The model
//    sends deliberate 4xx/5xx error traffic which k6 counts as http_req_failed,
//    so a global `http_req_failed<0.01` would breach by design.
//  - A 302 (the redirect happy path) is NOT counted as a failure by k6
//    (only status >= 400 is), so the redirect gate stays clean.
//  - Latency is asserted via http_req_duration thresholds (not via check()), so
//    the `checks` rate stays a pure correctness signal.
export const thresholds = {
  // Read path — the SLO that matters most for a URL shortener.
  'http_req_failed{endpoint:redirect}': ['rate<0.01'],
  'http_req_duration{endpoint:redirect}': ['p(95)<100', 'p(99)<200'],

  // Write path. Duplicates return the existing row (200), so writes shouldn't
  // error at all; a small slack absorbs transient blips under load.
  'http_req_failed{endpoint:shorten}': ['rate<0.02'],
  'http_req_duration{endpoint:shorten}': ['p(95)<300'],

  // Overall correctness of assertions and read availability.
  checks: ['rate>0.99'],
  redirect_success_rate: ['rate>0.99'],

  // Generator honesty. When an arrival-rate executor can't get a free VU for a
  // scheduled arrival it DROPS the iteration instead of sending it, and k6
  // otherwise only reports this as a buried WARN — the run then quietly delivers
  // fewer RPS than configured. Gate on it so a shortfall is a loud, non-zero-exit
  // failure. A non-zero count means either the service is too slow to keep up at
  // this rate, or the VU pool is too small (raise PRE_VUS / MAX_VUS /
  // LOAD_VU_CEILING) — never a silently understated result.
  dropped_iterations: ['count<1'],
};

// Suggested VU pool sizing for an arrival-rate scenario at a given peak RPS.
// An open-model executor needs a free VU to send each scheduled arrival, so the
// pool must cover the in-flight concurrency. With no think-time (see
// workload.js) that concurrency is driven purely by server latency:
// VUs ≈ rate × request_latency. For a fast redirect (tens of ms) that's a small
// fraction of the rate, so we preallocate a light 0.1x peak (enough to start a
// ramp without stalling) and let the pool grow on demand up to a 3x peak cap
// (headroom for latency up to a few seconds).
//
// Each VU is a JS runtime plus its own copy of the seed pool, so a large pool
// can OOM a modest load box before the service is the bottleneck. The old
// 0.5x-peak preallocation was sized for a think-time model and would eagerly
// reserve e.g. 750 VUs at 1500 RPS — enough to exhaust a ~2GB box at startup.
// PRE_VUS / MAX_VUS let you pin the pool to what the box can hold; if it's too
// small for the rate, k6 now fails the gated `dropped_iterations` threshold
// (see above) instead of silently under-delivering or being OOM-killed.
//
// Note: multi-executor scenarios (target.js) call this per executor, so PRE_VUS
// applies to EACH executor — set it to the per-executor budget, not the total.
//
// The pool is capped by LOAD_VU_CEILING (default 500, sized for a ~2GB load
// box) so a bare `k6 run` can't spin up enough VUs to OOM the generator. Raise
// the ceiling (or PRE_VUS / MAX_VUS) on a bigger box or at high RPS (e.g.
// target.js at 10k read RPS wants a ceiling well above the 500 default).
export function vuPoolFor(peakRate) {
  const ceiling = envInt('LOAD_VU_CEILING', 500);
  return {
    preAllocatedVUs: envInt('PRE_VUS', Math.min(Math.max(50, Math.ceil(peakRate * 0.1)), ceiling)),
    maxVUs: envInt('MAX_VUS', Math.min(Math.max(200, peakRate * 3), ceiling)),
  };
}
