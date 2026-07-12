# Operations

One-time repository settings a maintainer with admin access must apply, and
a short guide to how deployments work day to day. The workflows themselves
live in `.github/workflows/` and need no configuration beyond this page —
the stack is key-free, so there are no secrets to set.

## One-time repository settings

Work through this checklist once, top to bottom:

1. **Actions** — Settings → Actions → General: allow GitHub Actions to run
   (read and write is not needed; each workflow declares its own
   permissions).
2. **Pages source** — Settings → Pages: set Source to **Deploy from a
   branch**, branch **gh-pages**, folder **/ (root)**. Both the main deploy
   and PR previews publish to this branch; do not switch to the "GitHub
   Actions" source. If this ever drifts (for example to `main`), Pages
   serves the raw repository source instead of the built app — the browser
   console shows module scripts rejected with an
   `application/octet-stream` MIME type and a 404 for
   `/%BASE_URL%favicon.svg`. The deploy workflow's post-deploy check fails
   loudly when this happens; the fix is to set this setting back, then
   re-run the deploy from the Actions tab.
3. **Custom domain** — Settings → Pages: set the custom domain to
   **munro.welbournesecurity.com** and tick **Enforce HTTPS** once the
   certificate is issued. Every build also ships a `CNAME` file (from
   `public/CNAME`) so the binding survives each deploy.
4. **Main ruleset** — Settings → Rules → Rulesets: create a ruleset for
   `main` that requires a pull request before merging and requires these
   status checks to pass: **checks**, **build**, **e2e** (from `ci.yml`)
   and **docs**. The real `docs` build (`docs.yml`) only runs when docs
   inputs change; on every other PR a same-named no-op job
   (`docs-skip.yml`) reports instead, so the required check never blocks a
   non-docs PR waiting for a status that will never arrive.
5. **Dependabot** — Settings → Advanced Security: enable Dependabot alerts
   (version updates are already configured in `.github/dependabot.yml`).

## How deployments work

- **Main deploy** (`deploy.yml`) — every push to `main` builds the app and
  publishes `dist/` to the root of the `gh-pages` branch, which GitHub
  Pages serves at <https://munro.welbournesecurity.com>. It excludes the
  `pr-preview/` directory from cleanup so open previews survive.
- **PR previews** (`pr-preview.yml`) — each pull request is built with a
  per-PR base path and deployed to `pr-preview/pr-<number>/` on `gh-pages`.
  A sticky comment on the PR links to the preview; closing the PR removes
  it. Fork PRs get no preview — that is a security feature, not a bug.
- **Manual re-runs** — `deploy.yml` has a `workflow_dispatch` trigger, so
  the site can be redeployed from the Actions tab without a new commit.
  Any failed run (deploy, preview, CI) can also be re-run from its run
  page.

## Performance budget

`wiki/mvp.md` asks that "the map loads quickly". This section records what
the production build actually costs and the thresholds future PRs are held
to, so regressions are visible in review rather than discovered later.

### Measured (July 2026)

Production build (`vite build`), gzip sizes as reported by Vite. Updated
July 2026 after the hill-profile GeoJSON was quantized to ~1 m coordinate
precision and written compact (main chunk 2,371.8 → 1,749.3 kB minified,
610.0 → 466.7 kB gzip):

| Asset | Minified | Gzip |
| --- | --- | --- |
| Main JS chunk (`index-*.js`) | 1,749.3 kB | 466.7 kB |
| Export engine chunk (`export-*.js`, lazy) | 6.9 kB | 2.8 kB |
| CSS (`index-*.css`) | 91.5 kB | 15.0 kB |
| `index.html` | 1.8 kB | 0.8 kB |

The main chunk decomposes roughly as: maplibre-gl ≈ 230–270 kB gzip (the
map engine — accepted, the map is the product), the generated Wainwright
hill-profile GeoJSON ≈ 223 kB gzip (the hill-lighting data — also the
product), and everything else — React, maplibre-contour glue, Zustand
stores, peak data and all app code — in the remaining ≈ 120–160 kB gzip.
The export engine is dynamic-imported by the export dialog and stays out
of the initial bundle.

Load timings were measured against a local `vite preview` of the
production build in headless Chromium, throttled to a Fast-3G-class
profile via CDP (150 ms RTT, 1.44 Mbps effective down, 675 Kbps up —
Chrome DevTools' "Fast 3G" preset). Lighthouse is not available in the
measurement environment, so these are standard paint/navigation
performance entries plus a canvas-pixel probe for "first map render",
which is the closest proxy. **Caveat:** external tile/style/terrain
fetches went through a development sandbox's HTTPS proxy, which adds
overhead and hides connection-setup savings, so treat the absolute
render-time numbers as an upper-bound sanity check rather than field data.
Median of three runs:

| Metric | Median |
| --- | --- |
| First paint | ~0.5 s |
| First contentful paint | ~3.9 s |
| DOMContentLoaded / load | ~3.8 s |
| Map canvas present | ~3.9 s |
| First map render (canvas shows map pixels) | ~6.5 s |

On the throttled profile the timeline is dominated by downloading the
main chunk (~610 kB gzip at ~180 kB/s ≈ 3.4 s), then style, glyph and
tile fetches until the first frame draws.

### Thresholds for future PRs

The size thresholds below are **enforced automatically**:
`npm run perf:budget` (`scripts/check-bundle-budget.ts`) runs after the
build in `npm run verify`, in the CI build job and in the deploy build
job, and fails when the gzip output exceeds them.

- **maplibre-gl ≈ 230 kB gzip is accepted.** The map is the product; do
  not swap or fork the engine to chase this number.
- **The export engine stays a separate lazy chunk**, ≤ 20 kB gzip, and is
  never statically imported from startup code paths.
- **Total initial JS ≤ 650 kB gzip** (currently 467 kB). A PR that pushes
  past this must say what grew and why it is worth it.
- **App code excluding maplibre-gl and the bundled hill/peak data stays
  small** — the non-engine, non-data remainder is ≈ 120–160 kB gzip today
  and should not grow past ≈ 200 kB gzip without justification.
- **CSS ≤ 20 kB gzip** (currently 15.0 kB).
- **First map render ≤ 8 s on a Fast-3G-class throttle** measured as
  above (currently ~6.5 s with the proxy caveat).
- `build.chunkSizeWarningLimit` in `vite.config.ts` is set to 1,850 kB —
  just above the current main chunk — so Vite's size warning only fires
  when this budget is actually exceeded. If the warning appears, treat it
  as a budget failure, not noise to silence.

Cheap wins already applied: the export module is code-split;
`index.html` preconnects (with `crossorigin`) to the OpenFreeMap tile
host and the AWS terrain host so tile fetches skip DNS + TLS setup once
the app boots; no web fonts load (system font stacks only, and map glyphs
come from the OpenFreeMap host already preconnected), so nothing blocks
render on fonts. The PWA service worker registers only after the load
event goes idle, so its ~2.5 MiB shell precache never competes with the
first map render. Anything beyond this — bundler plugins, dependency
swaps — remains out of scope by design.

## If the custom domain is ever dropped

The site would fall back to `https://welbournesecurity.github.io/Munro/`,
which is served from a `/Munro/` subpath rather than the domain root. To
revert:

1. Set `base: '/Munro/'` in `vite.config.ts`.
2. Change the `baseURL` and `webServer.url` in `playwright.config.ts` to
   `http://127.0.0.1:4173/Munro/`.
3. Delete `public/CNAME`.
4. Change the PR-preview build base in `pr-preview.yml` to
   `/Munro/pr-preview/pr-<number>/`.
5. Remove the custom domain from the Pages settings.
