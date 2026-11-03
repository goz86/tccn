const CACHE_NAME = 'finance-dashboard-v66';
const ASSETS = [
    './',
    'index.html',
    'style.css',
    'app.js',
    'portfolio.js',
    'supabase.js',
    'manifest.json',
    'logo.png'
];

// Install Event - Pre-cache core shell assets & skip waiting
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            return cache.addAll(ASSETS).catch(err => {
                console.warn('PWA: Pre-caching partial failure, proceeding...', err);
            });
        })
    );
    self.skipWaiting();
});

// Activate Event - Clean old caches & claim clients immediately
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
        ).then(() => self.clients.claim())
    );
});

// Message Listener for explicit Skip Waiting signal from client
self.addEventListener('message', event => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});

// Fetch Event - Network-First for same-origin static assets & APIs, Cache-First fallback
self.addEventListener('fetch', event => {
    const request = event.request;
    if (request.method !== 'GET') return;

    const url = new URL(request.url);

    // API calls: Network-First
    if (url.href.includes('api') || url.href.includes('er-api') || url.href.includes('supabase.co')) {
        event.respondWith(
            fetch(request).catch(() => caches.match(request))
        );
        return;
    }

    // Same-origin assets (HTML, JS, CSS, JSON, local images): Network-First
    // This ensures whenever new code is pushed to git/hosting, online devices ALWAYS get the latest code immediately!
    if (url.origin === location.origin) {
        event.respondWith(
            fetch(request)
                .then(networkResponse => {
                    if (networkResponse && networkResponse.status === 200) {
                        const responseClone = networkResponse.clone();
                        caches.open(CACHE_NAME).then(cache => cache.put(request, responseClone));
                    }
                    return networkResponse;
                })
                .catch(() => {
                    // Fallback to cache when offline
                    return caches.match(request).then(cachedResponse => {
                        if (cachedResponse) return cachedResponse;
                        // Fallback to root index.html for navigation requests when offline
                        if (request.mode === 'navigate') {
                            return caches.match('index.html');
                        }
                    });
                })
        );
        return;
    }

    // External static assets: Stale-While-Revalidate or Cache-First
    event.respondWith(
        caches.match(request).then(cached => {
            if (cached) {
                fetch(request).then(networkResponse => {
                    if (networkResponse && networkResponse.status === 200) {
                        caches.open(CACHE_NAME).then(cache => cache.put(request, networkResponse));
                    }
                }).catch(() => { });
                return cached;
            }
            return fetch(request);
        })
    );
});
