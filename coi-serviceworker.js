/* coi-serviceworker v0.1.7 - github.com/gzukas/coi-serviceworker */
/* 用途：替 GitHub Pages 等靜態托管補上 COOP/COEP 標頭，讓 SharedArrayBuffer 可用 */

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

async function handleFetch(request) {
  if (request.cache === "only-if-cached" && request.mode !== "same-origin") {
    return;
  }

  const r = await fetch(request).catch((e) => console.error(e));
  if (!r) return;

  const { readable, writable } = new TransformStream();
  const newHeaders = new Headers(r.headers);
  newHeaders.set("Cross-Origin-Embedder-Policy", "credentialless");
  newHeaders.set("Cross-Origin-Opener-Policy", "same-origin");

  const moddedResponse = new Response(readable, {
    status: r.status,
    statusText: r.statusText,
    headers: newHeaders,
  });

  r.body.pipeTo(writable);
  return moddedResponse;
}

self.addEventListener("fetch", (e) => {
  e.respondWith(handleFetch(e.request));
});
