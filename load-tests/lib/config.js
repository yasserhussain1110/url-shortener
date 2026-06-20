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

// Target service.
export const BASE_URL = envStr('BASE_URL', 'http://localhost:9000');

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
};

// Suggested VU pool sizing for an arrival-rate scenario at a given peak RPS.
// Open-model executors need enough VUs to sustain the rate when latency rises.
export function vuPoolFor(peakRate) {
  return {
    preAllocatedVUs: Math.max(50, Math.ceil(peakRate * 0.5)),
    maxVUs: Math.max(200, peakRate * 3),
  };
}
