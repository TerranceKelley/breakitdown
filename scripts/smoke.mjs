/**
 * Breakitdown local smoke test.
 *
 * Usage:
 *   node scripts/smoke.mjs
 *
 * Assumes the app is running locally (e.g. `npm run dev`) on PORT (default 3000).
 */

const baseUrl = `http://localhost:${process.env.PORT || 3000}`;

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const postJson = async (path, body) => {
  const res = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`${path}: expected JSON but got: ${text.slice(0, 200)}`);
  }
  return { status: res.status, json };
};

const getJson = async (path) => {
  const res = await fetch(`${baseUrl}${path}`);
  const json = await res.json();
  return { status: res.status, json };
};

console.log(`Smoke testing: ${baseUrl}`);

const health = await getJson("/api/health");
console.log("health:", health.status, health.json.status);
assert(health.status === 200 || health.status === 503, "health: unexpected status");

const breakdown = await postJson("/api/breakdown", {
  concept: { title: "Breakitdown smoke test", description: "Make sure the API works." },
});

assert(breakdown.status === 200, "breakdown: expected 200");
assert(Array.isArray(breakdown.json.concepts), "breakdown: concepts must be an array");
assert(breakdown.json.concepts.length > 0, "breakdown: expected at least 1 concept");
assert(!!breakdown.json.concepts[0].title, "breakdown: concept[0].title missing");
assert(!!breakdown.json.concepts[0].description, "breakdown: concept[0].description missing");
console.log("breakdown: OK");

console.log("Smoke test: PASS");

