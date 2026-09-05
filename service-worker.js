const CACHE_NAME = 'krounoi-achaias-v1';

self.addEventListener('install', event => {

    self.skipWaiting();

});


self.addEventListener('activate', event => {

    event.waitUntil(
        self.clients.claim()
    );

});


self.addEventListener('fetch', event => {

    const requestUrl = new URL(
        event.request.url
    );

    if (
        event.request.method !== 'GET' ||
        requestUrl.origin !== self.location.origin
    ) {

        return;

    }

    event.respondWith(
        fetch(
            event.request,
            {
                cache: 'no-store'
            }
        )
            .then(response => {

                const copy = response.clone();

                caches.open(CACHE_NAME)
                    .then(cache => {

                        cache.put(
                            event.request,
                            copy
                        );

                    });

                return response;

            })
            .catch(() =>
                caches.match(
                    event.request
                )
            )
    );

});
