# Fingerprint - Style Reference
> warm CRT terminal on cream paper, with a deep-ocean terminal dark mode

**Theme:** light and dark

Fingerprint reads as a developer tool that has been deliberately warmed up:
a cream-paper light canvas sits beneath sharp black type, while dark mode
switches into a deep-ocean terminal atmosphere using only the dark-theme
palette. Shared structure stays constant across both themes: editorial Inter,
technical JetBrains Mono, low-radius surfaces, hairline borders, and terminal
panels as the main visual artifacts. Color is theme-scoped. Light mode uses
orange as the high-contrast annotation and CTA color; dark mode replaces it
with Portal Blue, Specimen Green, Terminal Amber, and Fault Red from the dark
palette, preserving contrast without importing the light-mode orange.

## Tokens - Colors

Theme colors are semantic first. Raw palette names live inside `.dark` and
`.light`; component guidance should use the semantic tokens below.

| Token | Light Value | Dark Value | Role |
|-------|-------------|------------|------|
| `--color-bg` | `#fafaf8` | `#06051d` | Page canvas and dominant background |
| `--color-bg-gradient` | `linear-gradient(0deg, #fafaf8 30%, #f0f0ef)` | `linear-gradient(0deg, #06051d 30%, #061434)` | Optional atmospheric page background |
| `--color-surface` | `#ffffff` | `#1d293d` | Cards, nav, forms, and primary containers |
| `--color-surface-muted` | `#f0f0ef` | `#0f1c36` | Section bands and quiet grouped content |
| `--color-surface-elevated` | `#ffffff` | `#314062` | Hover, raised, or nested surfaces |
| `--color-border` | `#e4e5e1` | `#e5e7eb` | High-contrast structural borders and dividers |
| `--color-text` | `#141415` | `#cad5e2` | Body text |
| `--color-text-strong` | `#141415` | `#ffffff` | Headings and strongest UI text |
| `--color-text-muted` | `#6e6f6c` | `#cad5e2` | Secondary text and metadata |
| `--color-accent` | `#be400f` | `#63b3ed` | Inline links, highlighted words, active nav |
| `--color-accent-strong` | `#f35b22` | `#ebf8ff` | High-emphasis accents and hover text |
| `--color-primary-bg` | `#be400f` | `#004f3b` | Primary CTA background |
| `--color-primary-text` | `#ffffff` | `#ebf8ff` | Primary CTA text |
| `--color-secondary-bg` | `transparent` | `#733e0a` | Secondary CTA or explore action background |
| `--color-secondary-text` | `#141415` | `#fefce8` | Secondary CTA text |
| `--color-danger-bg` | `#f9aea9` | `#8b0836` | Destructive, alert, or suspicious score backgrounds |
| `--color-danger-text` | `#be400f` | `#ff2056` | Destructive, alert, or suspicious score text |
| `--color-code-bg` | `#141415` | `#0f1c36` | Code and terminal panels |
| `--color-code-surface` | `#2e2e2c` | `#1d293d` | Nested terminal surfaces |
| `--color-code-key` | `#8bc5f3` | `#63b3ed` | JSON keys and object properties |
| `--color-code-string` | `#88d2c3` | `#00bc7d` | Strings and identifiers |
| `--color-code-keyword` | `#c678dd` | `#f0b100` | Keywords, booleans, and emphasis tokens |
| `--color-code-alert` | `#f67976` | `#ff2056` | Risk, suspicious, or error-adjacent code values |

## Tokens - Typography

### Inter - Primary UI and editorial typeface - handles all headings, body text, buttons, and navigation. Weight 600 is the default for headlines, weight 400 for body, weight 500 for labels. Calt and liga features are disabled, giving the type a more uniform, 'engineered' feel rather than the swashy alternates Inter ships with. `--font-inter`
- **Substitute:** Inter (Google Fonts)
- **Weights:** 300, 400, 500, 600, 700
- **Sizes:** 9, 10, 11, 12, 13, 14, 16, 30, 36, 48
- **Line height:** 1.15 (display/heading), 1.50 (body), 1.60 (body-sm), 1.67 (captions)
- **Letter spacing:** -0.0620em at 48px (≈-2.98px), -0.0200em at 36px (≈-0.72px), 0.0010em at 16px (≈0.016px), 0.0100em at 14px (≈0.14px), 0.0600em at 12px (≈0.72px), 0.0800em at 11px (≈0.88px), 0.1200em at 10px (≈1.2px), 0.2000em at 9px (≈1.8px)
- **OpenType features:** `"calt" 0, "liga" 0`
- **Role:** Primary UI and editorial typeface - handles all headings, body text, buttons, and navigation. Weight 600 is the default for headlines, weight 400 for body, weight 500 for labels. Calt and liga features are disabled, giving the type a more uniform, 'engineered' feel rather than the swashy alternates Inter ships with.

### JetBrains Mono - Developer-language typeface - owns the eyebrow labels ('I'M A DEVELOPER'), code blocks, terminal output, API URLs, and visitor IDs. Acts as a visual signature: whenever the page shifts from prose to technical content, JetBrains Mono takes over. Weight 470 is the distinctive 'regular' weight that sits between 400 and 500. `--font-jetbrains-mono`
- **Substitute:** JetBrains Mono (Google Fonts) or IBM Plex Mono
- **Weights:** 300, 400, 470, 500, 600, 700
- **Sizes:** 8, 10, 11, 12, 13, 14
- **Line height:** 0.86 (tight label stacks), 1.00 (inline code), 1.45-1.62 (code blocks)
- **Letter spacing:** -0.0800em (tight tracking on IDs/strings), 0.0010em (default), 0.1000em (wide tracking on uppercase eyebrow labels)
- **Role:** Developer-language typeface - owns the eyebrow labels ('I'M A DEVELOPER'), code blocks, terminal output, API URLs, and visitor IDs. Acts as a visual signature: whenever the page shifts from prose to technical content, JetBrains Mono takes over. Weight 470 is the distinctive 'regular' weight that sits between 400 and 500.

### Type Scale

| Role | Size | Line Height | Letter Spacing | Token |
|------|------|-------------|----------------|-------|
| eyebrow | 11px | 1.45 | 0.88px | `--text-eyebrow` |
| heading-sm | 30px | 1.17 | -0.6px | `--text-heading-sm` |
| heading | 36px | 1.15 | -0.72px | `--text-heading` |
| display | 48px | 1.15 | -2.98px | `--text-display` |

## Tokens - Spacing & Shapes

**Base unit:** 4px

**Density:** comfortable

### Spacing Scale

| Name | Value | Token |
|------|-------|-------|
| 4 | 4px | `--spacing-4` |
| 8 | 8px | `--spacing-8` |
| 12 | 12px | `--spacing-12` |
| 16 | 16px | `--spacing-16` |
| 20 | 20px | `--spacing-20` |
| 24 | 24px | `--spacing-24` |
| 28 | 28px | `--spacing-28` |
| 32 | 32px | `--spacing-32` |
| 48 | 48px | `--spacing-48` |
| 56 | 56px | `--spacing-56` |
| 72 | 72px | `--spacing-72` |
| 96 | 96px | `--spacing-96` |

### Border Radius

| Element | Value |
|---------|-------|
| nav | 4px |
| cards | 12px |
| badges | 4px |
| buttons | 4px |
| code-panels | 12px |
| large-blocks | 16px |

### Shadows

| Name | Value | Token |
|------|-------|-------|
| subtle | `rgba(24, 25, 22, 0.06) 0px 1px 2px 0px` | `--shadow-subtle` |
| subtle-2 | `rgba(24, 25, 22, 0.02) 0px 2px 1px 0px, rgba(24, 25, 22, ...` | `--shadow-subtle-2` |
| subtle-3 | `rgb(255, 255, 255) 0px 1px 0px 0px inset` | `--shadow-subtle-3` |
| subtle-4 | `rgba(228, 229, 225, 0.3) 0px 1px 0px 0px inset, rgba(110,...` | `--shadow-subtle-4` |
| subtle-5 | `rgba(255, 255, 255, 0.2) 0px 1px 0px 0px inset, rgba(24, ...` | `--shadow-subtle-5` |
| subtle-6 | `rgba(255, 255, 255, 0.04) 0px 1px 0px 0px inset, rgba(0, ...` | `--shadow-subtle-6` |

### Layout

- **Page max-width:** 1200px
- **Section gap:** 72px
- **Card padding:** 24px
- **Element gap:** 8px

## Components

### Primary CTA Button
**Role:** Filled theme-accent button for top-of-funnel conversion actions

Background: `var(--color-primary-bg)`. Text:
`var(--color-primary-text)`, Inter weight 500, 14px,
letter-spacing 0.14px. Padding: 12px 24px. Border-radius:
`var(--radius-buttons)`. Box-shadow: `var(--shadow-primary-button)`.
Light mode uses a high-contrast burnt orange fill; dark mode uses the
Bioluminescent Green fill from the dark palette. The primary CTA is the only
solid filled button in light mode. In dark mode it keeps the same structure
and uses dark-theme color only, with no imported pill geometry.

### Secondary Ghost Button
**Role:** Outlined or transparent button for secondary actions

Background: `var(--color-secondary-bg)`. Text:
`var(--color-secondary-text)`, Inter weight 500, 14px. Border: 1px solid
`var(--color-border)`. Border-radius: `var(--radius-buttons)`. Padding:
12px 24px. Used for paired secondary actions such as 'Contact Sales' and
'See all Use Cases'. In light mode it reads as a ghost button; in dark mode it
can take a Terminal Amber background from the dark palette.

### Terminal Code Panel
**Role:** Dark code block showing API responses, visitor IDs, and JSON output

Background: `var(--color-code-bg)`. Border-radius:
`var(--radius-code-panels)`. Padding: 24px. Text: JetBrains Mono weight 400,
13px, line-height 1.57. JSON keys use `var(--color-code-key)`, string values
use `var(--color-code-string)`, numbers and booleans use
`var(--color-code-keyword)`, and risky values use `var(--color-code-alert)`.
May include a top tab bar with an 'I'M A DEVELOPER' eyebrow label in
JetBrains Mono 11px weight 500, letter-spacing 0.88px,
`var(--color-text-muted)`. This is the page's signature component.

### Feature Card
**Role:** Theme surface card for use cases, features, and content blocks

Background: `var(--color-surface)`. Border: 1px solid
`var(--color-border)`. Border-radius: `var(--radius-cards)`. Padding: 24px.
Box-shadow: `var(--shadow-card)`. Contains a small accent icon at top-left
using `var(--color-accent)`, Inter weight 600 heading 16px in
`var(--color-text-strong)`, and body text 14px weight 400 in
`var(--color-text-muted)`. No hover elevation change.

### Accordion Use Case Item
**Role:** Expandable list item for use case descriptions

Background: `var(--color-surface)`. Border: 1px solid
`var(--color-border)`. Border-radius: `var(--radius-md)`. Padding:
16px 20px. Title in Inter weight 600 16px `var(--color-text-strong)` with a
small `var(--color-accent)` icon prefix. Expand/collapse chevron uses
`var(--color-text-muted)`. Expanded body text uses Inter 14px weight 400
`var(--color-text)`. Stacked vertically with 1px gap between items.

### Eyebrow Label
**Role:** Small uppercase label above headings and section titles

JetBrains Mono weight 500, 11px, line-height 1.45, letter-spacing 0.88px.
Color: `var(--color-accent)` for branded labels such as
'I'M A DEVELOPER' and `var(--color-text-muted)` for neutral labels. Always
uppercase. Acts as a category marker before the main heading.

### Stats Block
**Role:** Large numeric stat with caption

Number: Inter weight 600, 36px, color `var(--color-accent)`,
letter-spacing -0.72px. Caption below: Inter weight 400, 14px,
color `var(--color-text-muted)`, line-height 1.5. Arranged in 3-column
equal-width grid with 72px gap. The accent number is the visual anchor; the
caption recedes.

### Trust Logo Strip
**Role:** Row of partner/client logos for social proof

Full-width band, background `var(--color-surface)`. Logos displayed at
uniform height, grayscale or single-color, evenly spaced in a single row.
Above the logos, a centered eyebrow label in JetBrains Mono:
'TRUSTED BY 6000+ COMPANIES OF ALL SIZES' in 11px, letter-spacing 0.88px,
color `var(--color-text-muted)`.

### Navigation Bar
**Role:** Fixed top navigation header

Background: `var(--color-nav-bg)` with backdrop blur where supported.
Height: 64px. Logo (fingerprint icon + 'Fingerprint' wordmark) left, primary
nav links center (Inter 14px weight 500 `var(--color-text-strong)`), two
buttons right (secondary 'Login' + primary 'Get Started'). Box-shadow:
`var(--shadow-nav)`.

### Inline Highlighted Word
**Role:** Single word or phrase in the theme accent within a heading

Runs inline within an otherwise neutral Inter heading. Color:
`var(--color-accent)`, same weight and size as surrounding text. Used to create
editorial emphasis without changing the typographic rhythm. Example:
'Identify Every Visitor' where 'Every' takes the theme accent.

### Device Detection Card
**Role:** Overlay card showing device intelligence data next to a phone mockup

Background: `var(--color-surface)`. Border: 1px solid
`var(--color-border)`. Border-radius: `var(--radius-cards)`. Padding: 16px.
Contains structured key-value pairs: label in Inter 12px weight 500
`var(--color-text-muted)`, value in JetBrains Mono 13px
`var(--color-text-strong)`. Suspicious scores use
`var(--color-danger-text)`. Clean, tabular, monospace data presentation.

### Integration Icon Row
**Role:** Horizontal strip of technology/integration logos

Small icons, approximately 32px, in a single row, evenly spaced. Icons are
grayscale, muted, or theme-accented. Background follows the section surface.
Used to show platform breadth (SDKs, integrations). No labels; icon
recognition is the point.

## Do's and Don'ts

### Do
- Keep every shared design decision in `:root`: typography, spacing, layout,
  radius, and other non-color structure
- Put all color, background, border, and elevation decisions in `.dark` and
  `.light`
- Use only colors from the dark reference palette inside `.dark`
- Use high-contrast semantic pairs: `--color-text-strong` on
  `--color-bg`, `--color-primary-text` on `--color-primary-bg`, and
  `--color-accent` only where it remains legible
- Apply the inline highlight pattern to one word per headline using
  `var(--color-accent)`
- Set Calt and Liga to 0 on all Inter text to preserve the engineered,
  non-decorative letterform character
- Use JetBrains Mono 11px weight 500 with 0.88px letter-spacing for all uppercase eyebrow labels
- Apply 4px radius to buttons, nav items, and badges; 12px radius to cards and code panels; 16px only to large feature blocks
- Pair every primary CTA with a secondary button; never show a primary CTA
  alone in the navigation or hero
- Use `--color-code-bg` or `--color-code-surface` as the background for any
  code or terminal content; code blocks should never appear directly on the
  page canvas

### Don't
- Don't place theme-specific colors in `:root`
- Don't use light-theme orange values in `.dark`; dark mode must stay within
  Cosmic Void, Abyssal Blue, Steel Navy, Deep Slate, Mist, Fog, Ghost White,
  Ice Blue, Portal Blue, Bioluminescent Green, Terminal Amber, Crimson Depth,
  Specimen Green, Warning Amber, and Fault Red
- Don't use syntax-highlight colors outside of code or terminal contexts
- Don't introduce additional accent hues beyond each theme's palette
- Don't set body text below 14px in Inter or below 12px in JetBrains Mono; the
  type scale has a hard floor
- Don't apply rounded corners above 16px; dark mode imports color only, not
  the pill geometry from the dark reference
- Don't add decorative gradients beyond `--color-bg-gradient`; light mode stays
  flat and dark mode uses the cosmic gradient only as an atmospheric base

## Surfaces

| Level | Token | Light | Dark | Purpose |
|-------|-------|-------|------|---------|
| 1 | `--color-bg` | `#fafaf8` | `#06051d` | Base page background and dominant surface |
| 2 | `--color-surface-muted` | `#f0f0ef` | `#0f1c36` | Alternating bands and quiet grouped content |
| 3 | `--color-surface` | `#ffffff` | `#1d293d` | Cards, nav, feature blocks, and form surfaces |
| 4 | `--color-surface-elevated` | `#ffffff` | `#314062` | Hover, active, nested, or raised surfaces |
| 5 | `--color-code-bg` | `#141415` | `#0f1c36` | Code blocks, terminal mockups, and developer panels |
| 6 | `--color-code-surface` | `#2e2e2c` | `#1d293d` | Nested code blocks and elevated terminal sections |

## Elevation

Elevation is theme-scoped. Light mode uses hairline borders, inset highlights,
and soft low-opacity shadows. Dark mode primarily uses surface color steps
from Cosmic Void to Deep Slate; primary and secondary buttons may keep the soft
shadow from the dark reference.

- **Navigation bar:** `var(--shadow-nav)`
- **Cards:** `var(--shadow-card)`
- **Links and interactive text:** `var(--shadow-interactive)`
- **Primary buttons:** `var(--shadow-primary-button)`

## Imagery

Visuals are dominated by code and terminal panels showing JSON API responses
and visitor identification data; these are the product's portfolio pieces, not
decorative. Supporting visuals include a minimal phone/device mockup showing
device intelligence results in a card overlay. The trust bar at the bottom uses
small grayscale partner logos in a single row. No lifestyle photography,
illustrations, or 3D renders. The only graphic element is the fingerprint logo
mark, rendered in `var(--color-accent)`. When screenshots or product UI appear,
they are treated as flat artifacts: dark backgrounds, mono fonts, and
syntax-highlighted text. The page treats code as a first-class visual medium.

## Layout

Max-width approximately 1200px centered content with full-bleed background
sections. The hero is a centered text stack over `var(--color-bg)`,
immediately followed by a wide terminal panel that breaks the prose grid. Below
the fold, the page alternates between two-column text and visual blocks
(text-left/visual-right, then visual-left/text-right) and full-width feature
card grids. Stats sections use a 3-column equal-width grid with large accent
numbers. The trust bar is a single full-width row of logos. Navigation is a
fixed top bar with logo left, primary nav center, and two actions right. The
overall rhythm is: prose surface, terminal panel, prose surface, terminal
panel, creating a two-mode cadence that reinforces the developer-tool identity.

## Agent Prompt Guide

**Quick Color Reference**
- text: `var(--color-text)`
- strong text: `var(--color-text-strong)`
- background: `var(--color-bg)`
- card surface: `var(--color-surface)`
- border: `var(--color-border)`
- accent / inline highlight: `var(--color-accent)`
- primary action: `var(--color-primary-bg)` with
  `var(--color-primary-text)`

**3 Example Component Prompts**

1. Create a hero section: centered editorial text stack over
   `var(--color-bg)`, with one highlighted word using
   `var(--color-accent)`. Under the text, place a wide terminal panel using
   `var(--color-code-bg)`, `var(--radius-code-panels)`, JetBrains Mono, and
   syntax colors from `--color-code-key`, `--color-code-string`, and
   `--color-code-keyword`. Use the active theme class for all color values.

2. Create a stats section: 3-column grid, 72px gap. Each cell: large number in
   Inter weight 600 36px, `var(--color-accent)`, letter-spacing -0.72px
   (e.g., '250+', '4 Billion +', '50 Million +'). Below each number, a
   caption in Inter 14px weight 400, `var(--color-text-muted)`, line-height
   1.5. Background: `var(--color-bg)`. No card containers; the numbers float
   directly on the canvas.

3. Create a use-case accordion: stacked vertical list of items, 1px gap. Each
   item: `var(--color-surface)` background, 1px `var(--color-border)` border,
   4px radius, 16px 20px padding. Title row: small `var(--color-accent)` icon
   with 1.5px stroke plus Inter weight 600 16px
   `var(--color-text-strong)` text, right-aligned chevron in
   `var(--color-text-muted)`. Expanded state reveals body text in Inter 14px
   weight 400 `var(--color-text)` below the title.

## Similar Brands

- **Snyk** - Same devtools DNA: warm-neutral canvas, single bold accent color for CTAs, JetBrains Mono for code, dark code panels breaking up light prose sections
- **Linear** - Similar tight typographic rhythm with negative letter-spacing on headings, hairline borders, flat cards with subtle inset highlights instead of drop shadows
- **Vercel** - Same editorial approach to monochrome: near-black text on warm off-white, one accent color doing all the emphasis work, minimal elevation philosophy
- **Auth0 / Okta Developer** - Shared developer-console aesthetic with terminal-style dark panels containing syntax-highlighted JSON, mono fonts for technical content, and code-as-hero compositions

## Quick Start

### CSS Custom Properties

```css
:root {
  /* Typography - Font Families */
  --font-inter: 'Inter', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  --font-jetbrains-mono: 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;

  /* Typography - Scale */
  --text-eyebrow: 11px;
  --leading-eyebrow: 1.45;
  --tracking-eyebrow: 0.88px;
  --text-heading-sm: 30px;
  --leading-heading-sm: 1.17;
  --tracking-heading-sm: -0.6px;
  --text-heading: 36px;
  --leading-heading: 1.15;
  --tracking-heading: -0.72px;
  --text-display: 48px;
  --leading-display: 1.15;
  --tracking-display: -2.98px;

  /* Typography - Weights */
  --font-weight-light: 300;
  --font-weight-regular: 400;
  --font-weight-w470: 470;
  --font-weight-medium: 500;
  --font-weight-semibold: 600;
  --font-weight-bold: 700;

  /* Spacing */
  --spacing-unit: 4px;
  --spacing-4: 4px;
  --spacing-8: 8px;
  --spacing-12: 12px;
  --spacing-16: 16px;
  --spacing-20: 20px;
  --spacing-24: 24px;
  --spacing-28: 28px;
  --spacing-32: 32px;
  --spacing-48: 48px;
  --spacing-56: 56px;
  --spacing-72: 72px;
  --spacing-96: 96px;

  /* Layout */
  --page-max-width: 1200px;
  --section-gap: 72px;
  --card-padding: 24px;
  --element-gap: 8px;

  /* Border Radius */
  --radius-md: 4px;
  --radius-lg: 8px;
  --radius-xl: 12px;
  --radius-2xl: 16px;

  /* Named Radii */
  --radius-nav: 4px;
  --radius-cards: 12px;
  --radius-badges: 4px;
  --radius-buttons: 4px;
  --radius-code-panels: 12px;
  --radius-large-blocks: 16px;
}

.dark {
  color-scheme: dark;

  /* Raw dark palette - values come only from DESIGN_DARK.md */
  --color-cosmic-void: #06051d;
  --color-deep-navy: #061434;
  --gradient-cosmic-void: linear-gradient(0deg, rgb(6, 5, 29) 30%, rgb(6, 20, 52));
  --color-abyssal-blue: #0f1c36;
  --color-steel-navy: #1d293d;
  --color-deep-slate: #314062;
  --color-mist: #cad5e2;
  --color-fog: #e5e7eb;
  --color-ash: #2e3038;
  --color-ghost-white: #ffffff;
  --color-ice-blue: #ebf8ff;
  --color-portal-blue: #63b3ed;
  --color-bioluminescent-green: #004f3b;
  --color-terminal-amber: #733e0a;
  --color-crimson-depth: #8b0836;
  --color-specimen-green: #00bc7d;
  --color-warning-amber: #f0b100;
  --color-fault-red: #ff2056;
  --color-explore-cream: #fefce8;

  /* Semantic colors */
  --color-bg: var(--color-cosmic-void);
  --color-bg-gradient: var(--gradient-cosmic-void);
  --color-surface: var(--color-steel-navy);
  --color-surface-muted: var(--color-abyssal-blue);
  --color-surface-elevated: var(--color-deep-slate);
  --color-border: var(--color-fog);
  --color-text: var(--color-mist);
  --color-text-strong: var(--color-ghost-white);
  --color-text-muted: var(--color-mist);
  --color-accent: var(--color-portal-blue);
  --color-accent-strong: var(--color-ice-blue);
  --color-primary-bg: var(--color-bioluminescent-green);
  --color-primary-text: var(--color-ice-blue);
  --color-secondary-bg: var(--color-terminal-amber);
  --color-secondary-text: var(--color-explore-cream);
  --color-danger-bg: var(--color-crimson-depth);
  --color-danger-text: var(--color-fault-red);
  --color-code-bg: var(--color-abyssal-blue);
  --color-code-surface: var(--color-steel-navy);
  --color-code-key: var(--color-portal-blue);
  --color-code-string: var(--color-specimen-green);
  --color-code-keyword: var(--color-warning-amber);
  --color-code-alert: var(--color-fault-red);
  --color-nav-bg: var(--color-steel-navy);

  /* Elevation */
  --shadow-nav: none;
  --shadow-card: none;
  --shadow-interactive: none;
  --shadow-primary-button: rgba(0, 0, 0, 0.1) 0px 4px 6px -1px, rgba(0, 0, 0, 0.1) 0px 2px 4px -2px;

  /* Surfaces */
  --surface-canvas: var(--color-bg);
  --surface-band: var(--color-surface-muted);
  --surface-card: var(--color-surface);
  --surface-terminal: var(--color-code-bg);
  --surface-terminal-panel: var(--color-code-surface);
}

.light {
  color-scheme: light;

  /* Raw light palette */
  --color-cream-paper: #fafaf8;
  --color-card-white: #ffffff;
  --color-pebble-gray: #f0f0ef;
  --color-linen-border: #e4e5e1;
  --color-ash: #d9d9d9;
  --color-ink: #141415;
  --color-graphite: #2e2e2c;
  --color-carbon: #454542;
  --color-slate: #6e6f6c;
  --color-stone: #8c8c89;
  --color-fog-light: #b7b7b4;
  --color-signal-orange: #f35b22;
  --color-ember: #ff5e24;
  --color-apricot: #f77c55;
  --color-burnt-orange: #be400f;
  --color-persimmon: #d14200;
  --color-peach-blush: #ffcab5;
  --color-teal-token: #88d2c3;
  --color-sky-token: #8bc5f3;
  --color-orchid-token: #c678dd;
  --color-forest: #165424;
  --color-success-green: #62b06d;
  --color-coral-alert: #f67976;
  --color-rose-blush: #f9aea9;

  /* Semantic colors */
  --color-bg: var(--color-cream-paper);
  --color-bg-gradient: linear-gradient(0deg, #fafaf8 30%, #f0f0ef);
  --color-surface: var(--color-card-white);
  --color-surface-muted: var(--color-pebble-gray);
  --color-surface-elevated: var(--color-card-white);
  --color-border: var(--color-linen-border);
  --color-text: var(--color-ink);
  --color-text-strong: var(--color-ink);
  --color-text-muted: var(--color-slate);
  --color-accent: var(--color-burnt-orange);
  --color-accent-strong: var(--color-signal-orange);
  --color-primary-bg: var(--color-burnt-orange);
  --color-primary-text: var(--color-card-white);
  --color-secondary-bg: transparent;
  --color-secondary-text: var(--color-ink);
  --color-danger-bg: var(--color-rose-blush);
  --color-danger-text: var(--color-burnt-orange);
  --color-code-bg: var(--color-ink);
  --color-code-surface: var(--color-graphite);
  --color-code-key: var(--color-sky-token);
  --color-code-string: var(--color-teal-token);
  --color-code-keyword: var(--color-orchid-token);
  --color-code-alert: var(--color-coral-alert);
  --color-nav-bg: rgba(250, 250, 248, 0.85);

  /* Elevation */
  --shadow-subtle: rgba(24, 25, 22, 0.06) 0px 1px 2px 0px;
  --shadow-subtle-2: rgba(24, 25, 22, 0.02) 0px 2px 1px 0px, rgba(24, 25, 22, 0.1) 0px -1px 0px 0px inset;
  --shadow-subtle-3: rgb(255, 255, 255) 0px 1px 0px 0px inset;
  --shadow-subtle-4: rgba(228, 229, 225, 0.3) 0px 1px 0px 0px inset, rgba(110, 111, 109, 0.1) 0px -1px 0px 0px inset;
  --shadow-subtle-5: rgba(255, 255, 255, 0.2) 0px 1px 0px 0px inset, rgba(24, 25, 22, 0.06) 0px 1px 2px 0px, rgba(24, 25, 22, 0.1) 0px -1px 0px 0px inset;
  --shadow-subtle-6: rgba(255, 255, 255, 0.04) 0px 1px 0px 0px inset, rgba(0, 0, 0, 0.2) 0px -1px 0px 0px inset;
  --shadow-nav: var(--shadow-subtle-2);
  --shadow-card: var(--shadow-subtle-4);
  --shadow-interactive: var(--shadow-subtle);
  --shadow-primary-button: var(--shadow-subtle-5);

  /* Surfaces */
  --surface-canvas: var(--color-bg);
  --surface-band: var(--color-surface-muted);
  --surface-card: var(--color-surface);
  --surface-terminal: var(--color-code-bg);
  --surface-terminal-panel: var(--color-code-surface);
}
```

### Tailwind v4

```css
@theme inline {
  /* Semantic Colors */
  --color-background: var(--color-bg);
  --color-background-gradient: var(--color-bg-gradient);
  --color-card: var(--color-surface);
  --color-muted: var(--color-surface-muted);
  --color-elevated: var(--color-surface-elevated);
  --color-line: var(--color-border);
  --color-foreground: var(--color-text);
  --color-foreground-strong: var(--color-text-strong);
  --color-foreground-muted: var(--color-text-muted);
  --color-brand-accent: var(--color-accent);
  --color-brand-accent-strong: var(--color-accent-strong);
  --color-primary: var(--color-primary-bg);
  --color-primary-foreground: var(--color-primary-text);
  --color-secondary: var(--color-secondary-bg);
  --color-secondary-foreground: var(--color-secondary-text);
  --color-danger: var(--color-danger-bg);
  --color-danger-foreground: var(--color-danger-text);
  --color-code-background: var(--color-code-bg);
  --color-code-panel: var(--color-code-surface);
  --color-syntax-key: var(--color-code-key);
  --color-syntax-string: var(--color-code-string);
  --color-syntax-keyword: var(--color-code-keyword);
  --color-syntax-alert: var(--color-code-alert);

  /* Typography */
  --font-inter: 'Inter', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  --font-jetbrains-mono: 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;

  /* Typography - Scale */
  --text-eyebrow: 11px;
  --leading-eyebrow: 1.45;
  --tracking-eyebrow: 0.88px;
  --text-heading-sm: 30px;
  --leading-heading-sm: 1.17;
  --tracking-heading-sm: -0.6px;
  --text-heading: 36px;
  --leading-heading: 1.15;
  --tracking-heading: -0.72px;
  --text-display: 48px;
  --leading-display: 1.15;
  --tracking-display: -2.98px;

  /* Spacing */
  --spacing-4: 4px;
  --spacing-8: 8px;
  --spacing-12: 12px;
  --spacing-16: 16px;
  --spacing-20: 20px;
  --spacing-24: 24px;
  --spacing-28: 28px;
  --spacing-32: 32px;
  --spacing-48: 48px;
  --spacing-56: 56px;
  --spacing-72: 72px;
  --spacing-96: 96px;

  /* Border Radius */
  --radius-md: 4px;
  --radius-lg: 8px;
  --radius-xl: 12px;
  --radius-2xl: 16px;
}
```
