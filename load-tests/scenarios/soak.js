// Soak — sustained moderate load for a long duration (open model).
// Surfaces slow problems: memory leaks, connection-pool exhaustion, GC drift,
// disk/log growth. Watch JVM heap + Hikari pool metrics in Grafana over time.
//
//   k6 run load-tests/scenarios/soak.js
//   k6 run -e RATE=150 -e DURATION=2h -e BASE_URL=http://host:9000 load-tests/scenarios/soak.js

import { seedUrls, runTraffic } from '../lib/workload.js';
import { thresholds, envInt, envStr, vuPoolFor } from '../lib/config.js';

const RATE = envInt('RATE', 150);

export const options = {
  scenarios: {
    soak: {
      executor: 'constant-arrival-rate',
      rate: RATE,
      timeUnit: '1s',
      duration: envStr('DURATION', '30m'),
      ...vuPoolFor(RATE),
    },
  },
  thresholds,
};

export const setup = seedUrls;
export default runTraffic;
