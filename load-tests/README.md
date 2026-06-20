# Load testing suite

A [k6](https://k6.io/) load-testing suite for the URL shortener. Scenarios share
a single traffic model and contract layer, so results are reproducible and
directly comparable across runs and load levels.

## Layout

```
load-tests/
├── lib/
│   ├── config.js      # env-driven config + tag-scoped SLO thresholds
│   ├── helpers.js     # pure helpers (random*, jitter)
│   ├── client.js      # transport: one place that knows the HTTP contract
│   ├── metrics.js     # shared custom metrics
│   ├── workload.js    # open-model weighted traffic (seed + runTraffic)
│   └── functional.js  # all-paths correctness journey
└── scenarios/         # k6 entrypoints (run these)
    ├── smoke.js       # 1 VU, ~30s — CI correctness gate
    ├── functional.js  # VU ramp — dev sanity under light concurrency
    ├── baseline.js    # steady 100 RPS — regression baseline
    ├── stress.js      # ramp to 500 RPS — find degradation point
    ├── spike.js       # surge to 1500 RPS then recover — viral-link sim
    ├── soak.js        # 150 RPS for 30m+ — leaks / pool exhaustion
    ├── capacity.js    # ramp to 1000 RPS — find the per-instance ceiling
    └── target.js      # 10,000 read + 1,000 write RPS — the production SLO target
```

`lib/` is the single source of truth; the files in `scenarios/` are thin
wrappers that only set the executor + rate and reuse the shared model.

## The scenarios

| Scenario | Executor | Model | Default load | Purpose |
| --- | --- | --- | --- | --- |
| `smoke` | `constant-vus` | closed | 1 VU / 30s | Fast correctness gate; aborts on first regression. |
| `functional` | `ramping-vus` | closed | →50 VUs | Exercise every path (302/200/404/400/5xx) under light concurrency. |
| `baseline` | `constant-arrival-rate` | open | 100 RPS / 5m | Stable steady state to diff against for regressions. |
| `stress` | `ramping-arrival-rate` | open | →500 RPS | Find where latency starts to degrade. |
| `spike` | `ramping-arrival-rate` | open | 100→1500→100 RPS | Sudden surge + recovery (cache/DB resilience). |
| `soak` | `constant-arrival-rate` | open | 150 RPS / 30m | Long run to surface leaks and resource exhaustion. |
| `capacity` | `ramping-arrival-rate` | open | →1000 RPS | Find the per-instance throughput ceiling. |
| `target` | `ramping-arrival-rate` ×2 | open | 10,000 read + 1,000 write RPS | Verify the service holds the **production SLO target** (see below). |

Open-model scenarios make **one HTTP request per iteration**, so the configured
arrival `rate` (iterations/sec) ≈ **requests/sec (RPS)**.

## Target load (the SLO this service is sized for)

The service is sized for a sustained production load of:

| Traffic | Target throughput |
| --- | --- |
| **Reads** (`GET /expand/{id}` redirects) | **10,000 RPS** |
| **Writes** (`POST /shorten`) | **1,000 RPS** |

That's a **10:1 read:write ratio** — still read-heavy, as expected for a URL
shortener (links are resolved more often than they're created). The `target`
scenario reproduces it exactly: reads and writes run as **two independent
open-model executors at the same time**, each with its own arrival rate, rather
than as one weighted mix. This way the read and write rates are set explicitly
and can be tuned independently via `READ_RPS` / `WRITE_RPS`.

```bash
# Validate the service against the target SLO (defaults: 10k read + 1k write RPS)
k6 run load-tests/scenarios/target.js

# Same shape at half load, held for 15m, against staging
k6 run -e READ_RPS=5000 -e WRITE_RPS=500 -e DURATION=15m \
  -e BASE_URL=https://staging.example.com load-tests/scenarios/target.js
```

The same SLO latency/error thresholds (below) apply, so a clean exit means the
instance held 10k read + 1k write RPS within SLO. A latency-threshold breach or
`dropped_iterations` in the summary means it could not.

> 10k RPS is a real load: the k6 host (and its file-descriptor / ephemeral-port
> limits) must be able to generate it, and an HTTP keep-alive–friendly setup
> helps. Run it from a dedicated load box, not the same machine as the service.

## Traffic model (open-model scenarios)

- **Fixed seeded dataset** — `setup()` creates `INITIAL_URL_COUNT` (default 5000)
  short URLs once. The pool is **never mutated** during the run: k6 copies
  `setup()` data per VU, so a push would only grow a VU-local copy and never be
  shared. A stable working set keeps latency distributions and cache behavior
  reproducible across runs.
- **Hot/cold skew** — `HOT_TRAFFIC_SHARE` (80%) of reads hit the hottest
  `HOT_URL_PERCENT` (20%) of URLs — Zipf-like production traffic.
- **Request mix** — `REDIRECT_RATIO` / `CREATE_RATIO` / error remainder
  (default 90% / 8% / 2%).

## Contract notes (matched to the actual app)

These were verified against the Spring Boot controllers (`UrlController`,
`ErrorController`) and `application.properties`:

- **Snake-case JSON.** Jackson is configured with `SNAKE_CASE`, so the wire
  format is `{"original_url": "..."}` on the request and
  `{"id": <Long>, "original_url": "..."}` on the response. The short link is
  just `/expand/{id}` built from the returned `id`.
- `POST /shorten` returns **200** for both a new URL and a duplicate — a
  duplicate returns the existing row, so there is **no 409**.
- `GET /expand/{id}` returns a **302** with the original URL in the `Location`
  header (not a `200` with a JSON body). The client disables redirect-following
  (`redirects: 0`) so it measures/asserts the 302 itself instead of chasing it
  out to the external target.
- `GET /expand/{id}` binds `id` as a **`Long`**. A non-numeric id returns **400**,
  not 404 — so the 404 path uses a large **numeric** id that won't exist
  (`lib/client.js#expandMissing`).
- `POST /shorten` with a malformed JSON body returns **400**.
- Deliberate 5xx come from `GET /fault/{code}`, which echoes the numeric status
  code. The suite uses `500` / `502` / `503`. Note a non-numeric code (e.g.
  `throw`) fails `int` binding and returns **400**, not a 5xx. (This lives on
  `/fault`, not `/error`, to avoid colliding with Spring Boot's reserved
  `/error` dispatch path.)

## SLO thresholds

Defined in `lib/config.js`. Two deliberate design choices:

- **Failures are gated per success-endpoint, not globally.** The model sends ~2%
  deliberate 4xx/5xx error traffic, which k6 counts in `http_req_failed`. A
  global `http_req_failed<0.01` would therefore breach *by design*, so failures
  are gated on tagged sub-metrics instead:

| Threshold | Gate |
| --- | --- |
| `http_req_failed{endpoint:redirect}` | `rate < 0.01` (302 isn't counted as a failure) |
| `http_req_failed{endpoint:shorten}` | `rate < 0.02` |
| `http_req_duration{endpoint:redirect}` | `p95 < 100ms`, `p99 < 200ms` |
| `http_req_duration{endpoint:shorten}` | `p95 < 300ms` |
| `checks` | `rate > 0.99` |
| `redirect_success_rate` | `rate > 0.99` |

- **Latency is asserted via thresholds, not `check()`.** Keeping latency out of
  `check()` means the `checks` rate stays a pure correctness signal and isn't
  dragged down when latency rises under load.

Threshold breaches set a non-zero k6 exit code, so any scenario doubles as a
CI/CD gate.

## Running

```bash
# CI gate
k6 run load-tests/scenarios/smoke.js

# The ladder (run in order, compare in Grafana)
k6 run load-tests/scenarios/baseline.js
k6 run load-tests/scenarios/stress.js
k6 run load-tests/scenarios/capacity.js

# Production SLO target: 10,000 read + 1,000 write RPS
k6 run load-tests/scenarios/target.js

# Resilience
k6 run load-tests/scenarios/spike.js
k6 run load-tests/scenarios/soak.js
```

Export results for CI artifacts / offline analysis:

```bash
k6 run --summary-export=summary.json load-tests/scenarios/capacity.js
# or stream raw points:
k6 run --out json=results.json load-tests/scenarios/baseline.js
```

## Configuration (env vars)

All overridable with `-e KEY=value`:

| Var | Default | Applies to | Description |
| --- | --- | --- | --- |
| `BASE_URL` | `http://localhost:9000` | all | Target service base URL. |
| `INITIAL_URL_COUNT` | `5000` | open-model | Seed URLs created in `setup()`. Lower for quick runs. |
| `HOT_URL_PERCENT` | `0.2` | open-model | Fraction of pool that is "hot". |
| `HOT_TRAFFIC_SHARE` | `0.8` | open-model | Fraction of reads hitting the hot subset. |
| `REDIRECT_RATIO` | `0.9` | open-model | Share of read traffic. |
| `CREATE_RATIO` | `0.08` | open-model | Share of write traffic (error = remainder). |
| `RATE` | `100` / `150` | baseline / soak | Constant arrival rate (RPS). |
| `PEAK` | `500` / `1000` / `1500` | stress / capacity / spike | Peak arrival rate (RPS). |
| `BASELINE` | `100` | spike | Steady rate around the spike. |
| `READ_RPS` | `10000` | target | Sustained read (redirect) rate. |
| `WRITE_RPS` | `1000` | target | Sustained write (shorten) rate. |
| `WARMUP` | `1m` | target | Ramp-up time before holding at target. |
| `DURATION` | scenario-specific | smoke / baseline / soak / target | Run duration (hold time for `target`). |

```bash
# Example: capacity test to 2000 RPS against staging with a smaller seed set
k6 run -e BASE_URL=https://staging.example.com -e PEAK=2000 -e INITIAL_URL_COUNT=2000 \
  load-tests/scenarios/capacity.js
```

> Seed URLs are created serially in `setup()` before the run starts, so a large
> `INITIAL_URL_COUNT` adds warm-up time.

## Suggested workflow

1. `smoke` — gate correctness (fast, in CI on every change).
2. `baseline` — record the steady-state numbers; diff future runs against it.
3. `stress` → `capacity` — find the degradation point and per-instance ceiling.
4. `target` — confirm the instance holds the production SLO (10k read + 1k write RPS).
5. `spike` / `soak` — resilience and stability before a release.

Watch the app's Grafana dashboard during runs — `http.server.requests` latency
and error rate, JVM heap/GC, and the HikariCP pool metrics — to correlate k6's
client-side view with server-side pressure.
