/**
 * Deterministic "featured today" selection — same N picks for everyone all
 * day, a different N tomorrow, no backend or database needed. The date
 * itself is the seed, so it's naturally stable within a day and rotates
 * at midnight in the visitor's local time.
 */

function seedFromDate(date) {
  return date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate();
}

function mulberry32(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function pickDaily(pool, count = 5, date = new Date()) {
  const rand = mulberry32(seedFromDate(date));
  const arr = [...pool];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.slice(0, count);
}
