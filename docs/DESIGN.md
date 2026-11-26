# Design

Dark-grey dashboard with BNB-badge yellow accents, laid out like a mail client. Reference: the "Build N Build" badge and BNB Bangkok poster (pixel type, halftone flower, yellow on dark).

## Layout
Gmail-style three columns, defined in `web/src/app/page.tsx`:
- **Top bar** — pixel `AURA` wordmark + two tiles, feed search pill, network badge, wallet button.
- **Left sidebar** — primary Deposit button, nav (Oracle, Market, Vault, Demo, Activity) with status badges, data sources.
- **Main pane** — hero heading, then a 2-column card grid (oracle, market, vault, demo) and the activity terminal.
- **Right panel** — Cournot agent (probability bar, evidence, recommendation).

## Color tokens (`web/tailwind.config.ts`)
| Token | Hex | Use |
|-------|-----|-----|
| `bg` | `#1F1F23` | page background |
| `panel` | `#2A2A2F` | main pane, side panels, top-bar pill |
| `card` | `#323238` | cards (always opaque) |
| `line` | `#55555C` | borders, dividers, bar tracks |
| `ink` | `#F5F5F5` | body text (use `/90`, `/70`, `/60` for secondary; never lower) |
| `accent` | `#F2B90D` | buttons, active nav, card titles, links, bar fills |
| `sun` | `#FFD84A` | caution state (Medium risk, DEFENSIVE) |
| `alert` | `#2BD67B` | danger/stale state and wrong-network button (green by request) |

Text on `accent` is always `bg` (dark). Never put text directly on the flower background: content sits on opaque `panel`/`card`.

## Type
- **Pixelify Sans Bold** (`font-pixel`) — wordmark, headings, prices, uppercase labels with `tracking-[0.2em]`.
- **Space Grotesk** (`font-sans`) — body text.
- Rules: one big pixel heading per view, square corners, no gradients or shadows.

## Background (`web/src/components/PixelBg.tsx`)
Fixed canvas: a field of 6-petal flowers (staggered grid, random rotation) drawn at 1/8 resolution with 4×4 ordered dither (sparse dots at the centre, solid at the tips), scaled up with `image-rendering: pixelated`, rows nudged sideways for a glitch. Dark gold `#4E421E` (muted so it recedes), flower size and density set by `CELL` and `FLOWER_SIZE` on `bg`.

## Known gaps
- Pixelify Sans approximates, but does not match, the badge's custom face.
- BNB cube logo not yet in the header (placeholder A/R tiles).
