/* Suez Stray Tracker service worker.
 * - Receives Web Push notifications and shows them.
 * - Routes notification taps to the right screen.
 * - Lightweight offline shell so the app opens without a connection.
 */
const CACHE = "suez-shell-v1";
const SHELL = ["/map", "/manifest.webmanifest", "/icons/icon-192.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).catch(() => {}));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))),
  );
  self.clients.claim();
});

// Network-first for navigations, falling back to the cached shell offline.
self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req).catch(() => caches.match("/map").then((r) => r || Response.error())),
    );
  }
});

self.addEventListener("push", (event) => {
  let payload = { title: "Suez Stray Tracker", body: "New activity", data: {} };
  try {
    if (event.data) payload = { ...payload, ...event.data.json() };
  } catch {
    if (event.data) payload.body = event.data.text();
  }
  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      data: payload.data || {},
      vibrate: payload.urgency === "critical" ? [0, 250, 250, 250] : undefined,
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const data = event.notification.data || {};
  let url = "/alerts";
  if (data.type === "dog" && data.dog_id) url = `/dogs/${data.dog_id}`;
  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then((list) => {
      for (const c of list) if ("focus" in c) return c.navigate(url).then(() => c.focus());
      return self.clients.openWindow(url);
    }),
  );
});
