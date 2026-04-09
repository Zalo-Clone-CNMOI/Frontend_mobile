self.addEventListener("notificationclick", (event) => {
  const notification = event.notification;
  const data = notification?.data || {};
  const category = data.category || "";
  const relativeTarget =
    category === "friend_request"
      ? "/friends/requests"
      : typeof data.url === "string" && data.url
        ? data.url
        : "/";

  notification?.close();

  event.waitUntil(
    (async () => {
      const absoluteTarget = new URL(relativeTarget, self.location.origin).toString();
      const windowClients = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });

      for (const client of windowClients) {
        if ("focus" in client) {
          await client.focus();
        }

        if ("navigate" in client) {
          await client.navigate(absoluteTarget);
          return;
        }
      }

      if (self.clients.openWindow) {
        await self.clients.openWindow(absoluteTarget);
      }
    })(),
  );
});
