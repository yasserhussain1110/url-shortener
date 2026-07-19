// Thin transport layer for the URL-shortener HTTP contract.
//
// One place that knows the actual endpoints, methods, headers and tags. Every
// scenario builds traffic out of these functions, so if the API changes we
// update it here only. Assertions live in the scenarios, not here, so different
// scenarios can assert differently against the same transport.
//
// Contract (Spring Boot — see UrlController / ErrorController):
//   POST /shorten      {"original_url":"..."} -> 200 {"id":<Long>,"original_url":"..."}
//                                                 a duplicate URL returns the
//                                                 existing row (also 200), never 409
//                                                 a malformed JSON body         -> 400
//   GET  /expand/{id}  (id binds as Long)      -> 302 Location: <original_url>
//                                                 unknown numeric id            -> 404
//                                                 non-numeric id                -> 400
//   GET  /fault/{code} (code binds as int)     -> responds with that status (deliberate 5xx)
//
// Jackson is configured with SNAKE_CASE (application.properties), so the JSON
// keys on the wire are snake_case: `original_url`, `id`.

import http from 'k6/http';
import { BASE_URL } from './config.js';
import { randomUrl, randomIntBetween } from './helpers.js';

const JSON_HEADERS = { 'Content-Type': 'application/json' };

export function createShortUrl(url = randomUrl(), endpoint = 'shorten') {
  return http.post(`${BASE_URL}/shorten`, JSON.stringify({ original_url: url }), {
    headers: JSON_HEADERS,
    tags: { endpoint },
  });
}

// Post an arbitrary (e.g. malformed) body to exercise the 400 path.
export function createShortUrlRaw(body, endpoint = 'bad_request') {
  return http.post(`${BASE_URL}/shorten`, body, {
    headers: JSON_HEADERS,
    tags: { endpoint },
  });
}

// Follow a short link, e.g. "/expand/42". The endpoint answers with a 302 whose
// Location header holds the original URL, so redirects are disabled here: we
// want to measure (and assert) the redirect response itself, not chase it out
// to the external target.
export function expand(shortPath, endpoint = 'redirect') {
  return http.get(`${BASE_URL}${shortPath}`, {
    redirects: 0,
    // Group all /expand/{id} hits under one series — the id is high-cardinality
    // and would otherwise create a unique time series per request.
    tags: { endpoint, name: 'expand/{id}' },
  });
}

// Hit a numeric id that won't exist to exercise the real 404 path.
// NOTE: the route binds id as Long, so a NON-numeric id returns 400, not 404.
export function expandMissing(endpoint = 'not_found') {
  const id = randomIntBetween(900000000, 999999999);
  return http.get(`${BASE_URL}/expand/${id}`, {
    redirects: 0,
    // Random id spans a ~100M range; group under one series to avoid a metric
    // time series per request.
    tags: { endpoint, name: 'expand/missing' },
  });
}

// /fault/{code} echoes the numeric status code back, so these all yield 5xx.
// (A non-numeric code like "throw" would fail int binding and return 400.)
const ERROR_CODES = ['500', '502', '503'];

// Hit one of the deliberate 5xx endpoints.
export function triggerServerError(endpoint = 'server_error') {
  const code = ERROR_CODES[Math.floor(Math.random() * ERROR_CODES.length)];
  return http.get(`${BASE_URL}/fault/${code}`, { tags: { endpoint } });
}
