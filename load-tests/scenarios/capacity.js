// Capacity — the full SLO / capacity test, ramping to PEAK RPS (open model).
//
// ramping-arrival-rate is open-model: it drives the target rate regardless of
// whether the service keeps up. If it can't sustain PEAK you'll see latency
// breach thresholds and `dropped_iterations` appear once maxVUs is exhausted —
// that's the real per-instance capacity signal.
//
//   k6 run load-tests/scenarios/capacity.js
//   k6 run -e PEAK=1000 -e BASE_URL=http://host load-tests/scenarios/capacity.js

import { seedUrls, runTraffic } from '../lib/workload.js';
import { thresholds, setupTimeout, envInt, vuPoolFor } from '../lib/config.js';

const PEAK = envInt('PEAK', 1000);

export const options = {
  scenarios: {
    capacity: {
      executor: 'ramping-arrival-rate',
      timeUnit: '1s',
      startRate: 50,
      stages: [
        { duration: '2m', target: Math.round(PEAK * 0.2) },
        { duration: '5m', target: Math.round(PEAK * 0.5) },
        { duration: '5m', target: PEAK },
        { duration: '2m', target: 0 },
      ],
      ...vuPoolFor(PEAK),
    },
  },
  thresholds,
  setupTimeout,
};

export const setup = seedUrls;
export default runTraffic;
