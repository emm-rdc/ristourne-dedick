const CACHE_NAME = "rebate-tshisangilu-v1";
const FICHIERS_CACHE = ["./", "./index.html", "./style.css", "./script.js", "./manifest.json"];

self.addEventListener("install", e => {
    e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(FICHIERS_CACHE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
    e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener("fetch", e => {
    if (e.request.url.includes("unpkg.com") || e.request.url.includes("cdnjs")) return;
    e.respondWith(
        caches.match(e.request).then(r => r || fetch(e.request).then(fr => {
            return caches.open(CACHE_NAME).then(c => {
                if (e.request.url.startsWith(self.location.origin)) c.put(e.request, fr.clone());
                return fr;
            });
        }).catch(() => {
            if (e.request.mode === "navigate") return caches.match("./index.html");
        }))
    );
});