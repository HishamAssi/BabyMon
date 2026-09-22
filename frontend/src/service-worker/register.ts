// vite-plugin-pwa generates and injects the actual service worker at build
// time; this wraps its virtual registration module so the rest of the app
// doesn't need to know the plugin is in use.
export function registerServiceWorker() {
  if (import.meta.env.PROD) {
    import("virtual:pwa-register").then(({ registerSW }) => {
      registerSW({ immediate: true });
    });
  }
}
