// Functional load test — dev sanity under light concurrency (closed model).
//
// Ramps a modest number of VUs and exercises every response path
// (200 / 409 / 404 / 400 / 5xx). Use while developing to confirm correctness
// holds under some concurrency. For throughput/capacity use the open-model
// scenarios (baseline/stress/spike/soak/capacity).
//
//   k6 run load-tests/scenarios/functional.js
//   k6 run -e BASE_URL=http://host:9000 load-tests/scenarios/functional.js

import { functionalThresholds, runFunctional } from '../lib/functional.js';

export const options = {
  scenarios: {
    functional: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 20 },
        { duration: '1m', target: 20 },
        { duration: '30s', target: 50 },
        { duration: '1m', target: 50 },
        { duration: '30s', target: 0 },
      ],
      gracefulRampDown: '10s',
    },
  },
  // Drop the abortOnFail used by smoke: under concurrency we want the full run.
  thresholds: {
    ...functionalThresholds,
    checks: ['rate>0.99'],
  },
};

export default runFunctional;
