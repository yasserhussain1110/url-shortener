// Smoke test — fast correctness gate (CI / pre-deploy).
//
// 1 VU exercising every response path for a short window. Aborts on the first
// correctness regression. Not a throughput test.
//
//   k6 run load-tests/scenarios/smoke.js
//   k6 run -e BASE_URL=http://host:9000 load-tests/scenarios/smoke.js

import { functionalThresholds, runFunctional } from '../lib/functional.js';
import { envStr } from '../lib/config.js';

export const options = {
  scenarios: {
    smoke: {
      executor: 'constant-vus',
      vus: 1,
      duration: envStr('DURATION', '30s'),
    },
  },
  thresholds: functionalThresholds,
};

export default runFunctional;
