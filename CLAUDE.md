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
- `index.html` — Vite app entry
- `src/` — React app; `src/domain/` stays pure and framework-free
- `src/data/` — the hill-list registry (`lists.ts`), generated peak data
  (Wainwrights, Munros, Corbetts, Grahams, Donalds), Lake District boundary
  data and attribution constants
- `src/map/` — the MapLibre/OpenFreeMap tracker wrapper, terrain/contour setup
  and map layers; keep MapLibre imports isolated here
- `src/store/` — local-first Zustand progress and preferences stores
- `wiki/` — the full product brief as MkDocs pages (vision, MVP, features,
  data, design, tech stack, platforms, roadmap), plus
  `wiki/implementation-plan.md` — the agentic task breakdown for building
  the MVP; start there before implementing anything
- `mkdocs.yml` — MkDocs config (Material theme, `docs_dir: wiki`)
- `requirements.txt` — Python deps for the docs site
- `package.json` — app scripts and JavaScript tooling

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
npm run test:e2e        # production build + Playwright smoke test
npm run data:peaks      # refresh hill-list peak data from DoBIH (all lists, or pass list ids)
npm run data:boundary   # refresh Lake District boundary data from Natural England
npm run data:hill-boundaries # refresh generated Wainwright hill profiles
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
  `Peak` and `PeakProgress` schemas in `wiki/data.md`; don't merge them.
- Adding a new hill list must stay a data-only change, not a refactor:
  commit the generated peak JSON and add one entry to the registry in
  `src/data/lists.ts` (peak data loads lazily per list). The active list is
  a persisted preference; per-list stats come from passing the active
  list's peaks to `calculateProgress`.
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
- Keep this file current when commands, data sources or architecture change.
