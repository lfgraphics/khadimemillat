self.addEventListener('push', function (event) {
    if (!event.data) return;
    let data = {};
    try {
        data = event.data.json();
    } catch (e) {
        return;
    }

    const actions = data.actions || [] // e.g. [{action:'open', title:'Open'}]
    const options = {
        body: data.body,
        icon: data.icon || '/android-chrome-192x192.png',
        badge: '/favicon-32x32.png',
        vibrate: [80, 30, 80],
        data: {
            url: data.url || '/',
            dateOfArrival: Date.now(),
            primaryKey: data.id || 'unknown',
            meta: data.meta || {}
        },
        actions: actions.slice(0, 2) // browser limit typically 2
    };

    event.waitUntil(
        (async () => {
            try {
                await self.registration.showNotification(data.title || 'Notification', options);
            } catch (err) {
                // Error handling push notification
            }
        })()
    );
});


self.addEventListener('notificationclick', function (event) {
    event.notification.close();
    const targetUrl = event.notification.data?.url || '/';
    event.waitUntil(
        (async () => {
            const allClients = await clients.matchAll({ type: 'window', includeUncontrolled: true });
            for (const client of allClients) {
                if ('focus' in client) {
                    // If already open on same origin, navigate if needed
                    try {
                        const url = new URL(client.url);
                        if (targetUrl && (url.pathname !== targetUrl)) {
                            client.navigate(targetUrl);
                        }
                    } catch (_) {}
                    return client.focus();
                }
            }
            if (clients.openWindow) return clients.openWindow(targetUrl);
        })()
    );
});

self.addEventListener('notificationclose', function (event) {
    // Notification closed
});