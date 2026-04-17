// Push notification opt-in helper
export async function requestPushPermission() {
  if (!("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  const permission = await Notification.requestPermission();
  return permission === "granted";
}

export function showLocalNotification(title, body, icon = "/pwa-192x192.png") {
  if (Notification.permission !== "granted") return;
  try {
    new Notification(title, { body, icon, badge: "/pwa-192x192.png" });
  } catch (_) {}
}
