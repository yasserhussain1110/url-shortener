// Thin transport layer for the URL-shortener HTTP contract.
//
// One place that knows the actual endpoints, methods, headers and tags. Every
// scenario builds traffic out of these functions, so if the API changes we
// update it here only. Assertions live in the scenarios, not here, so different
// scenarios can assert differently against the same transport.
//
// Contract (see conf/routes + controllers):
//   POST /shorten      {"url": "..."}  -> 200 {shortened_url}, 409 dup, 400 bad
//   GET  /expand/:id   (id: Long)      -> 200 {url}, 404 missing, 400 non-numeric id
//   GET  /error/:code                  -> deliberate 5xx
//   GET  /                             -> index page

import http from 'k6/http';
import { BASE_URL } from './config.js';
import { randomUrl, randomIntBetween } from './helpers.js';

const JSON_HEADERS = { 'Content-Type': 'application/json' };

export function createShortUrl(url = randomUrl(), endpoint = 'shorten') {
  return http.post(`${BASE_URL}/shorten`, JSON.stringify({ url }), {
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

// Follow a short link returned by /shorten, e.g. "/expand/42".
export function expand(shortPath, endpoint = 'redirect') {
  return http.get(`${BASE_URL}${shortPath}`, { tags: { endpoint } });
}

// Hit a numeric id that won't exist to exercise the real 404 path.
// NOTE: the route binds id as Long, so a NON-numeric id returns 400, not 404.
export function expandMissing(endpoint = 'not_found') {
  const id = randomIntBetween(900000000, 999999999);
  return http.get(`${BASE_URL}/expand/${id}`, { tags: { endpoint } });
}

const ERROR_CODES = ['500', 'throw', '502', '503'];

// Hit one of the deliberate 5xx endpoints.
export function triggerServerError(endpoint = 'server_error') {
  const code = ERROR_CODES[Math.floor(Math.random() * ERROR_CODES.length)];
  return http.get(`${BASE_URL}/error/${code}`, { tags: { endpoint } });
}

export function getIndex(endpoint = 'index') {
  return http.get(`${BASE_URL}/`, { tags: { endpoint } });
}
