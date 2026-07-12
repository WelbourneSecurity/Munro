# CLAUDE.md

Guidance for Claude Code (and other AI agents — this file is symlinked as
AGENTS.md) when working in this repository.

## What Munro is

Munro is a clean, map-first hiking tracker for UK peak bagging. Users see
hill lists (Wainwrights first, then Munros, Corbetts, etc.) on a dark,
minimal topographic map, mark peaks as bagged, track progress, and export a
shareable image. It is being developed into an app accessible via the web,
on iPhone and on Android.

It is deliberately **not** a social network, route planner, GPX library or
navigation tool. Read `SOUL.md` before proposing features — restraint is a
core product value, and the MVP non-goals in `wiki/roadmap.md` are firm.

## Repository state

**The Wainwrights MVP is implemented.** The repository contains the working
app (map tracker, bag/unbag with dates and notes, local-first progress with
JSON backup/restore, stats, image export, terrain toggle, responsive mobile
layout), its test suites, the CI/CD workflows and the documentation site:

- `README.md` — short front door, structured per makeareadme.com
- `SOUL.md` — project philosophy; consult it for any product decision
- `CLAUDE.md` / `AGENTS.md` — this file is the source of agent instructions;
  edit `CLAUDE.md` only
- `index.html` — Vite app entry (preconnects to tile hosts)
- `src/app/` — shell, hand-rolled hash router (`#/`, `#/tracker`, `#/data`,
  `#/settings`) and pages
- `src/components/` — peak list panel, progress stats, export dialog
- `src/domain/` — Zod schemas (`Peak`, `PeakProgress`, `Backup`) and pure
  logic; stays free of React and MapLibre imports
- `src/data/` — generated Wainwright peak data, boundary/hill-profile
  GeoJSON and attribution constants
- `src/map/` — the MapLibre/OpenFreeMap tracker wrapper, committed dark
  style fork, terrain/contour setup and map layers; runtime MapLibre
  imports stay inside this directory
- `src/store/` — local-first Zustand stores persisted to localStorage
  (`munro.progress.v1`, `munro.prefs.v1`)
- `src/export/` — canvas snapshot/composition engine, loaded as a lazy chunk
- `scripts/` — data generation from DoBIH and Natural England
- `tests/e2e/` — Playwright specs, run in desktop Chromium and an
  iPhone-13-sized mobile project
- `.github/workflows/` — CI, deploy, PR previews, docs build, CodeQL
- `public/CNAME` + `base: '/'` in `vite.config.ts` — the app deploys from
  `main` to <https://munro.welbournesecurity.com> at the domain root
- `wiki/` — the product docs as MkDocs pages (vision, MVP, features, data,
  design, tech stack, platforms, operations, roadmap), plus
  `wiki/implementation-plan.md` — the historical build plan for the MVP
- `mkdocs.yml` — MkDocs config (Material theme, `docs_dir: wiki`)
- `requirements.txt` — Python deps for the docs site
- `package.json` — app scripts and JavaScript tooling
- `capacitor.config.ts` — Capacitor wrapper config for the mobile apps; the
  native `android/` and `ios/` projects are generated in CI, gitignored and
  never committed
- `.github/workflows/mobile-packaging.yml` — packages an Android APK and an
  unsigned iOS IPA on every push to `main` (see `wiki/platforms.md`)
- `.github/workflows/ci.yml` — runs `npm run verify` on every pull request
  and push to `main`

## Commands

```sh
npm ci                  # install app dependencies
npm run dev             # Vite dev server
npm run build           # typecheck and production build
npm run preview         # preview production build
npm run typecheck       # TypeScript project references, no emit
npm run lint            # ESLint 10 flat config
npm run lint:fix        # ESLint autofix
npm run format          # Prettier write
npm run format:check    # Prettier check
npm run test            # Vitest unit/component tests
npm run test:watch      # Vitest watch mode
npm run test:coverage   # Vitest coverage thresholds
npm run test:e2e        # production build + Playwright (chromium + mobile projects)
npm run data:peaks      # refresh Wainwright data from DoBIH
npm run data:boundary   # refresh Lake District boundary data from Natural England
npm run data:hill-boundaries # refresh generated Wainwright hill profiles
npm run data:icons      # regenerate committed PWA icons in public/
npm run verify          # typecheck -> lint -> format:check -> test -> build
pip install -r requirements.txt
mkdocs serve            # docs at http://127.0.0.1:8000, live reload
mkdocs build --strict   # build to site/; fails on broken nav/links
```

`site/` is build output and is gitignored — never commit it.

## Working on the docs

- New long-form content goes in `wiki/` as a Markdown page; add it to the
  `nav` section of `mkdocs.yml`. Keep `README.md` short — it links into the
  wiki rather than duplicating it.
- Run `mkdocs build --strict` before committing docs changes to catch broken
  links and nav entries.
- Keep the tone of the docs like the product: plain, calm, no hype.

## Application code

The MVP was built from `wiki/implementation-plan.md` (stack research-verified
July 2026); the shipped stack is described in `wiki/tech-stack.md`. In brief:

- React 19 + Vite 8 + TypeScript (strict) + Tailwind v4
- MapLibre GL JS via `@vis.gl/react-maplibre`; OpenFreeMap dark basemap
  (key-free); AWS Terrarium terrain with `maplibre-contour`
- Zustand + `persist` (localStorage) — local-first, no accounts or backend
- Static JSON data for peaks (DoBIH, CC BY 4.0); Natural England boundary
  data (OGL v3); canvas-composited image export
- Vitest + Playwright + ESLint 10 + Prettier; GitHub Actions CI/CD deploying
  `main` to <https://munro.welbournesecurity.com> with per-PR previews
- Web-first responsive app, then PWA, then wrapped/native iPhone and Android

Conventions to preserve:

- Peak source data and user progress are **separate** records — see the
  `Peak` and `PeakProgress` schemas in `wiki/data.md` and
  `src/domain/schemas.ts`; don't merge them.
- Adding a new hill list must stay a data-only change, not a refactor.
- `src/domain/` stays pure: no React, no MapLibre, no store imports — just
  schemas and framework-free logic that tests run fast.
- Runtime MapLibre imports stay inside `src/map/`: `MapView.tsx` is the
  **only** module that imports `@vis.gl/react-maplibre`, and `terrain.ts`
  is the only one that imports `maplibre-gl` directly (to register the
  shared DEM protocol). Modules outside `src/map/` may import MapLibre
  types only. Map layer styling lives as data-driven expressions in
  `src/map/layers.ts`, and the tile/terrain URLs stay isolated in
  `src/map/config.ts`.
- Bagged/selected marker state is written into the peak and hill-profile
  GeoJSON feature properties (rebuilt from the store) and styled with
  data-driven expressions — don't move that state into component-level
  markers or DOM overlays.
- Hill lighting uses generated summit-centred hill profiles clipped to the
  Lake District boundary. Treat them as approximate visual lighting profiles,
  not authoritative legal, route or geomorphological boundaries.
- The export engine (`src/export/`) is dynamic-imported by the export dialog
  and must stay a separate lazy chunk — never statically import it from
  startup code paths. Exported images must draw attribution into the pixels.
- Respect data licensing (Database of British and Irish Hills, OpenFreeMap /
  OpenStreetMap, AWS Terrain Tiles / Mapzen, Natural England OGL data) —
  attribution requirements are noted in `wiki/data.md` and centralized in
  `src/data/attribution.ts`; render from those constants, don't hand-copy.
- The app is served from the custom-domain root: `base: '/'` in
  `vite.config.ts` plus `public/CNAME`. PR previews override the base at
  build time. Load static assets via `import.meta.env.BASE_URL`.
- Playwright runs two projects: desktop `chromium` and an iPhone-13-sized
  `mobile` project for the phone-critical journeys — keep both passing.
- Mind the performance budget in `wiki/operations.md` before adding
  dependencies or data to the initial bundle.
- Visual style is dark, monochrome, topographic and restrained — grey for
  unbagged, soft green for bagged. No gamified colours. See
  `wiki/design.md`.
- Summit detection is strictly opt-in and never persists location data —
  only the boolean preference and normal `PeakProgress` records are stored.
  The detection logic in `src/domain/summits.ts` is list-agnostic; the
  active peaks array is handed to `useSummitDetection` in `src/app/App.tsx`.
- Keep this file current when commands, data sources or architecture change.
