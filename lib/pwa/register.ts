/**
 * Service-worker registration glue for the PWA. A pure, dependency-injected
 * helper so it is unit-testable with fakes and has no React or browser-global
 * coupling. Registers `/sw.js` eagerly on every normal app load so the offline
 * shell and installability work for every visitor. Registering the identical
 * script twice is safe - the browser deduplicates by URL.
 */

/** Path of the statically served service worker. */
export const SERVICE_WORKER_URL = "/sw.js"

/** The minimal `navigator.serviceWorker` surface this helper depends on. */
export interface ServiceWorkerContainerLike {
  /** Registers a service worker script by URL. */
  register: (url: string) => Promise<unknown>
}

/** The injectable globals registration needs. */
export interface RegisterGlobals {
  /** Present when the Service Worker API exists (`navigator.serviceWorker`). */
  serviceWorker?: ServiceWorkerContainerLike
}

/**
 * Registers the service worker once if the environment supports it. No-ops
 * silently when `serviceWorker` is absent (older browsers, SSR), so callers can
 * invoke it unconditionally on mount without guarding.
 *
 * @param globals - The browser capabilities to use; pass the real `navigator`
 *   in app code or a fake in tests. Defaults to an empty object so a
 *   server-side call safely no-ops.
 * @returns `true` when registration was attempted, `false` when unsupported.
 */
export function registerAppServiceWorker(
  globals: RegisterGlobals = {},
): boolean {
  const container = globals.serviceWorker
  if (container == null || typeof container.register !== "function") {
    return false
  }
  // Fire and forget: registration must never block render, and a transient
  // failure is non-fatal - the app still works, just not yet installable until
  // the next load.
  void Promise.resolve(container.register(SERVICE_WORKER_URL)).catch(
    () => undefined,
  )
  return true
}
