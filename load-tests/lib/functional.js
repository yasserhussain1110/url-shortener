// Functional journey: a single VU iteration that exercises EVERY response path
// of the service and asserts the exact contract. Used by:
//   - scenarios/smoke.js     (1 VU, short, CI gate)
//   - scenarios/functional.js (VU ramp, dev sanity under light concurrency)
//
// Paths covered: 302 (redirect), 200 (shorten), 404 (unknown id),
// 400 (malformed body), 5xx (deliberate error endpoint).
//
// This is correctness-focused, not throughput-focused. It deliberately hits
// 4xx/5xx endpoints, so http_req_failed is gated only on the success endpoints.

import { check, sleep, group } from 'k6';
import * as api from './client.js';
import { randomUrl } from './helpers.js';

export const functionalThresholds = {
  // CI gate: abort immediately if correctness drops.
  checks: [{ threshold: 'rate>0.99', abortOnFail: true }],
  // Success paths must not error even while we deliberately drive 4xx/5xx.
  'http_req_failed{endpoint:redirect}': ['rate<0.01'],
  'http_req_failed{endpoint:shorten}': ['rate<0.02'],
};

export function runFunctional() {
  group('shorten + expand', () => {
    const url = randomUrl();
    const res = api.createShortUrl(url, 'shorten');

    check(res, {
      'shorten: status 200': (r) => r.status === 200,
    });

    if (res.status === 200) {
      const id = res.json('id');
      check(res, { 'shorten: returns id': () => id !== undefined && id !== null });

      if (id !== undefined && id !== null) {
        const expanded = api.expand(`/expand/${id}`, 'redirect');
        check(expanded, {
          'expand: status 302': (r) => r.status === 302,
          'expand: Location is original url': (r) => r.headers['Location'] === url,
        });
      }
    }
  });

  group('not found (numeric id)', () => {
    const res = api.expandMissing('not_found');
    check(res, { 'expand missing: status 404': (r) => r.status === 404 });
  });

  group('bad request (malformed body)', () => {
    const res = api.createShortUrlRaw('{"invalid_json"', 'bad_request');
    check(res, { 'shorten malformed: status 400': (r) => r.status === 400 });
  });

  group('server errors', () => {
    const res = api.triggerServerError('server_error');
    check(res, { 'error endpoint: status 5xx': (r) => r.status >= 500 });
  });

  sleep(1);
}
