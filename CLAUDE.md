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

**Planning stage — there is no application code yet.** The repository is a
documentation site:

- `README.md` — short front door, structured per makeareadme.com
- `SOUL.md` — project philosophy; consult it for any product decision
- `CLAUDE.md` / `AGENTS.md` — this file (AGENTS.md is a symlink; edit
  CLAUDE.md only, never replace the symlink with a real file)
- `wiki/` — the full product brief as MkDocs pages (vision, MVP, features,
  data, design, tech stack, platforms, roadmap), plus
  `wiki/implementation-plan.md` — the agentic task breakdown for building
  the MVP; start there before implementing anything
- `mkdocs.yml` — MkDocs config (Material theme, `docs_dir: wiki`)
- `requirements.txt` — Python deps for the docs site

## Commands

```sh
pip install -r requirements.txt   # install MkDocs + Material theme
mkdocs serve                      # docs at http://127.0.0.1:8000, live reload
mkdocs build --strict             # build to site/; fails on broken nav/links
```

`site/` is build output and is gitignored — never commit it.

## Working on the docs

- New long-form content goes in `wiki/` as a Markdown page; add it to the
  `nav` section of `mkdocs.yml`. Keep `README.md` short — it links into the
  wiki rather than duplicating it.
- Run `mkdocs build --strict` before committing docs changes to catch broken
  links and nav entries.
- Keep the tone of the docs like the product: plain, calm, no hype.

## When application code starts

The build is planned in `wiki/implementation-plan.md`, which fixes the
stack (research-verified July 2026) and breaks the MVP into tasks with
prompts, tiers and dependencies — follow it rather than re-deciding. In
brief:

- React + Vite + TypeScript (strict) + Tailwind v4
- MapLibre GL JS via `@vis.gl/react-maplibre`; OpenFreeMap dark basemap
  (key-free) + AWS Terrarium terrain with `maplibre-contour`
- Zustand + `persist` (localStorage) — local-first, no accounts or backend
- Static JSON data for peaks (DoBIH, CC BY 4.0); canvas-composited image
  export
- Vitest + Playwright + ESLint 10 + Prettier; GitHub Actions CI/CD with a
  GitHub Pages testing deployment and per-PR previews
- Web-first responsive app, then PWA, then wrapped/native iPhone and Android

Conventions to preserve when that work begins:

- Peak source data and user progress are **separate** records — see the
  `Peak` and `PeakProgress` schemas in `wiki/data.md`; don't merge them.
- Adding a new hill list must stay a data-only change, not a refactor.
- Respect data licensing (Database of British and Irish Hills, OS open
  data) — attribution requirements are noted in `wiki/data.md`.
- Visual style is dark, monochrome, topographic and restrained — grey for
  unbagged, soft green for bagged. No gamified colours. See
  `wiki/design.md`.
- Update this file with real build/test/lint commands as soon as they exist.
