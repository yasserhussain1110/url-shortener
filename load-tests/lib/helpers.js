// Pure, side-effect-free helpers shared across the suite.
// No imports, no metrics, no module-level state — safe to import anywhere.

const ALPHANUM =
  'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

export function randomString(length) {
  let result = '';
  for (let i = 0; i < length; i++) {
    result += ALPHANUM.charAt(Math.floor(Math.random() * ALPHANUM.length));
  }
  return result;
}

export function randomIntBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// A unique-enough https URL (62^12 keyspace => collisions are negligible).
export function randomUrl() {
  return `https://example.com/${randomString(12)}`;
}
