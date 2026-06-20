// Spike — a sudden surge then recovery, mimicking a viral link (open model).
// Tests how the read cache + DB cope with an abrupt jump and whether latency
// recovers once the surge passes.
//
//   k6 run load-tests/scenarios/spike.js
//   k6 run -e BASELINE=100 -e PEAK=1500 -e BASE_URL=http://host:9000 load-tests/scenarios/spike.js

import { seedUrls, runTraffic } from '../lib/workload.js';
import { thresholds, envInt, vuPoolFor } from '../lib/config.js';

const BASELINE = envInt('BASELINE', 100);
const PEAK = envInt('PEAK', 1500);

export const options = {
  scenarios: {
    spike: {
      executor: 'ramping-arrival-rate',
      timeUnit: '1s',
      startRate: BASELINE,
      stages: [
        { duration: '1m', target: BASELINE }, // warm steady state
        { duration: '15s', target: PEAK }, // sudden surge
        { duration: '1m', target: PEAK }, // hold the spike
        { duration: '15s', target: BASELINE }, // drop back
        { duration: '2m', target: BASELINE }, // observe recovery
        { duration: '30s', target: 0 },
      ],
      ...vuPoolFor(PEAK),
    },
  },
  // Latency is expected to breach briefly at the spike; thresholds still flag
  // failure to recover. Keep gating on the read path's failure rate.
  thresholds,
};

export const setup = seedUrls;
export default runTraffic;
