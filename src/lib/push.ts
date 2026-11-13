// Push notifications on this device (Web Push): the service worker in
// public/sw.js shows them; the API keeps one subscription per device.
import { apiFetch, apiUrl } from "./api/client";

export type PushState =
  | "unsupported" // no service worker / Push API (or an iPhone not installed)
  | "needs-install" // iPhone/iPad: only works once added to the home screen
  | "denied" // the person blocked notifications for this site
  | "off"
  | "on";

const SW_URL = "/sw.js";

function isIos() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isStandalone() {
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function supported() {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

async function existingSubscription() {
  const registration = await navigator.serviceWorker.getRegistration(SW_URL);
  return (await registration?.pushManager.getSubscription()) ?? null;
}

export async function pushState(): Promise<PushState> {
  if (typeof window === "undefined") return "unsupported";
  if (isIos() && !isStandalone()) return "needs-install";
  if (!supported()) return "unsupported";
  if (Notification.permission === "denied") return "denied";
  return (await existingSubscription()) ? "on" : "off";
}

function keyBytes(base64url: string) {
  const padded = (base64url + "===".slice((base64url.length + 3) % 4))
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  return Uint8Array.from(atob(padded), (c) => c.charCodeAt(0));
}

function save(subscription: PushSubscription) {
  return apiFetch("/api/notifications/push-subscriptions/", {
    method: "POST",
    body: JSON.stringify(subscription.toJSON()),
  });
}

/** Asks permission, subscribes this device and tells the API. */
export async function enablePush(publicKey: string): Promise<PushState> {
  if (!supported()) return "unsupported";
  const permission = await Notification.requestPermission();
  if (permission !== "granted") return permission === "denied" ? "denied" : "off";
  const registration = await navigator.serviceWorker.register(SW_URL);
  await navigator.serviceWorker.ready;
  const subscription =
    (await registration.pushManager.getSubscription()) ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: keyBytes(publicKey),
    }));
  await save(subscription);
  return "on";
}

export async function disablePush(): Promise<PushState> {
  const subscription = await existingSubscription();
  if (subscription) {
    await apiFetch("/api/notifications/push-subscriptions/", {
      method: "DELETE",
      body: JSON.stringify({ endpoint: subscription.endpoint }),
    }).catch(() => undefined);
    await subscription.unsubscribe();
  }
  return "off";
}

/** On app start: re-sends this device's subscription, in case the server
 *  forgot it (e.g. restored from a backup). Never throws. */
export async function syncPushSubscription() {
  try {
    if (!supported() || Notification.permission !== "granted") return;
    const subscription = await existingSubscription();
    if (subscription) await save(subscription);
  } catch {
    // best effort
  }
}

/** On sign-out this device stops receiving the person's notifications: a
 *  shared phone must not keep showing them, nor pass them to whoever signs in
 *  next (they turn push on themselves). Takes the token up front: the session
 *  is cleared right after. */
export function forgetPushDevice(accessToken: string | undefined) {
  if (!accessToken || !supported()) return;
  void existingSubscription()
    .then(async (subscription) => {
      if (!subscription) return;
      await fetch(apiUrl("/api/notifications/push-subscriptions/"), {
        method: "DELETE",
        keepalive: true,
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: subscription.endpoint }),
      }).catch(() => undefined);
      await subscription.unsubscribe();
    })
    .catch(() => undefined);
}
