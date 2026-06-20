// Target load — the production SLO this service is sized for:
//   ~10,000 read (redirect) RPS  +  ~1,000 write (shorten) RPS, sustained.
//
// Reads and writes are independent open-model scenarios running concurrently,
// each with its own arrival rate, so the read:write ratio is set explicitly
// (10:1) instead of falling out of a single weighted mix. Each iteration is
// exactly one request, so the configured rate ≈ RPS. There's no per-iteration
// think-time here: at 10k RPS the arrival-rate executor controls the rate and
// sleep would only blow up the VU pool.
//
// This is the run that answers "can one instance hold our target load within
// SLO?". If it can't, latency thresholds breach and/or `dropped_iterations`
// appears once maxVUs is exhausted.
//
//   k6 run load-tests/scenarios/target.js
//   k6 run -e READ_RPS=10000 -e WRITE_RPS=1000 -e DURATION=15m \
//     -e BASE_URL=http://host:9000 load-tests/scenarios/target.js

import { seedUrls, redirectAction, createAction } from '../lib/workload.js';
import { thresholds, envInt, envStr, vuPoolFor } from '../lib/config.js';

const READ_RPS = envInt('READ_RPS', 10000);
const WRITE_RPS = envInt('WRITE_RPS', 1000);
const WARMUP = envStr('WARMUP', '1m'); // ramp up to target before holding
const DURATION = envStr('DURATION', '10m'); // hold at target

export const options = {
  scenarios: {
    reads: {
      executor: 'ramping-arrival-rate',
      exec: 'reads',
      timeUnit: '1s',
      startRate: Math.max(1, Math.round(READ_RPS * 0.1)),
      stages: [
        { duration: WARMUP, target: READ_RPS },
        { duration: DURATION, target: READ_RPS },
        { duration: '30s', target: 0 },
      ],
      ...vuPoolFor(READ_RPS),
    },
    writes: {
      executor: 'ramping-arrival-rate',
      exec: 'writes',
      timeUnit: '1s',
      startRate: Math.max(1, Math.round(WRITE_RPS * 0.1)),
      stages: [
        { duration: WARMUP, target: WRITE_RPS },
        { duration: DURATION, target: WRITE_RPS },
        { duration: '30s', target: 0 },
      ],
      ...vuPoolFor(WRITE_RPS),
    },
  },
  thresholds,
};

export const setup = seedUrls;

export function reads(data) {
  redirectAction(data.redirectPool);
}

export function writes() {
  createAction();
}
