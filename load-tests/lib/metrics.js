// Shared custom metrics. Defined once and imported where needed so every
// scenario reports the same series (and thresholds can reference them).

import { Counter, Rate } from 'k6/metrics';

// Availability of the read path (status 200 on a known-good short URL).
export const redirectSuccessRate = new Rate('redirect_success_rate');

// Availability of the write path (status 200 on /shorten).
export const createSuccessRate = new Rate('create_success_rate');

// Raw failure counters for quick triage in the summary.
export const redirectFailures = new Counter('redirect_failures');
export const createFailures = new Counter('create_failures');
export const errorRequests = new Counter('error_requests');
