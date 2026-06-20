// Open-model workload: the shared traffic shape for baseline / stress / spike /
// soak / capacity scenarios. Only the RATE differs between those scenarios; the
// shape defined here stays identical so runs are directly comparable in Grafana.
//
// Model:
//   - fixed seeded dataset of dataset.initialUrlCount short URLs (created once)
//   - hot/cold skew: hotTrafficShare of reads hit the hottest hotUrlPercent
//   - request mix: redirect / create / error  (config.mix, error = remainder)
//   - the seeded pool is NEVER mutated (k6 copies setup() data per VU, so a push
//     would only grow a VU-local copy and never be shared) — a stable working
//     set keeps latency distributions and cache behavior reproducible
//   - exactly one HTTP request per iteration => configured rate ≈ RPS
//   - correctness is asserted via check(); latency is asserted via thresholds

import { check, sleep } from 'k6';
import { dataset, mix, errorMix } from './config.js';
import { randomIntBetween, jitter } from './helpers.js';
import * as api from './client.js';
import {
  redirectSuccessRate,
  createSuccessRate,
  redirectFailures,
  createFailures,
  errorRequests,
} from './metrics.js';

function pickWeightedUrl(pool) {
  if (pool.length === 0) {
    return null;
  }

  const hotSize = Math.max(1, Math.floor(pool.length * dataset.hotUrlPercent));

  if (Math.random() < dataset.hotTrafficShare) {
    return pool[randomIntBetween(0, hotSize - 1)];
  }
  return pool[randomIntBetween(hotSize, pool.length - 1)];
}

// ---------------------------------------------------------------------------
// setup(): create the fixed, reusable dataset once before the run.
// ---------------------------------------------------------------------------
export function seedUrls() {
  console.log(`[setup] creating ${dataset.initialUrlCount} seed URLs...`);

  const created = [];
  for (let i = 0; i < dataset.initialUrlCount; i++) {
    const res = api.createShortUrl(undefined, 'shorten_seed');
    if (res.status === 200) {
      const shortUrl = res.json('shortened_url');
      if (shortUrl) {
        created.push(shortUrl);
      }
    }
  }

  console.log(`[setup] created ${created.length} seed URLs`);
  if (created.length === 0) {
    throw new Error(
      `[setup] seeded 0 URLs — is the service up at the configured BASE_URL?`
    );
  }
  return { redirectPool: created };
}

// ---------------------------------------------------------------------------
// Per-iteration traffic. One request per iteration.
// ---------------------------------------------------------------------------
function doRedirect(pool) {
  const shortUrl = pickWeightedUrl(pool);
  if (!shortUrl) {
    return;
  }

  const res = api.expand(shortUrl, 'redirect');

  const ok = check(res, {
    'redirect: status 200': (r) => r.status === 200,
    'redirect: body has url': (r) => r.json('url') !== undefined,
  });

  redirectSuccessRate.add(ok);
  if (!ok) {
    redirectFailures.add(1);
  }

  sleep(jitter(0.5));
}

function doCreate() {
  const res = api.createShortUrl(undefined, 'shorten');

  // 200 = created, 409 = duplicate URL — both are valid, non-error outcomes.
  const ok = check(res, {
    'shorten: status 200 or 409': (r) => r.status === 200 || r.status === 409,
    'shorten: returns short url when created': (r) =>
      r.status !== 200 || r.json('shortened_url') !== undefined,
  });

  createSuccessRate.add(ok);
  if (!ok) {
    createFailures.add(1);
  }

  sleep(jitter(1));
}

function doError() {
  errorRequests.add(1);

  if (Math.random() < errorMix.notFoundShare) {
    const res = api.expandMissing('not_found');
    check(res, { 'not_found: status 404': (r) => r.status === 404 });
  } else {
    const res = api.createShortUrlRaw('{"invalid_json"', 'bad_request');
    check(res, {
      'bad_request: status 400': (r) => r.status === 400,
    });
  }

  sleep(jitter(1));
}

export function runTraffic(data) {
  const pool = data.redirectPool;
  const r = Math.random();

  if (r < mix.redirect) {
    doRedirect(pool);
  } else if (r < mix.redirect + mix.create) {
    doCreate();
  } else {
    doError();
  }
}
