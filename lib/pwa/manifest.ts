import type { MetadataRoute } from "next"

/**
 * PWA installability constants shared by the manifest route and the service
 * worker / metadata wiring. `THEME_COLOR` mirrors the light-theme `--background`
 * (white) so the OS chrome around the installed app matches the default surface;
 * `BACKGROUND_COLOR` is the splash background shown before first paint (the dark
 * `--background`). Manifest colors must be CSS hex/rgb, so they are hard-coded
 * here rather than referenced from the CSS custom properties.
 */
export const THEME_COLOR = "#ffffff"

/** Splash/background color shown while the installed app boots. */
export const BACKGROUND_COLOR = "#0a0a0a"

/**
 * The locale the install entry point lands on. `start_url`/`scope` are
 * locale-prefixed because every route carries an explicit locale
 * (`localePrefix: "always"`); a bare `/` would 307-redirect on launch.
 */
export const PWA_START_URL = "/en"

/**
 * Builds the Web App Manifest object. Extracted from the `app/manifest.ts`
 * route so it can be imported and asserted without the Next.js metadata runtime.
 * The icons pair a 192 and 512 "any" icon with a dedicated 512 "maskable" icon.
 * The Apple touch icon is wired via `appleWebApp` metadata, not here, since iOS
 * ignores the manifest icons.
 *
 * @returns A fully-populated {@link MetadataRoute.Manifest}.
 */
export function buildManifest(): MetadataRoute.Manifest {
  return {
    name: "Coding Academy",
    short_name: "Academy",
    description:
      "A coding learning platform - lessons, practice, and an AI assistant. Install Coding Academy for an app-like experience.",
    start_url: PWA_START_URL,
    scope: "/",
    display: "standalone",
    background_color: BACKGROUND_COLOR,
    theme_color: THEME_COLOR,
    orientation: "portrait",
    lang: "en-US",
    dir: "ltr",
    categories: ["education", "productivity"],
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  }
}
