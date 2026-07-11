# MVP implementation plan

This is the agentic build plan for the Wainwrights MVP described in
[MVP](mvp.md). It breaks the whole MVP into small, independently
implementable tasks that any capable coding agent (or human) can pick up,
with explicit dependencies, suggested model tiers, acceptance criteria and a
ready-to-use prompt per task.

Technology choices below were **verified by research agents in July 2026**
(current versions, licences, maintenance status). Version numbers are the
majors verified at that date; implementing agents should install the latest
patch of the stated major and only escalate if a new major has shipped.

!!! note "Status (July 2026)"

    The MVP tasks in this plan are **implemented**. This page is kept as the
    historical build record; for the shipped stack see
    [Tech stack](tech-stack.md), and for deployments see
    [Operations](operations.md). One decision changed during the build: the
    site deploys to the custom domain <https://munro.welbournesecurity.com>
    at the domain root, so the Vite base is `'/'` — superseding gotcha 1's
    `'/Munro/'` base guidance and the `welbournesecurity.github.io/Munro`
    hosting row below. PR previews still build with a per-PR base.

## How to use this document

- Each task has an ID (`T0.1`, `T3.4`, …), a **tier** (the smallest model
  class expected to complete it reliably), **dependencies**, a **scope**,
  a **done when** checklist and an **example prompt**.
- Tasks with no dependency relationship are parallelisable. The
  [wave schedule](#wave-schedule) gives a ready-made parallel ordering.
- One task = one branch = one PR into `main`. Keep PRs small; CI must pass
  before merge. When agents run in parallel, give each its own worktree or
  clone.
- Prompts are starting points. An orchestrator should paste the standing
  rules below into every subagent prompt, then the task prompt.

### Model tiers

| Tier | Class | Use for |
| --- | --- | --- |
| **S** | small/fast (Haiku-class) | Mechanical, fully specified, low-risk: config files, data downloads, boilerplate workflows |
| **M** | medium (Sonnet-class) | Standard feature work with a clear spec: components, stores, scripts, tests, CI |
| **L** | large (Opus/Fable-class) | Architecture, visual-critical map work, WebGL/export edge cases, cross-cutting review |

Tiers are minimums — running an M task on a large model is fine; running an
L task on a small model is not.

### Standing rules for every agent

Include these verbatim in every subagent prompt:

```text
Standing rules for working on Munro:
1. Read SOUL.md, CLAUDE.md and the wiki pages named in your task before
   writing anything. Restraint is a core product value: build exactly what
   the task asks, nothing more.
2. Stay inside your task's scope and file list. Do not refactor, rename or
   "improve" code outside it; if you believe something outside your scope is
   wrong, report it in your PR description instead of changing it.
3. Peak source data and user progress are separate records (Peak vs
   PeakProgress). Never merge them. Adding a hill list must remain a
   data-only change.
4. The stack is deliberately key-free: no API keys, tokens or secrets in
   code, config or workflows. If a task seems to need one, stop and report.
5. Visual work follows wiki/design.md: dark charcoal, monochrome, muted grey
   unbagged / soft pastel green bagged, no gamified colours or playful icons.
6. Before finishing, run the repo verification commands (npm run typecheck,
   lint, format:check, test, build — plus mkdocs build --strict if you
   touched docs) and fix what they report.
7. Keep the docs true: if your change alters commands, stack facts, data,
   licensing or user-facing behaviour, update README.md, the relevant wiki/
   page and CLAUDE.md in the same PR. Documentation drift is a bug.
8. Use Conventional Commit messages (feat:, fix:, docs:, chore:, data:).
9. Respect data licences. DoBIH data is CC BY 4.0; the boundary is OGL v3.
   Attribution requirements are listed in wiki/data.md — never remove them.
```

### Documentation upkeep (standing requirement)

Keeping `README.md`, the `wiki/`, and `CLAUDE.md` current is part of the
MVP, not an afterthought:

- **Every task** updates docs affected by its change (rule 7 above).
- **Every phase** ends with a docs gate: before a phase is called complete,
  confirm README quick-start, `CLAUDE.md` commands and the wiki pages
  touched by that phase match reality, and `mkdocs build --strict` passes.
- **CI enforces buildability**: the docs workflow (T1.5) fails PRs that
  break the wiki build.
- **T7.1** is a final full-repo docs reconciliation before MVP acceptance.

## Verified technology decisions

Findings from four parallel research agents (frontend stack, CI/CD, testing
toolchain, peak data), July 2026.

| Concern | Decision | Verified version | Fallback |
| --- | --- | --- | --- |
| Framework | React + Vite SPA (no Next.js — static export adds only constraints for a single-view local-first app) | React 19.2, Vite 8.1 | Pin Vite 7.3 if Rolldown issues appear |
| Language | TypeScript, strict-plus flags, `tsc --noEmit` as its own CI check | TypeScript 6.0 (typescript-eslint caps at `<6.1` — pin minor bumps) | — |
| Styling | Tailwind CSS v4 via `@tailwindcss/vite` plugin (no PostCSS config; theme tokens in CSS `@theme`) | Tailwind 4.3 | — |
| Map | MapLibre GL JS via `@vis.gl/react-maplibre` | maplibre-gl 5.24 (pin 5.x; v6 in pre-release), react-maplibre 8.1 | Direct MapLibre in a thin hook |
| Basemap | OpenFreeMap public instance — free, **no API key**, no request limits, full custom-style freedom; fork its Dark style | n/a | Self-hosted PMTiles (Protomaps extract or OS Open Zoomstack) on free object storage |
| Terrain | AWS Terrain Tiles (Terrarium, public S3, **no key**) as `raster-dem` for hillshade + `maplibre-contour` for client-side contour lines | n/a | MapTiler terrain (keyed — avoid) |
| State | Zustand with `persist` middleware → localStorage, versioned with `migrate` | Zustand 5.0 | `idb-keyval` if storage outgrows localStorage |
| Validation | Zod for peak-data validation in CI and backup-import validation at runtime (`zod/mini` on the client path) | Zod 4.4 | Valibot if bundle size ever matters |
| Image export | Capture the MapLibre canvas (`preserveDrawingBuffer: true`, snapshot on `idle`) and composite title/stats/attribution on an offscreen 2D canvas — **not** DOM screenshotting; `html-to-image` is stale (last release Feb 2025) | `modern-screenshot` 4.7 only if DOM capture is ever needed | — |
| Routing | Hash-based routing (4 pages) — sidesteps GitHub Pages' SPA-404 problem on both the project subpath and PR-preview subpaths | react-router (current major) `createHashRouter`, or a ~30-line hand-rolled hash router | `404.html` copy trick with a BrowserRouter |
| Unit tests | Vitest + jsdom + React Testing Library; pure logic in `node` environment | Vitest 4.1, RTL 16.3 | Vitest Browser Mode (now stable) if jsdom fidelity bites |
| E2E | Playwright, Chromium-only in CI to start | Playwright 1.61 | — |
| Lint | ESLint 10 flat config + typescript-eslint (`strictTypeChecked`) + `eslint-plugin-react-hooks` 7 + `eslint-plugin-jsx-a11y` — **not Biome** (trails on react-hooks, a11y and Tailwind sorting) | eslint 10.6, typescript-eslint 8.62 | — |
| Format | Prettier + `prettier-plugin-tailwindcss` (official class sorter) | Prettier 3.9 | — |
| Coverage | `@vitest/coverage-v8`, thresholds 80/80/80 lines/functions/statements, 70 branches, ratchet-only | bundled with Vitest | — |
| Git hooks | husky + lint-staged (eslint --fix + prettier on staged files only; tests stay in CI) | husky 9.1, lint-staged 17 | — |
| Node | Node 24 (Active LTS), via `.nvmrc` + `engines` | — | — |
| CI/CD | GitHub Actions: `ci.yml` (checks + build + e2e), gh-pages-branch deploy, per-PR previews, CodeQL v4, Dependabot | actions/checkout v7, setup-node v6, upload-artifact v7 | — |
| Hosting | GitHub Pages at `https://welbournesecurity.github.io/Munro/` (testing/preview deployment) | — | Cloudflare Pages if preview UX outgrows Pages |

Known gotchas the research surfaced (referenced by tasks below):

1. **Vite base path**: project pages require `base: '/Munro/'`; PR previews
   require a per-PR base. Load static assets via `import.meta.env.BASE_URL`.
2. **PR previews on Pages**: Pages serves one site per repo, so previews use
   `rossjrw/pr-preview-action` on a `gh-pages` branch — which forces the
   *main* deploy to be branch-based too (Pages source = "Deploy from
   branch", `JamesIves/github-pages-deploy-action` with
   `clean-exclude: pr-preview/`). Fork PRs get no preview; that is a
   security feature — never work around it with `pull_request_target`.
3. **WebGL export**: DOM-snapshot libraries see a blank map. Create the map
   with `preserveDrawingBuffer: true`, snapshot on the `idle` event, and
   draw attribution text into the exported image (canvas capture excludes
   the DOM attribution control; licences still require it on the image).
4. **Map unit testing**: WebGL doesn't run in jsdom. Keep map logic pure and
   test it plainly; mock `maplibre-gl` for the one wrapper component; assert
   real rendering only in Playwright.
5. **DoBIH data** (v18.4 verified): CSV download at hill-bagging.co.uk,
   licence CC BY 4.0, exactly **214 rows with the `W` flag**, stable hill
   `Number` as primary key, and WGS84 lat/lon provided directly — no
   coordinate conversion needed. `hills-database.co.uk` now redirects to
   `hill-bagging.co.uk`.
6. **Boundary data**: Natural England "National Parks (England)", OGL v3.
   Full-resolution polygon is 1.33 MB; server-side simplification
   (`geometryPrecision=5&maxAllowableOffset=0.0005`) yields ~15 KB and is
   visually identical at app zooms.
7. **jsx-a11y** still declares an ESLint ≤9 peer; it works on ESLint 10
   with a warning — tolerate or add an npm `overrides` entry.

## Repository layout

The app lives at the **repo root** (this stays a single-product repo; the
wiki remains in `wiki/` + `mkdocs.yml` untouched):

```text
/
├── .github/workflows/     ci.yml, deploy.yml, pr-preview.yml, codeql.yml, docs.yml
├── .github/dependabot.yml
├── index.html              Vite entry
├── src/
│   ├── app/                shell, hash router, pages (Home, Tracker, Data, Settings)
│   ├── components/         list panel, stats, peak detail, export dialog
│   ├── map/                MapView wrapper, munro-dark style JSON, terrain/contour config
│   ├── data/               wainwrights.json, boundaries/, attribution constants
│   ├── domain/             schemas (Peak, PeakProgress, Backup), pure logic (filters, stats, geojson builders)
│   ├── store/              Zustand progress + preferences stores
│   └── export/             snapshot + canvas composition
├── scripts/                build-peak-data (DoBIH CSV → JSON), fetch-boundary
├── tests/e2e/              Playwright specs
├── wiki/ + mkdocs.yml      product docs (unchanged location)
└── package.json, vite.config.ts, tsconfig.json, eslint.config.js, …
```

Two firm boundaries: `src/domain/` has no React and no MapLibre imports
(pure, fast to test); `src/map/MapView` is the **only** module that touches
`maplibre-gl` directly.

## Decisions needing a human

Agents must not make these calls; they block the tasks noted:

1. **Licence** — README says "not yet decided". MIT is recommended (research
   confirmed no conflict with CC BY 4.0 data or OGL boundaries — data
   licences apply to data, code licence to code). Blocks T7.1's final
   README; nothing else.
2. **GitHub repo settings** (admin access): set Pages source to "Deploy from
   branch: gh-pages" (required by the PR-preview approach), create the
   `main` ruleset requiring the `checks`/`build`/`e2e` status checks, and
   confirm Actions are enabled. T1.6 produces the exact checklist.
3. **OpenFreeMap acceptance** — it is free with no SLA. Accept for the MVP
   testing deployment? (Fallback is self-hosted PMTiles; T3.2 keeps the tile
   source swappable either way.)

---

## Phase 0 — Foundations

Everything else builds on this phase. T0.1 runs alone first; T0.2–T0.6 then
run in parallel; T0.7–T0.8 close the phase.

### T0.1 — Scaffold the Vite + React + TypeScript app

**Tier:** M · **Depends on:** nothing · **Blocks:** almost everything

**Scope:** Create the Vite 8 + React 19 + TypeScript app at the repo root
without disturbing the existing docs files (`wiki/`, `mkdocs.yml`,
`README.md`, `SOUL.md`, `CLAUDE.md`, `AGENTS.md` symlink,
`requirements.txt`). Set `base: '/Munro/'` in `vite.config.ts`. Add
`.nvmrc` (24) and `engines` to `package.json`. Extend `.gitignore`
(`node_modules/`, `dist/`, `coverage/`, `playwright-report/`,
`test-results/`). Create the `src/` skeleton directories with placeholder
modules and a minimal "Munro" render so `npm run dev` and `npm run build`
work.

**Done when:** `npm ci && npm run dev` serves a page; `npm run build`
outputs `dist/` with `/Munro/`-prefixed asset URLs; no existing file is
modified except `.gitignore` and README's installation section; the AGENTS.md
symlink is intact.

```text
Task: scaffold the Munro web app.
Read: SOUL.md, CLAUDE.md, wiki/tech-stack.md, wiki/platforms.md, and the
"Repository layout" section of wiki/implementation-plan.md.
Do: scaffold Vite 8 + React 19 + TypeScript at the repository root using the
react-ts template, keeping every existing docs file untouched. Configure
vite.config.ts with base '/Munro/'. Add .nvmrc with Node 24 and an engines
field. Create the src/ directory skeleton exactly as the layout section
shows, with empty placeholder modules. Render a minimal dark placeholder
page (charcoal background, the word "Munro") — no design work yet.
Update README.md's Installation/Usage sections with the real npm commands,
and CLAUDE.md's Commands section likewise.
Do not: add Tailwind, ESLint, tests, routing or any feature code — later
tasks own those. Do not touch mkdocs.yml or wiki/ content.
Verify: npm ci, npm run dev, npm run build; confirm dist/ asset paths start
with /Munro/; mkdocs build --strict still passes.
```

### T0.2 — Strict TypeScript configuration

**Tier:** S · **Depends on:** T0.1

**Scope:** Configure `tsconfig` for strict-plus safety: `strict`,
`noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`,
`verbatimModuleSyntax`, `erasableSyntaxOnly`,
`noFallthroughCasesInSwitch`, `isolatedModules`,
`moduleResolution: "bundler"`, `noEmit`. Leave `noUnusedLocals`/`Parameters`
off (ESLint owns those). Add `npm run typecheck` → `tsc --noEmit` (or
`tsc -b` matching the scaffold's project references).

**Done when:** `npm run typecheck` passes on the scaffold and fails on a
deliberately unsound sample (test locally, don't commit the sample).

```text
Task: lock down TypeScript configuration for Munro.
Read: the "Verified technology decisions" table in
wiki/implementation-plan.md (TypeScript row) and the existing tsconfig files
from the Vite scaffold.
Do: apply the strict-plus flag set listed in the plan to the app tsconfig,
keeping Vite's project-reference structure. Add a "typecheck" npm script
running tsc with no emit. Update CLAUDE.md's Commands section.
Do not: change any src/ code beyond what the stricter flags force; do not
add lint tooling.
Verify: npm run typecheck passes; npm run build still passes.
```

### T0.3 — Tailwind v4 and the Munro design tokens

**Tier:** M · **Depends on:** T0.1

**Scope:** Install Tailwind v4 via `@tailwindcss/vite`. Define the design
system as CSS `@theme` tokens per `wiki/design.md`: dark charcoal
background, monochrome greys (borders, contours, muted text, unbagged
markers), one soft pastel green (bagged), a clean sans-serif stack, small
technical label sizes. Apply the base theme to the placeholder page. No
component work.

**Done when:** tokens exist with semantic names (e.g. `--color-bagged`,
`--color-unbagged`, `--color-surface`); the app renders dark by default;
`wiki/design.md` gains a short "Implementation tokens" note naming them.

```text
Task: set up Tailwind v4 and Munro's design tokens.
Read: SOUL.md, wiki/design.md, the Tailwind row of the decisions table in
wiki/implementation-plan.md.
Do: add Tailwind v4 with the @tailwindcss/vite plugin (no PostCSS config, no
tailwind.config.js). Define an @theme block with semantic tokens for the
palette in wiki/design.md — dark charcoal surface, grey scale for text/
borders/contours/unbagged peaks, one soft pastel green for bagged peaks —
plus font stack and technical label sizes. Style the placeholder page with
them. Append a brief "Implementation tokens" subsection to wiki/design.md
listing the token names.
Do not: build components, pick bright colours, or add animations.
Verify: npm run build; mkdocs build --strict.
```

### T0.4 — ESLint 10 + Prettier

**Tier:** M · **Depends on:** T0.1

**Scope:** ESLint 10 flat config with typescript-eslint
(`strictTypeChecked` + `stylisticTypeChecked`, `projectService: true`),
`eslint-plugin-react-hooks` (flat recommended), `eslint-plugin-jsx-a11y`
(expect the ESLint-10 peer warning; add an npm `overrides` entry or document
tolerance). Prettier with `prettier-plugin-tailwindcss`;
`eslint-config-prettier` last. Scripts: `lint`, `lint:fix`, `format`,
`format:check`.

**Done when:** all four scripts run clean on the scaffold; a file with a
hooks violation and an a11y violation fails lint locally (don't commit it).

```text
Task: add linting and formatting to Munro.
Read: the Lint/Format rows and gotcha 7 in wiki/implementation-plan.md.
Do: create eslint.config.js (flat, ESLint 10) with typescript-eslint
strictTypeChecked + stylisticTypeChecked using projectService, react-hooks
flat recommended, jsx-a11y, and eslint-config-prettier last. Add Prettier
with prettier-plugin-tailwindcss and a minimal .prettierrc. Add lint,
lint:fix, format, format:check npm scripts. Update CLAUDE.md commands.
Handle the jsx-a11y ESLint-10 peer warning via npm overrides with a comment,
or a documented decision to tolerate it.
Do not: add stylistic ESLint rules Prettier owns; do not reformat wiki/.
Verify: npm run lint and npm run format:check pass; npm run typecheck still
passes.
```

### T0.5 — Vitest + React Testing Library

**Tier:** M · **Depends on:** T0.1

**Scope:** Vitest 4 with two projects/environments: `node` for
`src/domain/**` and jsdom for component tests; RTL + jest-dom + user-event;
coverage via `@vitest/coverage-v8` with thresholds 80/80/80/70,
`include: ['src/**']`, excludes for `src/map/MapView`, `main.tsx` and
`src/data/**`. Scripts: `test`, `test:watch`, `test:coverage`. Seed one
trivial domain test and one trivial component test.

**Done when:** both seed tests pass; coverage report generates with
thresholds active.

```text
Task: set up unit testing for Munro.
Read: the Unit tests and Coverage rows plus gotcha 4 in
wiki/implementation-plan.md.
Do: configure Vitest 4 — node environment for src/domain/**, jsdom +
@testing-library/react + jest-dom + user-event for component tests, globals
on, a setup file importing jest-dom matchers. Configure @vitest/coverage-v8
with 80/80/80 lines/functions/statements and 70 branches, include src/**,
exclude src/map/MapView*, src/main.tsx and src/data/**. Add test,
test:watch, test:coverage scripts; update CLAUDE.md commands. Write one
placeholder domain test and one placeholder component render test.
Do not: write feature tests for code that doesn't exist yet; do not
configure Browser Mode.
Verify: npm run test and npm run test:coverage pass.
```

### T0.6 — Playwright scaffold

**Tier:** M · **Depends on:** T0.1

**Scope:** `@playwright/test` with Chromium project only, `webServer`
running `vite preview` against a production build, `trace:
'on-first-retry'`, HTML reporter, `tests/e2e/` with a single smoke spec
(page loads, title present, no console errors). Script: `test:e2e`.
Account for the `/Munro/` base path in `baseURL`.

**Done when:** `npm run build && npm run test:e2e` passes locally.

```text
Task: scaffold end-to-end testing for Munro.
Read: the E2E row of the decisions table and gotcha 1 in
wiki/implementation-plan.md.
Do: add @playwright/test with a Chromium-only project. Configure webServer
to run vite preview on the production build, baseURL including the /Munro/
base path, trace on-first-retry, HTML reporter. Create tests/e2e/smoke.spec
asserting the app loads with the Munro title and no console errors. Add a
test:e2e npm script; update CLAUDE.md commands.
Do not: write feature flows yet (T6.1 owns the real suite); do not add
other browsers.
Verify: npm run build then npm run test:e2e passes.
```

### T0.7 — Git hooks and editor hygiene

**Tier:** S · **Depends on:** T0.4

**Scope:** husky 9 + lint-staged 17 (pre-commit: `eslint --fix` +
`prettier --write` on staged files only — no tsc, no tests). Add
`.editorconfig` (lf, utf-8, final newline, 2-space indent). Document the
Conventional Commits convention (unenforced) in CONTRIBUTING.md, including
the custom `data:` type for hill-list changes.

**Done when:** a staged badly-formatted file is auto-fixed on commit;
CONTRIBUTING.md exists and README's Contributing section links to it.

```text
Task: add git hooks and contributor hygiene to Munro.
Read: the Git hooks row in wiki/implementation-plan.md; README.md's
Contributing section; SOUL.md.
Do: install husky 9 with a prepare script and a pre-commit hook running
lint-staged; configure lint-staged to run eslint --fix and prettier --write
on staged files only. Add .editorconfig. Write a short CONTRIBUTING.md:
setup, verification commands, Conventional Commits (feat/fix/docs/chore/
data, unenforced), the one-task-one-PR rule, and a pointer to SOUL.md.
Link it from README's Contributing section.
Do not: add commitlint, pre-push hooks, or tests in hooks.
Verify: commit a deliberately misformatted scratch file locally and confirm
the hook fixes it (then drop the scratch file); npm run lint passes.
```

### T0.8 — Scripts contract and phase-0 docs gate

**Tier:** S · **Depends on:** T0.2–T0.7

**Scope:** Consolidate the npm scripts contract that CI and all later tasks
rely on: `dev`, `build`, `preview`, `typecheck`, `lint`, `format:check`,
`test`, `test:coverage`, `test:e2e`, plus `verify` running
typecheck → lint → format:check → test → build. Reconcile README quick-start
and CLAUDE.md commands with reality. This is the phase-0 docs gate.

**Done when:** `npm run verify` passes; README, CONTRIBUTING and CLAUDE.md
list identical, correct commands; `mkdocs build --strict` passes.

```text
Task: finalise Munro's npm scripts contract and sync the docs.
Read: package.json, README.md, CONTRIBUTING.md, CLAUDE.md.
Do: ensure the exact script names dev, build, preview, typecheck, lint,
format:check, test, test:coverage, test:e2e exist, plus a "verify" script
chaining typecheck, lint, format:check, test and build. Make README's
quick-start, CONTRIBUTING's checks section and CLAUDE.md's Commands section
agree with package.json exactly.
Do not: rename existing behaviour, add features, or touch CI (Phase 1 owns
workflows).
Verify: npm run verify passes; mkdocs build --strict passes.
```

---

## Phase 1 — CI/CD

T1.1–T1.3 need the T0.8 script names. T1.4 and T1.5 have no dependencies
and can run any time (even during Phase 0). Action majors verified July
2026: checkout v7, setup-node v6, upload-artifact v7, CodeQL action v4
(v3 is deprecated December 2026), JamesIves deploy v4, rossjrw pr-preview
v1.

### T1.1 — `ci.yml`: checks, build, e2e

**Tier:** M · **Depends on:** T0.8

**Scope:** One workflow, triggers `pull_request` + `push` to `main`.
Default `permissions: contents: read`. Concurrency group per ref,
`cancel-in-progress` except on `main`. Jobs: **checks** (checkout v7 →
setup-node v6 with `node-version-file: .nvmrc` and `cache: npm` → `npm ci`
→ typecheck → lint → format:check → `test:coverage`); **build** in parallel
(`npm ci` → build); **e2e** (`npm ci` → `npx playwright install --with-deps
chromium` → build → `test:e2e` → upload `playwright-report/` via
upload-artifact v7 with `if: ${{ !cancelled() }}`, 14-day retention).

**Done when:** the workflow passes on a PR; a seeded lint error fails the
checks job (verify on a scratch branch, don't merge it).

```text
Task: create Munro's main CI workflow.
Read: the CI/CD rows and the Phase 1 intro of wiki/implementation-plan.md;
package.json scripts.
Do: write .github/workflows/ci.yml exactly as specified in task T1.1 of the
plan: pull_request + push-to-main triggers, contents:read default
permissions, per-ref concurrency cancelling stale non-main runs, a checks
job (typecheck, lint, format:check, test:coverage), a parallel build job,
and an e2e job installing Chromium with --with-deps and uploading the
Playwright report artifact when not cancelled. Pin the action majors listed
in the plan. Use node-version-file .nvmrc with npm caching.
Do not: add deploy or preview steps (T1.2/T1.3 own those); do not cache
node_modules or Playwright browsers.
Verify: actionlint (or careful YAML review) clean; push a scratch branch
and confirm all three jobs pass.
```

### T1.2 — `deploy.yml`: GitHub Pages testing deployment

**Tier:** M · **Depends on:** T0.8

**Scope:** Deploy `main` to the testing site at
`https://welbournesecurity.github.io/Munro/`. Because per-PR previews
(T1.3) require the branch-based Pages source, use
`JamesIves/github-pages-deploy-action@v4` publishing `dist/` to `gh-pages`
with `clean-exclude: pr-preview/` and `force: false`. Triggers: push to
`main` + `workflow_dispatch`. Minimal write permissions; `pages`
concurrency group without cancel-in-progress.

**Done when:** pushing to `main` publishes the site and the URL loads with
correct asset paths; a `pr-preview/` directory on `gh-pages` survives a
main deploy.

```text
Task: create Munro's GitHub Pages deploy workflow.
Read: task T1.2 and gotchas 1–2 in wiki/implementation-plan.md.
Do: write .github/workflows/deploy.yml triggered on push to main and
workflow_dispatch. Build with npm ci + npm run build, then publish dist/ to
the gh-pages branch using JamesIves/github-pages-deploy-action@v4 with
clean-exclude: pr-preview/ and force: false. Set only the permissions the
action needs, and a "pages" concurrency group with cancel-in-progress
false. Add a note in the workflow header comment that repo settings must
set Pages source to "Deploy from branch: gh-pages" (T1.6 checklist).
Do not: use actions/deploy-pages (incompatible with the PR-preview
approach); do not touch vite base config.
Verify: YAML lint clean; after merge, the site loads at the project URL
with /Munro/-prefixed assets.
```

### T1.3 — `pr-preview.yml`: per-PR preview deployments

**Tier:** M · **Depends on:** T1.2

**Scope:** Trigger on `pull_request` `[opened, reopened, synchronize,
closed]`. For non-close events: build with
`--base=/Munro/pr-preview/pr-<N>/`, then `rossjrw/pr-preview-action@v1`
(`source-dir: dist`) which posts a sticky comment with the preview URL and
cleans up on close. Permissions: `contents: write`, `pull-requests: write`.
Guard build steps with `if: github.event.action != 'closed'`. Fork PRs are
skipped by design — document that in a header comment and **never**
introduce `pull_request_target`.

**Done when:** a test PR gets a working preview URL comment; closing it
removes the preview directory.

```text
Task: add per-PR preview deployments for Munro.
Read: task T1.3 and gotcha 2 in wiki/implementation-plan.md.
Do: write .github/workflows/pr-preview.yml triggered on pull_request
opened/reopened/synchronize/closed. On non-close events build the app with
vite build --base=/Munro/pr-preview/pr-${{ github.event.number }}/ and
deploy dist/ with rossjrw/pr-preview-action@v1. Grant contents:write and
pull-requests:write. Guard build steps so the closed event only runs the
action's cleanup. Header comment: fork PRs get no preview deliberately;
pull_request_target is forbidden.
Do not: use pull_request_target or checkout of fork code with secrets; do
not modify deploy.yml.
Verify: open a scratch PR, confirm the sticky preview comment and a working
URL; close it and confirm cleanup.
```

### T1.4 — CodeQL and Dependabot

**Tier:** S · **Depends on:** nothing

**Scope:** `codeql.yml` with `github/codeql-action/init@v4` +
`analyze@v4`, `languages: javascript-typescript`, on push/PR to `main` plus
a weekly schedule, `security-events: write`. `.github/dependabot.yml`
version 2: `npm` weekly with a minor-and-patch group, `github-actions`
weekly.

**Done when:** both files lint clean and the CodeQL run succeeds on `main`.

```text
Task: add CodeQL scanning and Dependabot to Munro.
Read: task T1.4 in wiki/implementation-plan.md.
Do: write .github/workflows/codeql.yml using github/codeql-action v4 (init
+ analyze, languages: javascript-typescript), triggered on push and PR to
main plus a weekly cron, with security-events: write. Write
.github/dependabot.yml (version 2) with weekly npm updates grouping minor
and patch bumps into one PR, and weekly github-actions updates.
Do not: use codeql-action v3 (deprecated Dec 2026); do not add other
ecosystems.
Verify: YAML lint clean; CodeQL workflow completes on the branch.
```

### T1.5 — Docs build in CI

**Tier:** S · **Depends on:** nothing

**Scope:** `docs.yml` running `pip install -r requirements.txt` +
`mkdocs build --strict` on PRs and pushes touching `wiki/**`,
`mkdocs.yml` or `requirements.txt` (plus `workflow_dispatch`). This
enforces the documentation-upkeep rule mechanically.

**Done when:** a PR with a broken wiki link fails the job (verify on a
scratch branch).

```text
Task: add a docs-build check to Munro's CI.
Read: CLAUDE.md's Commands section; task T1.5 in wiki/implementation-plan.md.
Do: write .github/workflows/docs.yml that installs Python deps from
requirements.txt and runs mkdocs build --strict, triggered on pull_request
and push-to-main with path filters for wiki/**, mkdocs.yml and
requirements.txt, plus workflow_dispatch. Pin actions to the majors listed
in the plan; contents: read.
Do not: deploy the docs anywhere; do not touch the app workflows.
Verify: the job passes on the branch; a deliberately broken wiki link on a
scratch branch fails it.
```

### T1.6 — Repository settings checklist

**Tier:** S · **Depends on:** T1.2

**Scope:** A `wiki/operations.md` page (added to nav) documenting the
one-time admin settings: Pages source = "Deploy from branch: gh-pages /
root"; `main` ruleset requiring PRs and the `checks`, `build`, `e2e` and
docs status checks; Actions enabled; Dependabot alerts on. Plus the
recurring operational notes (how deploys and previews work, how to re-run
them).

**Done when:** the page exists in nav, `mkdocs build --strict` passes, and
a maintainer can follow it top-to-bottom.

```text
Task: document Munro's one-time repository settings.
Read: tasks T1.1–T1.5 in wiki/implementation-plan.md and the workflows in
.github/workflows/.
Do: write wiki/operations.md — a concise checklist for a repo admin: set
Pages source to Deploy from branch gh-pages (root), create a ruleset on
main requiring pull requests and the checks/build/e2e/docs status checks,
confirm Actions and Dependabot are enabled. Then a short "how deployments
work" section covering deploy.yml, pr-preview.yml and manual re-runs. Add
the page to mkdocs.yml nav under "Building it".
Do not: change any workflow; keep the tone plain per the wiki style.
Verify: mkdocs build --strict passes.
```

---

## Phase 2 — Data

Runs in parallel with Phase 1. Data accuracy is a core product value
("hillwalkers notice") — the done-when checks here are strict.

### T2.1 — Domain schemas and validation

**Tier:** M · **Depends on:** T0.1 (T0.5 for tests)

**Scope:** In `src/domain/`: the `Peak` and `PeakProgress` types exactly as
`wiki/data.md` defines them (add `dobihId: number` sourced from the DoBIH
`Number` column as the stable key behind `id`), plus a `Backup` envelope
type (`version`, `exportedAt`, `progress: PeakProgress[]`). Zod schemas for
all three (`zod/mini` import path for anything client-bundled). Unit tests
for accept/reject cases.

**Done when:** types + schemas + tests exist; `wiki/data.md` is updated to
note `dobihId` and the backup envelope; no React/MapLibre imports in
`src/domain/`.

```text
Task: implement Munro's domain schemas.
Read: wiki/data.md, the Validation row and gotcha 5 in
wiki/implementation-plan.md, SOUL.md ("data separated from progress").
Do: in src/domain/, define Peak and PeakProgress types exactly per
wiki/data.md plus dobihId (the stable DoBIH hill Number) on Peak, and a
Backup envelope { version, exportedAt, progress }. Write Zod schemas for
all three using the zod/mini import path, and Vitest node-environment tests
covering valid and invalid records (missing fields, wrong types, bad
coordinates). Update wiki/data.md with dobihId and the backup envelope.
Do not: merge peak data and progress into one record; import React or
maplibre-gl anywhere in src/domain/.
Verify: npm run typecheck, npm run test, mkdocs build --strict.
```

### T2.2 — Wainwrights dataset

**Tier:** M · **Depends on:** T2.1

**Scope:** `scripts/build-peak-data`: download the DoBIH CSV
(`https://www.hill-bagging.co.uk/dobih-downloads/hillcsv.zip`), filter rows
where flag column `W = 1` (must yield **exactly 214**), map to the `Peak`
schema (`Number`→`dobihId`, `Name`, `Metres`/`Feet`, WGS84
`Latitude`/`Longitude` as-is, 6-figure `Grid ref`, `Area` → region
grouping, `list: ["wainwrights"]`), validate every record with the Zod
schema, and write `src/data/wainwrights.json` with a metadata header:
`source: "Database of British and Irish Hills v18.4"`, licence CC BY 4.0,
link `https://www.hill-bagging.co.uk/dobih`, and a change note ("trimmed
and reformatted from DoBIH v18.4" — CC BY requires indicating changes).
The generated JSON is **committed**; the script is rerun manually for DoBIH
updates, never in CI.

**Done when:** the JSON contains exactly 214 validated peaks; spot-checks
pass (Skiddaw = dobihId 2319, 931 m; Scafell Pike is the highest;
Castle Crag is the lowest); the script is idempotent and documented in the
README of `scripts/`.

```text
Task: build Munro's Wainwrights dataset.
Read: wiki/data.md, src/domain schemas, task T2.2 and gotcha 5 in
wiki/implementation-plan.md.
Do: write scripts/build-peak-data (TypeScript, runnable via a package
script) that downloads the DoBIH CSV zip from
https://www.hill-bagging.co.uk/dobih-downloads/hillcsv.zip, filters rows
with the W flag = 1, asserts the count is exactly 214 and fails otherwise,
maps fields to the Peak schema (Number→dobihId; use DoBIH's WGS84
Latitude/Longitude directly — no conversion; keep the 6-figure grid ref as
display text; derive region from Area), validates every record with the
Zod schema, and writes pretty-printed src/data/wainwrights.json with the
metadata header specified in T2.2 (source version, CC BY 4.0, link, change
note). Commit the generated JSON. Document the script and refresh procedure
in scripts/README.md.
Do not: run the script in CI; scrape any other source; round or transform
coordinates.
Verify: script runs clean twice with identical output; count is 214;
Skiddaw has dobihId 2319 and height 931m rounded; npm run test passes.
```

### T2.3 — Lake District boundary

**Tier:** S · **Depends on:** nothing (validation wiring lands with T2.4)

**Scope:** `scripts/fetch-boundary` pulling the Lake District polygon from
Natural England's National Parks (England) ArcGIS endpoint with server-side
simplification (`outSR=4326`, `geometryPrecision=5`,
`maxAllowableOffset=0.0005` — ~15 KB, 741 vertices verified), written to
`src/data/boundaries/lake-district.geojson` with OGL v3 attribution
metadata ("© Natural England copyright. Contains Ordnance Survey data ©
Crown copyright and database right 2026."). Committed output, manual rerun.

**Done when:** the GeoJSON is a single WGS84 polygon named Lake District,
< 50 KB, with attribution metadata embedded.

```text
Task: fetch the Lake District National Park boundary for Munro.
Read: task T2.3 and gotcha 6 in wiki/implementation-plan.md; wiki/data.md.
Do: write scripts/fetch-boundary that queries the Natural England National
Parks (England) FeatureServer for the LAKE DISTRICT polygon with outSR=4326,
geometryPrecision=5 and maxAllowableOffset=0.0005, and writes
src/data/boundaries/lake-district.geojson including a properties block with
the OGL v3 attribution string from the plan. Commit the output. Document
the refresh procedure alongside T2.2's notes in scripts/README.md.
Do not: commit the full-resolution (1.3 MB) polygon; add other parks.
Verify: file is valid GeoJSON, single polygon, under 50 KB; coordinates are
lon/lat in WGS84 (Lake District ≈ -3.1, 54.5).
```

### T2.4 — Data validation in CI

**Tier:** S · **Depends on:** T2.1, T2.2, T2.3, T0.5

**Scope:** A Vitest suite (node environment) that loads the committed
`wainwrights.json` and boundary file and asserts: schema validity of every
record, exactly 214 peaks, unique `dobihId`/`id`, all coordinates within a
Lake District bounding box, heights within sane bounds (290–980 m), and
boundary polygon validity. Runs as part of `npm run test`, so `ci.yml`
already enforces it.

**Done when:** suite passes; corrupting a record locally fails it.

```text
Task: add CI validation for Munro's committed data files.
Read: src/domain schemas, src/data/wainwrights.json,
src/data/boundaries/lake-district.geojson, task T2.4 in
wiki/implementation-plan.md.
Do: write a Vitest node-environment suite (src/domain or tests/data) that
parses both committed data files and asserts: every peak passes the Zod
schema; count === 214; ids and dobihIds unique; every lat/lon inside a Lake
District bounding box; heights between 290 and 980 metres; the boundary is
a valid single WGS84 polygon. Make failures name the offending record.
Do not: fetch anything over the network in tests; weaken schemas to make
data pass — if data is wrong, report it.
Verify: npm run test passes; temporarily corrupt one record locally and
confirm a named failure (revert before committing).
```

### T2.5 — Attribution constants and licensing docs

**Tier:** S · **Depends on:** T2.2, T2.3

**Scope:** `src/data/attribution.ts` exporting the exact strings every
surface must show: DoBIH ("Hill data: Database of British and Irish Hills
v18.4, CC BY 4.0" + link), boundary (OGL v3 string), basemap ("OpenFreeMap
© OpenMapTiles, Data from OpenStreetMap"), terrain (Mapzen/Terrain Tiles
sources). Update `wiki/data.md` with a definitive "Licensing and
attribution" section listing where each string must appear (map attribution
control, Data page, exported images, README).

**Done when:** constants module exists with tests importing it;
`wiki/data.md` section is complete; README's acknowledgment section links
to the new hill-bagging.co.uk URL (the old domain redirects).

```text
Task: centralise Munro's attribution strings and licensing docs.
Read: tasks T2.2/T2.3/T2.5 and gotchas 3/5/6 in wiki/implementation-plan.md;
wiki/data.md; README.md's acknowledgment section.
Do: create src/data/attribution.ts exporting named constants for DoBIH
(version-stamped, CC BY 4.0, linking https://www.hill-bagging.co.uk/dobih),
the Natural England OGL v3 boundary string, OpenFreeMap/OpenMapTiles/OSM
basemap attribution, and terrain-tile sources. Rewrite wiki/data.md's
licensing content as a "Licensing and attribution" section stating exactly
where each string appears: the map attribution control, the Data page,
exported images and the README. Update README's acknowledgment link to
hill-bagging.co.uk.
Do not: paraphrase licence names or drop version numbers.
Verify: npm run typecheck; mkdocs build --strict.
```

---

## Phase 3 — Core tracker

The heart of the product. T3.2/T3.3/T3.4 are the visual soul of Munro —
they carry the L tier. T3.5–T3.7 can proceed in parallel on the M tier.

### T3.1 — Progress store

**Tier:** M · **Depends on:** T2.1

**Scope:** Zustand 5 store with `persist` to localStorage under a
versioned key (`munro.progress.v1`), `version` + `migrate` configured from
day one. State: `PeakProgress[]` keyed by peak id. Actions: `bag(peakId,
date?)`, `unbag(peakId)`, `setNotes`, `importProgress(backup)` (Zod-
validated, atomic — all-or-nothing), `exportProgress(): Backup`,
`resetAll`. Selector helpers for map/list/stats consumers. A second small
preferences store (`munro.prefs.v1`) for visual toggles. Full unit tests
including rehydration from a stored JSON fixture and rejection of a
corrupt one.

**Done when:** tests cover every action, persistence round-trip and
migration hook; no component code included.

```text
Task: implement Munro's progress store.
Read: wiki/data.md, src/domain schemas, SOUL.md ("the user owns their
record"), task T3.1 in wiki/implementation-plan.md.
Do: create src/store/progress.ts — a Zustand 5 store persisted to
localStorage key munro.progress.v1 with persist version and a migrate stub.
State is the user's PeakProgress records. Implement bag/unbag/setNotes/
resetAll, exportProgress returning a Backup envelope, and importProgress
that Zod-validates the whole payload and applies it atomically or not at
all. Add selector helpers (isBagged, baggedCount, byPeakId). Create a
small separate preferences store munro.prefs.v1. Write thorough Vitest
tests: every action, a persistence round-trip against a JSON fixture,
rejection of corrupt imports, and the migrate path.
Do not: store any Peak source data in the store; add UI; use IndexedDB.
Verify: npm run test with coverage thresholds passing; npm run typecheck.
```

### T3.2 — Map foundation and the Munro dark style

**Tier:** L · **Depends on:** T0.1, T0.3 (uses T2.3's boundary)

**Scope:** The single `MapView` wrapper around `@vis.gl/react-maplibre`,
and `src/map/style/munro-dark.json` — a fork of OpenFreeMap's Dark style
(key-free vector tiles) reworked to `wiki/design.md`: charcoal ground, grey
water/roads dialled far back, subtle labels, national-park-appropriate
restraint. Render the Lake District boundary as a thin grey line layer.
Map options include `preserveDrawingBuffer: true` (export depends on it)
and sensible bounds/zoom defaults framing the Lake District. Attribution
control wired to the constants from T2.5. Tile-source URL isolated in one
config module so the fallback (self-hosted PMTiles) is a one-line swap.

**Done when:** the map renders the Lake District in the Munro aesthetic on
desktop and mobile sizes; boundary visible; attribution shows; style JSON
committed; a short `src/map/README.md` documents the style fork and how to
regenerate/edit it (e.g. in Maputnik).

```text
Task: build Munro's map foundation and dark style. This is the product's
visual soul — read SOUL.md and wiki/design.md first and take them
literally.
Read: SOUL.md, wiki/design.md, wiki/features.md (Map view), tasks T3.2 and
gotcha 3, the Basemap/Terrain rows in wiki/implementation-plan.md.
Do: create src/map/MapView (the ONLY module importing maplibre-gl, via
@vis.gl/react-maplibre) rendering OpenFreeMap vector tiles with a committed
fork of their Dark style at src/map/style/munro-dark.json, restyled to the
design tokens: dark charcoal ground, muted grey detail, small technical
labels, nothing bright. Frame the Lake District with sane default
bounds/min/max zoom. Add the lake-district boundary GeoJSON as a thin grey
line layer. Set preserveDrawingBuffer: true. Wire the attribution control
to src/data/attribution.ts constants. Put the tile URL in one config module
with a comment naming the PMTiles fallback. Write src/map/README.md
documenting the style fork and edit workflow. Unit-test any pure helpers;
mock maplibre-gl for a mount smoke test.
Do not: add peak markers, terrain or interactions (T3.3/T3.4); introduce
any API key; let any other module import maplibre-gl.
Verify: npm run verify; visually check dev server at desktop and 375px
widths against wiki/design.md.
```

### T3.3 — Terrain: hillshade and contours

**Tier:** L · **Depends on:** T3.2

**Scope:** Add AWS Terrain Tiles (Terrarium, public S3, key-free) as a
`raster-dem` source with a subtle dark hillshade layer, and
`maplibre-contour` generating grey contour lines client-side from the same
DEM at appropriate zooms. Contours are the topographic signature of the
design — they must read as texture, not noise. Update terrain attribution.

**Done when:** hillshade and contours render in the dark aesthetic without
overwhelming labels or (future) markers; performance stays smooth on a
mid-range phone viewport; toggling terrain off via the preferences store
works.

```text
Task: add terrain shading and contour lines to Munro's map.
Read: wiki/design.md, wiki/features.md (Map view), task T3.3 and the
Terrain row in wiki/implementation-plan.md; src/map/README.md.
Do: extend the map style/config with the AWS Terrarium terrain tiles
(https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png)
as a raster-dem source: a subtle hillshade layer tuned for the dark
charcoal ground, plus maplibre-contour producing thin grey contour lines
with zoom-appropriate intervals. Wire a terrain on/off preference from the
preferences store. Add the terrain-source attribution constant to the
attribution control. Keep all changes inside src/map/.
Do not: add 3D terrain/pitch effects (design.md forbids heavy 3D); use any
keyed tile service.
Verify: npm run verify; visually confirm contours read as subtle texture at
zooms 9–14 in both desktop and mobile widths.
```

### T3.4 — Peak markers and the bag/unbag interaction

**Tier:** L · **Depends on:** T3.2, T3.1, T2.2

**Scope:** The emotional core: all 214 Wainwrights as map markers — muted
grey unbagged, soft green bagged — driven by a pure
`peaksToGeoJSON(peaks, progress)` builder in `src/domain/`. Symbol layer
with peak-name labels at appropriate zooms; click/tap selects a peak and
opens a minimal detail card (name, height m/ft, grid ref, region) with a
bag/unbag action that updates the store and recolours the marker
immediately (use feature-state, not source rebuilds, for the state flip).
Hover states on desktop; generous tap targets (44px+) on mobile. A single
restrained transition on the grey→green change is allowed; nothing
confetti-like.

**Done when:** all 214 markers render accurately positioned; bag/unbag
round-trips through the store and persists across reload; pure builders
fully unit-tested; wrapper tested with a mocked maplibre-gl; interaction
verified manually on mobile width.

```text
Task: implement Munro's peak markers and the bag/unbag interaction — the
core moment of the product.
Read: SOUL.md, wiki/features.md (Peak tracking), wiki/design.md, task T3.4
and gotcha 4 in wiki/implementation-plan.md.
Do: write a pure peaksToGeoJSON(peaks, progress) builder plus marker-styling
helpers in src/domain/ with exhaustive unit tests. In src/map/, add the
peaks source and symbol/circle layers: muted grey unbagged, soft pastel
green bagged (design tokens), name labels appearing at sensible zooms, and
feature-state driven recolouring so bagging never rebuilds the source.
Click/tap opens a minimal peak card (name, heights, grid ref, region) with
a bag/unbag button wired to the progress store; add date-bagged capture as
an optional field. Desktop hover states; 44px+ touch targets. One subtle
transition on state change, nothing more.
Do not: cluster markers; add photos, notes UI (T4.4) or filters (T3.5);
import maplibre-gl outside src/map/.
Verify: npm run verify; manually bag/unbag on desktop and 375px widths and
reload to confirm persistence.
```

### T3.5 — Peak list panel and filters

**Tier:** M · **Depends on:** T3.1, T2.2, T0.3

**Scope:** The tracker's list panel: all peaks sorted by name or height,
grouped by region (`Area`-derived), showing bagged state; filter controls
for all/bagged/unbagged and a text search; selecting a list item focuses
the corresponding map marker (communicate via a shared selection store or
callback — no MapLibre import). Filter logic lives in `src/domain/` as
pure functions with full tests. Responsive: side panel on desktop, bottom
sheet or toggled view on mobile.

**Done when:** filters, search and sort are pure-tested; list and map stay
in sync on selection; usable at 375px width.

```text
Task: build Munro's peak list panel with filters.
Read: wiki/features.md (Progress dashboard, filters), wiki/mvp.md user
stories 1 and 6, wiki/design.md, task T3.5 in wiki/implementation-plan.md.
Do: implement pure filter/sort/search/grouping functions over Peak +
PeakProgress in src/domain/ with full unit tests (filter all/bagged/
unbagged, name search, sort by name/height, group by region). Build the
list panel component: grouped rows with name, height and a subtle bagged
indicator; filter and search controls; selection that raises the selected
peak id through the shared selection state so the map can focus it.
Desktop: side panel. Mobile: collapsible bottom section. Style strictly
with the design tokens.
Do not: import maplibre-gl; duplicate progress state; add pagination or
virtualisation (214 rows doesn't need it).
Verify: npm run verify; check 375px layout.
```

### T3.6 — Progress statistics

**Tier:** M · **Depends on:** T3.1, T2.2

**Scope:** Pure stats functions (`total`, `bagged`, `remaining`, percentage,
recent bags when dates exist) in `src/domain/` plus a restrained stats
component for the tracker (and reusable on Home): count, percentage, a
thin monochrome progress bar with the green fill. No charts, no dashboard
bloat.

**Done when:** stats functions fully tested including empty/complete edge
cases; component renders in tracker; percentage rounds sensibly (no
"37.383%").

```text
Task: implement Munro's progress statistics.
Read: wiki/features.md (Progress dashboard), wiki/design.md ("no bloated
dashboards"), task T3.6 in wiki/implementation-plan.md.
Do: add pure stats functions over Peak + PeakProgress in src/domain/
(total, bagged, remaining, integer percentage, recent-first bagged list
when dates exist) with unit tests covering 0, partial and 214/214 states.
Build one small stats component: "37 / 214 bagged · 17%" and a thin grey
progress bar with soft green fill, styled with design tokens, reusable on
the Home page later.
Do not: add charts, streaks, badges or animations beyond a subtle bar
transition.
Verify: npm run verify.
```

### T3.7 — App shell, routing and responsive layout

**Tier:** M · **Depends on:** T0.3

**Scope:** The four-page shell with **hash routing** (`#/`, `#/tracker`,
`#/data`, `#/settings`) — hash mode sidesteps GitHub Pages 404s under both
the project base and PR-preview subpaths. Minimal header (wordmark, nav),
mobile navigation, page stubs for the four pages, and the tracker layout
grid (map canvas + list panel + stats) that T3.x components slot into.

**Done when:** all routes work under `vite preview` with the `/Munro/`
base; deep links and refresh work; layout holds at 375px, 768px, 1280px;
keyboard navigable.

```text
Task: build Munro's app shell, routing and responsive layout.
Read: wiki/mvp.md (MVP pages), wiki/design.md, wiki/platforms.md, task T3.7
and gotcha 1 in wiki/implementation-plan.md.
Do: implement hash-based routing for #/, #/tracker, #/data and #/settings
(react-router createHashRouter or an equally simple hand-rolled hash
router — pick the least code). Build the shell: minimal header with the
Munro wordmark and nav, dark theme throughout, mobile nav pattern, and
page stubs. Lay out the tracker page grid — map area, list panel slot,
stats slot — responsive from 375px up. Ensure focus states and keyboard
navigation.
Do not: add a BrowserRouter or 404.html hack; add page content beyond
stubs (Phase 4 owns pages).
Verify: npm run build && npm run preview — every route loads and refreshes
correctly under the /Munro/ base; check 375/768/1280 widths.
```

---

## Phase 4 — Pages and flows

### T4.1 — Home page

**Tier:** M · **Depends on:** T3.7, T3.6

**Scope:** Per `wiki/mvp.md`: explain what Munro is (borrow the README's
calm copy), show quick stats from the store when progress exists, one clear
CTA into the tracker. Restraint applies — this is a front door, not a
landing-page funnel.

**Done when:** renders with and without existing progress; CTA routes to
tracker; reads plainly.

```text
Task: build Munro's Home page.
Read: wiki/mvp.md (Home), README.md's opening copy, SOUL.md, wiki/design.md.
Do: implement the Home page: a short plain-language explanation of Munro,
the reusable stats component showing live progress when any exists (hidden
or replaced with a gentle "start bagging" line when empty), and one CTA
button to #/tracker. Dark, minimal, no imagery beyond subtle topographic
texture if already available from the design tokens.
Do not: add testimonials, feature grids, animations or marketing tone.
Verify: npm run verify; view with empty and non-empty progress stores.
```

### T4.2 — Settings: backup, restore, reset, preferences

**Tier:** M · **Depends on:** T3.1, T2.1, T3.7

**Scope:** The user-owns-their-record page: export progress as a
downloaded JSON backup (the `Backup` envelope), import with Zod validation
and a clear preview/confirm step (show count found, then apply
atomically), reset-all behind an explicit typed confirmation, and the
visual preference toggles (e.g. terrain). Import failures explain
themselves plainly.

**Done when:** export → wipe → import round-trip restores identical state
(unit + e2e later); malformed files rejected with a human message; reset
requires deliberate confirmation.

```text
Task: build Munro's Settings page — backup, restore, reset, preferences.
Read: SOUL.md ("the user owns their record", "no dark patterns"),
wiki/mvp.md (Settings), wiki/features.md (Local-first storage), src/store
and src/domain Backup schema.
Do: implement Settings: an Export progress button downloading the Backup
envelope as munro-backup-<date>.json via the store's exportProgress; an
Import flow that reads a chosen file, validates with the Zod Backup schema,
previews what was found ("214 records, 37 bagged"), and applies atomically
on confirm; a Reset local progress action requiring an explicit typed
confirmation; and preference toggles wired to the preferences store. All
error messages plain and specific.
Do not: add accounts, cloud anything, or nagging; silently merge imports.
Verify: npm run verify; manual round-trip export → reset → import restores
the exact state.
```

### T4.3 — Data & Lists page

**Tier:** S · **Depends on:** T3.7, T2.5

**Scope:** Per `wiki/mvp.md`: the supported list (Wainwrights, 214, Lake
District) with a note that more lists follow; data sources and limitations
(peaks are summit points, not boundaries); the full attribution block from
`src/data/attribution.ts` rendered visibly.

**Done when:** page renders every attribution constant; copy matches
`wiki/data.md`.

```text
Task: build Munro's Data & Lists page.
Read: wiki/mvp.md (Data / Lists), wiki/data.md, src/data/attribution.ts.
Do: implement the Data page: the currently supported hill list
(Wainwrights — 214 fells, Lake District) with a calm note that further
lists (Munros, Corbetts, …) are planned; a "Data sources and limitations"
section explaining peaks are treated as summit points and naming DoBIH and
Natural England; and the complete attribution block rendered from the
constants in src/data/attribution.ts — never hand-retyped strings.
Do not: promise dates; editorialise; duplicate attribution text manually.
Verify: npm run verify; every exported attribution constant appears on the
rendered page.
```

### T4.4 — Peak detail: dates and notes

**Tier:** M · **Depends on:** T3.4, T3.1

**Scope:** Extend the T3.4 peak card with the optional fields: date bagged
(defaults to today when bagging, editable, clearable) and free-text notes,
both persisting via the store. List panel rows show a subtle date where
present.

**Done when:** dates and notes persist across reloads; clearing works;
card stays minimal.

```text
Task: add bagged dates and notes to Munro's peak detail card.
Read: wiki/features.md (Peak tracking — optional fields), the T3.4 card
implementation, src/store/progress.ts.
Do: extend the peak detail card: when bagging, default the bagged date to
today with an editable date input (clearable); add an optional notes
textarea persisting through the store's setNotes. Show the date subtly in
the card and list rows where present. Keep the card small — two optional
fields, no journal UI.
Do not: make date or notes required; add photos or rich text.
Verify: npm run verify; set date and notes, reload, confirm persistence;
clear both, confirm removal.
```

---

## Phase 5 — Export image

The technically riskiest feature (WebGL capture) and a headline user story.
Sequenced L → L → M.

### T5.1 — Map snapshot capture

**Tier:** L · **Depends on:** T3.2–T3.4

**Scope:** `src/export/snapshot.ts`: capture the MapLibre canvas reliably —
wait for the `idle` event, read `map.getCanvas()` (`preserveDrawingBuffer`
already on from T3.2), return an ImageBitmap/blob plus the pixel ratio
metadata compositing needs. Handle device-pixel-ratio ≥2 and a
fit-to-boundary framing helper so exports frame the Lake District
consistently regardless of the user's current viewport.

**Done when:** repeated captures are deterministic and non-blank at DPR 1
and 2; framing helper centres the park; capture path covered by an e2e
assertion (non-blank pixels) since jsdom can't test it.

```text
Task: implement reliable map snapshot capture for Munro's export feature.
Read: task T5.1 and gotcha 3 in wiki/implementation-plan.md; src/map/
MapView.
Do: create src/export/snapshot.ts: a captureMap(map) that waits for the
map idle event, reads the WebGL canvas (preserveDrawingBuffer is already
set) and resolves to a bitmap/blob with dimensions and devicePixelRatio
metadata; plus a frameBoundary helper that temporarily fits the Lake
District boundary bounds (with padding) before capture and restores the
user's viewport after. Handle DPR 2 without blur or clipping. Add a
Playwright spec asserting a capture produces a non-blank image (sample
pixel variance) — this cannot be jsdom-tested.
Do not: use DOM screenshot libraries; leave the user's viewport moved
after export; capture before tiles finish loading.
Verify: npm run verify && npm run test:e2e; manual capture at DPR 1 and 2
is sharp and complete.
```

### T5.2 — Export composition

**Tier:** L · **Depends on:** T5.1, T2.5, T3.6

**Scope:** `src/export/compose.ts`: an offscreen 2D-canvas composition —
the research-recommended approach — producing the shareable image: map
snapshot, title ("Lake District · Wainwrights"), progress line ("37 / 214
bagged"), export date, small Munro wordmark, and the **attribution line
drawn into the image** (canvas capture excludes the DOM control; DoBIH +
OSM/OpenFreeMap + OGL credits are licence obligations on the produced
work). Output sized for sharing (e.g. 1600×2000 portrait and 1920×1080
landscape presets). Pure layout math split out and unit-tested; pixel
output verified in e2e.

**Done when:** compositions at both presets look polished (dark, technical,
premium per `wiki/design.md`); attribution legible; layout math
unit-tested.

```text
Task: implement Munro's export image composition.
Read: wiki/features.md (Export image), wiki/design.md, task T5.2 and
gotcha 3 in wiki/implementation-plan.md; src/data/attribution.ts.
Do: create src/export/compose.ts rendering the final shareable image on an
offscreen 2D canvas: the map snapshot from T5.1, a title like "Lake
District · Wainwrights", the progress line from the stats helpers, the
export date, a small restrained Munro wordmark, and a legible attribution
line composed from src/data/attribution.ts (DoBIH, OpenFreeMap/OSM, OGL) —
drawn into the pixels, not overlaid in DOM. Two presets: portrait
1600×2000 and landscape 1920×1080. Extract layout arithmetic (margins,
type scale, text wrapping) into pure functions with unit tests. Match the
design tokens exactly: charcoal ground, grey text, green accent only for
bagged count.
Do not: screenshot DOM UI; omit or shrink attribution to illegibility; add
decorative flourishes.
Verify: npm run verify; generate both presets manually and compare against
wiki/design.md; run the e2e capture spec.
```

### T5.3 — Export UI

**Tier:** M · **Depends on:** T5.2, T3.7

**Scope:** The tracker's "Export image" action: a minimal dialog with
preset choice and preview, a Download PNG button
(`munro-wainwrights-<date>.png`), Web Share API on supporting mobile
browsers with download fallback, busy state during composition, plain
failure message.

**Done when:** export works from the tracker on desktop and mobile widths;
filename correct; e2e asserts a download is produced.

```text
Task: build Munro's export dialog and download flow.
Read: wiki/mvp.md user story 4, wiki/design.md, src/export/ modules from
T5.1/T5.2.
Do: add an "Export image" button to the tracker opening a minimal dialog:
portrait/landscape preset choice, a preview of the composed image, and
Download PNG saving as munro-wainwrights-<yyyy-mm-dd>.png. Use the Web
Share API where available on mobile with graceful fallback to download.
Show a quiet busy state while composing and a plain error message on
failure. Extend the e2e core-flow spec to assert the download event fires
and the file is non-empty.
Do not: add social-network share buttons, watermark upsells or extra
themes (roadmap items).
Verify: npm run verify && npm run test:e2e; manual export on desktop and a
mobile-width viewport.
```

---

## Phase 6 — Quality and polish

### T6.1 — The real e2e suite

**Tier:** M · **Depends on:** T3.x, T4.x, T5.3, T0.6

**Scope:** Replace the smoke placeholder with the researched three-plus
specs: **smoke** (loads, map canvas present, Wainwrights visible, zero
console errors); **core flow** (open peak → bag → stats update → export
produces a file); **persistence** (bag → assert
`localStorage['munro.progress.v1']` → `page.reload()` → still bagged —
distinguishing UI, save and rehydration bugs); **backup round-trip**
(export file → reset → import → state restored). Use `storageState`/seeded
localStorage to avoid click-through setup where sensible (seed after first
navigation to dodge the known init-script race).

**Done when:** suite green locally and in `ci.yml`'s e2e job; each spec
fails when its feature is deliberately broken (spot-check one locally).

```text
Task: build Munro's real end-to-end suite.
Read: task T6.1 in wiki/implementation-plan.md; tests/e2e/; the store keys
in src/store/.
Do: implement Playwright specs — smoke: app loads, map canvas rendered,
peak markers present, no console errors; core flow: select a peak, bag it,
stats line updates, export dialog downloads a non-empty PNG; persistence:
bag a peak, assert the munro.progress.v1 localStorage payload, reload,
assert still bagged in UI and storage; backup: export JSON, reset, import
the file, assert identical state. Seed progress via localStorage after
initial navigation (avoid the init-script race) where click-through setup
would be slow.
Do not: add visual-regression tooling or extra browsers; test map pixel
colours beyond presence/variance.
Verify: npm run build && npm run test:e2e green; confirm the persistence
spec fails if you temporarily break the persist key locally (revert).
```

### T6.2 — Accessibility pass

**Tier:** M · **Depends on:** T4.x

**Scope:** Systematic pass over every page and the tracker interactions:
keyboard operability end-to-end (including bagging via the list panel as
the accessible alternative to map clicks), focus management in dialogs,
ARIA labelling, colour-contrast checks on the grey/green palette (the
muted aesthetic must still meet WCAG AA for text and interactive
elements — adjust token values, not the aesthetic), reduced-motion
respect. jsx-a11y is already linting; this task covers what static rules
can't.

**Done when:** a documented keyboard-only walkthrough of every user story
in `wiki/mvp.md` succeeds; contrast measured and recorded; issues fixed or
ticketed.

```text
Task: run and fix Munro's accessibility pass.
Read: wiki/mvp.md user stories, wiki/design.md, all pages under src/app/.
Do: verify keyboard-only completion of every MVP user story (bagging must
be achievable from the list panel without the map); fix focus traps and
ordering in dialogs (export, import confirm, reset); label controls and
landmarks; measure text and control contrast for the charcoal/grey/green
tokens against WCAG AA and adjust token values where they fall short
(keep the restrained look — darken/lighten, don't recolour); honour
prefers-reduced-motion for the marker transition and progress bar. Record
the walkthrough and contrast results in the PR description.
Do not: bolt on an accessibility overlay; brighten the palette beyond what
AA requires.
Verify: npm run verify; keyboard walkthrough of all six user stories.
```

### T6.3 — Mobile polish

**Tier:** L · **Depends on:** T4.x, T5.3

**Scope:** `wiki/platforms.md` demands the tracker, bag/unbag and export
feel great on a phone. Audit and fix: map gesture handling vs page
scrolling, bottom-sheet ergonomics, tap-target sizes, safe-area insets,
the export dialog on small screens, font sizes for outdoor readability.
Test on real device-emulation profiles (iPhone SE/13, mid-range Android).

**Done when:** every user story is comfortable one-handed at 375px; no
horizontal scroll anywhere; export preview fits small screens.

```text
Task: polish Munro's mobile experience.
Read: wiki/platforms.md, wiki/design.md, wiki/mvp.md success criteria.
Do: audit and fix the phone experience across the whole app: map pan/zoom
gestures must not fight page scroll; the list panel bottom-sheet must be
reachable and dismissible one-handed; all tap targets ≥44px; safe-area
insets respected; export dialog and preview usable at 375×667; typography
legible outdoors (no sub-12px text). Use Playwright device profiles
(iPhone SE, iPhone 13, Pixel-class) for verification and add a mobile
project to the e2e config for the smoke and core-flow specs.
Do not: fork into a separate mobile layout system; add a PWA manifest
(explicit non-goal for MVP).
Verify: npm run verify && npm run test:e2e including the new mobile
project; manual emulation pass of all six user stories.
```

### T6.4 — Performance budget

**Tier:** M · **Depends on:** all feature tasks

**Scope:** `wiki/mvp.md` says "the map loads quickly". Measure and record:
production bundle sizes (maplibre-gl ~230 KB gzip is accepted — the map is
the product; everything else should be small), Lighthouse performance on
the deployed Pages site, time-to-interactive-map on a throttled connection.
Fix cheap wins (code-split the export module, preconnect tile hosts, font
strategy); record the budget in `wiki/operations.md` so regressions are
visible.

**Done when:** budgets documented with measured numbers; export code split
out of the initial bundle; no dependency added to "optimise" anything.

```text
Task: measure and tune Munro's performance, then document the budget.
Read: wiki/mvp.md success criteria; vite.config.ts; wiki/operations.md.
Do: build for production and record gzip sizes per chunk; run Lighthouse
against a local preview and the deployed Pages URL; measure time to
first map render on a Fast-3G throttled profile. Apply only cheap wins:
dynamic-import the export composition module, preconnect to the tile and
terrain hosts, ensure fonts don't block render. Write the resulting
numbers and thresholds into a "Performance budget" section of
wiki/operations.md so future PRs can be checked against them.
Do not: add bundler plugins, service workers or dependency swaps; chase
scores at the cost of the map experience.
Verify: npm run verify; recorded numbers in wiki/operations.md; mkdocs
build --strict.
```

---

## Phase 7 — Docs and acceptance

### T7.1 — Full documentation reconciliation

**Tier:** M · **Depends on:** everything · **Blocked by human decision 1
(licence) for the README licence section**

**Scope:** The final docs gate. Reconcile the whole written surface with
the shipped reality: README (installation/usage for the app, screenshots
for the Visuals section, licence, live testing-site link), `wiki/`
(tech-stack.md becomes "the stack" not "suggested stack"; data.md,
platforms.md, mvp.md status updates; index touched), `CLAUDE.md` (real
commands, "planning stage" language removed, conventions section reflecting
`src/domain` purity and the single-MapView rule), CONTRIBUTING.md.

**Done when:** no doc claims the project is planning-stage; every command
in every doc runs; `mkdocs build --strict` passes; a fresh reader can go
from clone to running app using README alone.

```text
Task: reconcile all of Munro's documentation with the shipped MVP.
Read: every root doc (README.md, CLAUDE.md, SOUL.md, CONTRIBUTING.md) and
every wiki/ page, then the actual codebase and package.json.
Do: update README (real install/run/test instructions, a screenshot in
Visuals, the live GitHub Pages link, the decided licence, current project
status); update wiki/tech-stack.md to describe the actual stack with
verified versions; refresh wiki/data.md, wiki/platforms.md, wiki/mvp.md
and wiki/index.md statuses; rewrite CLAUDE.md's "Repository state" and
Commands sections to match reality and add the architectural conventions
that now exist in code (domain purity, single MapView, attribution
constants). Every command you document must be run by you first.
Do not: change any product behaviour; soften SOUL.md; leave any
"planning stage" claims anywhere.
Verify: mkdocs build --strict; execute every documented command; npm run
verify.
```

### T7.2 — MVP acceptance review

**Tier:** L · **Depends on:** T7.1

**Scope:** An adversarial final review against `wiki/mvp.md` success
criteria and `SOUL.md`, on the deployed Pages site: map loads quickly;
peaks accurately positioned (spot-check 10 against DoBIH); bagged state
reliable; persistence across refresh; exports polished; mobile and desktop
excellent; codebase clean and extensible — including the acid test:
**write (don't merge) a throwaway branch adding a second hill list as
data-only change** to prove the extension promise. Produce a findings
report; file issues for anything failing.

**Done when:** every success criterion has a pass/fail with evidence; the
data-only-list test succeeds or its blockers are filed; the report is
committed as `wiki/mvp-acceptance.md` (added to nav) or attached to a
tracking issue.

```text
Task: run Munro's MVP acceptance review. Be adversarial — you are trying
to find reasons the MVP is not done.
Read: wiki/mvp.md (success criteria and user stories), SOUL.md,
wiki/design.md; then use the deployed GitHub Pages site, not localhost.
Do: verify each success criterion with evidence: initial map load time on
a throttled profile; positions of ten random peaks cross-checked against
DoBIH values in src/data/wainwrights.json; bag/unbag reliability including
rapid toggling; persistence across refresh and browser restart; export
image quality at both presets against wiki/design.md; the full six user
stories on desktop and a phone profile. Then the extensibility acid test:
on a throwaway branch, attempt to add a second hill list (e.g. Wainwright
Outlying Fells, WO flag) as a pure data change — record every place code
had to change; do not merge it. Write pass/fail findings with evidence
into wiki/mvp-acceptance.md, add it to mkdocs nav, and file issues for
failures.
Do not: fix anything in this task — report only; merge the acid-test
branch.
Verify: mkdocs build --strict; every criterion has an explicit verdict.
```

---

## Wave schedule

A ready-made parallel ordering (an orchestrator may recompute from the
dependency fields; this one is safe). Each wave's tasks can run
concurrently in separate worktrees.

| Wave | Tasks | Notes |
| --- | --- | --- |
| A | T0.1 · T1.4 · T1.5 · T2.3 | T0.1 is the critical path; the other three don't touch the app |
| B | T0.2 · T0.3 · T0.4 · T0.5 · T0.6 | all fan out from T0.1 |
| C | T0.7 · T2.1 · T3.7 | T2.1's tests need T0.5's Vitest setup merged |
| D | T0.8 · T2.2 · T3.1 · T3.2 | T0.8 closes Phase 0; map work starts |
| E | T1.1 · T1.2 · T2.4 · T2.5 · T3.3 · T3.4 · T3.5 · T3.6 | CI live from here; the core tracker converges |
| F | T1.3 · T1.6 · T4.1 · T4.2 · T4.3 · T4.4 · T5.1 | previews, pages, export capture |
| G | T5.2 · T6.2 | composition; a11y can start |
| H | T5.3 | export UI ships the last feature |
| I | T6.1 · T6.3 · T6.4 | real e2e, mobile polish, perf measurement |
| J | T7.1 | reconcile docs |
| K | T7.2 | acceptance |

Merge discipline: waves are about *starting* work; merge PRs as they pass
CI, rebasing within a wave when tasks touch neighbouring files (most don't
— scopes were drawn to minimise overlap).

## Risks and mitigations

| Risk | Mitigation |
| --- | --- |
| OpenFreeMap availability (free, no SLA) | Tile URL isolated in one config module (T3.2); documented fallback to self-hosted PMTiles (Protomaps or OS Open Zoomstack) on free object storage |
| WebGL export flakiness | `preserveDrawingBuffer` from day one, capture on `idle`, e2e pixel-variance assertion (T5.1); composition is offscreen-canvas, not DOM screenshot |
| MapLibre v6 lands mid-build | Pin 5.x; migration is a scoped follow-up, not an MVP concern |
| typescript-eslint caps TS at `<6.1` | Pin TypeScript minor; Dependabot grouping surfaces the compatible bump |
| DoBIH updates change data | Committed JSON is version-stamped; refresh is a manual, reviewed `data:` PR rerunning T2.2's script; CI validates count/shape (T2.4) |
| PR-preview action requires branch-based Pages | Accepted trade-off (T1.2 uses branch deploy); revisit Cloudflare Pages only if preview UX becomes limiting |
| Docs drift as code lands | Rule 7 + per-phase docs gates + docs CI (T1.5) + final reconciliation (T7.1) |
| Scope creep against SOUL.md | Standing rule 1; reviewers reject anything on the roadmap's non-goals list |

## MVP definition of done

The MVP ships when T7.2 reports every `wiki/mvp.md` success criterion
passing on the deployed GitHub Pages site, all six user stories work on
desktop and phone, CI is green with coverage thresholds held, the
data-only second-list acid test succeeds, and the documentation
reconciliation (T7.1) is merged. Then — per the roadmap — more hill
lists.
