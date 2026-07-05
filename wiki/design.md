# Visual style

Munro should feel:

- Dark
- Minimal
- Topographic
- Technical
- Outdoors-focused
- Calm and premium

## Suggested styling

- Dark charcoal background
- Grey contour lines
- Muted grey unbagged peaks
- Pastel green bagged peaks
- Clean sans-serif typography
- Small technical labels
- Thin borders
- Minimal animations
- Smooth hover states

## Avoid

- Bright gamified colours
- Overly playful icons
- Heavy 3D effects
- Bloated dashboards
- Social media clutter
- Complex route planning in MVP

The visual direction should be monochrome, restrained and premium — a
premium outdoor logbook with a technical map aesthetic, not a cartoon hiking
app. This applies identically on the web, iPhone and Android: one design
language on every screen.

## Implementation tokens

The web app defines the first design tokens in `src/index.css` using Tailwind
v4's CSS `@theme` block:

- `--color-surface`, `--color-panel` and `--color-line` for the dark shell and
  thin UI borders.
- `--color-contour`, `--color-unbagged` and `--color-muted` for map-adjacent
  greys.
- `--color-bagged` for the single soft green completion accent.
- `--color-primary` and `--color-secondary` for text.
- `--font-sans`, `--font-label` and `--text-label` for clean interface
  typography and small technical labels.
