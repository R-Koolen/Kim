// Tiny pub/sub so PUT /api/state can push the new document to every open
// GET /api/stream connection (README §4A "push to all SSE clients").
const subscribers = new Set();

export function subscribe(fn) {
  subscribers.add(fn);
  return () => subscribers.delete(fn);
}

export function publish(doc) {
  for (const fn of subscribers) fn(doc);
}
