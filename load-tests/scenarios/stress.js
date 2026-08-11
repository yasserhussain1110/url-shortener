// Stress — ramp the request rate up to PEAK to find where latency degrades
// (open model). Bridges baseline (100 RPS) and capacity (1000 RPS).
//
//   k6 run load-tests/scenarios/stress.js
//   k6 run -e PEAK=800 -e BASE_URL=http://host load-tests/scenarios/stress.js

import { seedUrls, runTraffic } from '../lib/workload.js';
import { thresholds, setupTimeout, envInt, vuPoolFor } from '../lib/config.js';

const PEAK = envInt('PEAK', 500);

export const options = {
  scenarios: {
    stress: {
      executor: 'ramping-arrival-rate',
      timeUnit: '1s',
      startRate: 50,
      stages: [
        { duration: '2m', target: Math.round(PEAK * 0.4) },
        { duration: '3m', target: Math.round(PEAK * 0.7) },
        { duration: '3m', target: PEAK },
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
