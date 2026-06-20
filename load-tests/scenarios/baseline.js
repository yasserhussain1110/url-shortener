// Baseline — steady-state RPS for regression comparisons (open model).
//
// constant-arrival-rate holds a fixed request rate regardless of latency, so
// this is the run you diff against after a change to catch regressions.
//
//   k6 run load-tests/scenarios/baseline.js
//   k6 run -e RATE=200 -e DURATION=10m -e BASE_URL=http://host:9000 load-tests/scenarios/baseline.js

import { seedUrls, runTraffic } from '../lib/workload.js';
import { thresholds, setupTimeout, envInt, envStr, vuPoolFor } from '../lib/config.js';

const RATE = envInt('RATE', 100);

export const options = {
  scenarios: {
    baseline: {
      executor: 'constant-arrival-rate',
      rate: RATE,
      timeUnit: '1s',
      duration: envStr('DURATION', '5m'),
      ...vuPoolFor(RATE),
    },
  },
  thresholds,
  setupTimeout,
};

export const setup = seedUrls;
export default runTraffic;
