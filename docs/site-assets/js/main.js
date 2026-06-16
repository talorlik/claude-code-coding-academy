/*
 * Eyal's Coding Academy - landing site behavior.
 *
 * Responsibilities:
 *   1. Theme: resolve light/dark from localStorage or prefers-color-scheme,
 *      toggle via a real <button>, persist the choice, and keep ARIA + the
 *      theme-appropriate logo in sync. The pre-paint theme class is applied by
 *      a tiny inline snippet in <head> (see index.html) to avoid a flash; this
 *      file owns everything after first paint.
 *   2. Mobile nav: open/close the collapsed menu below the medium breakpoint.
 *
 * No analytics, no third-party trackers, no inline handlers.
 */

/*
 * The single source of truth for the live app URL. Change this one constant to
 * repoint every "Open the App" CTA. Kept in sync with the data-app-url anchors
 * in index.html (those carry the same value so the page works with JS disabled
 * too; this constant lets a build/script update them programmatically).
 */
const APP_URL = 'https://claude-code-coding-academy.vercel.app';

const STORAGE_KEY = 'eca-theme';

/**
 * Read the persisted theme, or fall back to the OS preference.
 * @returns {'light' | 'dark'}
 */
function resolveTheme() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'light' || stored === 'dark') {
      return stored;
    }
  } catch {
    /* localStorage can throw in private mode; fall through to system pref. */
  }
  const prefersDark =
    window.matchMedia &&
    window.matchMedia('(prefers-color-scheme: dark)').matches;
  return prefersDark ? 'dark' : 'light';
}

/**
 * Apply a theme to <html> and sync the toggle's aria-pressed state.
 * aria-pressed = true means "dark is active".
 * @param {'light' | 'dark'} theme
 */
function applyTheme(theme) {
  const root = document.documentElement;
  root.classList.remove('light', 'dark');
  root.classList.add(theme);

  const toggle = document.getElementById('theme-toggle');
  if (toggle) {
    const isDark = theme === 'dark';
    toggle.setAttribute('aria-pressed', String(isDark));
    toggle.setAttribute(
      'aria-label',
      isDark ? 'Switch to light theme' : 'Switch to dark theme',
    );
  }
}

/**
 * Persist a theme choice, swallowing storage errors in private mode.
 * @param {'light' | 'dark'} theme
 */
function persistTheme(theme) {
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    /* Non-fatal: the choice simply will not survive a reload. */
  }
}

function initTheme() {
  // The inline head snippet already set the initial class; re-applying here
  // wires up the ARIA state on the (now-parsed) toggle button.
  applyTheme(resolveTheme());

  const toggle = document.getElementById('theme-toggle');
  if (toggle) {
    toggle.addEventListener('click', () => {
      const next = document.documentElement.classList.contains('dark')
        ? 'light'
        : 'dark';
      applyTheme(next);
      persistTheme(next);
    });
  }

  // Follow the OS theme on the fly only while the user has not chosen one.
  if (window.matchMedia) {
    window
      .matchMedia('(prefers-color-scheme: dark)')
      .addEventListener('change', (event) => {
        let stored = null;
        try {
          stored = localStorage.getItem(STORAGE_KEY);
        } catch {
          stored = null;
        }
        if (stored !== 'light' && stored !== 'dark') {
          applyTheme(event.matches ? 'dark' : 'light');
        }
      });
  }
}

function initMobileNav() {
  const nav = document.getElementById('site-nav');
  const navToggle = document.getElementById('nav-toggle');
  if (!nav || !navToggle) {
    return;
  }

  const setOpen = (open) => {
    nav.setAttribute('data-open', String(open));
    navToggle.setAttribute('aria-expanded', String(open));
  };

  navToggle.addEventListener('click', () => {
    setOpen(nav.getAttribute('data-open') !== 'true');
  });

  // Close the menu after following an in-page link.
  nav.querySelectorAll('.site-nav__links a').forEach((link) => {
    link.addEventListener('click', () => setOpen(false));
  });

  // Reset state when crossing back to the desktop layout.
  window.matchMedia('(min-width: 768px)').addEventListener('change', (event) => {
    if (event.matches) {
      setOpen(false);
    }
  });
}

/**
 * Keep every app-URL anchor pointing at the APP_URL constant. The HTML ships
 * the same value, so this is belt-and-suspenders for the single-constant rule.
 */
function syncAppLinks() {
  document.querySelectorAll('[data-app-url]').forEach((anchor) => {
    anchor.setAttribute('href', APP_URL);
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initMobileNav();
  syncAppLinks();
});
