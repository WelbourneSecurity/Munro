# Munro

A clean, map-first hiking tracker for UK peak bagging.

Munro presents the UK's hills as deliberately framed geographic editions on a
neutral topographic map. Mark summits as bagged, track each edition, and export
a bone-and-ink field poster of the selected area and its progress.

The first version is deliberately simple: a flawless tracker — not a social
network, route planner, GPX library or navigation tool. See
[SOUL.md](SOUL.md) for the philosophy behind that choice.

## Description

Open the app, choose a geographic edition from the editorial range index, and
see that complete area fitted to the map. Scotland, Wales and Northern Ireland
group their full DoBIH geographic sections; Wainwrights combines the 214 core
fells with every Outlying Fell. Hollow survey diamonds mark open
summits; solid bone diamonds mark bagged summits. Select a peak to view its details,
mark it as bagged, and watch your progress update.

Munro is a single product accessible from the **web**, on **iPhone** and on
**Android** devices. The registry covers the UK with Wainwrights, Munros,
Corbetts, Grahams, Donalds, Nuttalls, Hewitts, Marilyns, county tops and
more beneath those editions. Pushes to `main` deploy the app to
<https://munro.welbournesecurity.com>.

Full product detail lives in the [project wiki](wiki/index.md):

| Page                                               | Contents                                                                                 |
| -------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| [Vision](wiki/vision.md)                           | Core idea, target users, what Munro is and isn't                                         |
| [MVP](wiki/mvp.md)                                 | MVP scope, region, pages, user stories, success criteria — now implemented               |
| [Implementation plan](wiki/implementation-plan.md) | The historical build plan: verified tech decisions, CI/CD design, agentic task breakdown |
| [Features](wiki/features.md)                       | Map view, peak tracking, progress dashboard, image export, local-first storage           |
| [Data](wiki/data.md)                               | Peak and progress schemas, map data sources and licensing                                |
| [Design](wiki/design.md)                           | Visual style, styling guidance, what to avoid                                            |
| [Tech stack](wiki/tech-stack.md)                   | The shipped stack and architectural rules                                                |
| [Platforms](wiki/platforms.md)                     | Web, iPhone and Android strategy                                                         |
| [Operations](wiki/operations.md)                   | Repository settings, deployments and the performance budget                              |
| [Roadmap](wiki/roadmap.md)                         | Non-goals for the MVP and possible future features                                       |

## Visual direction

The tracker uses a bone-and-ink outdoor-logbook interface over a restrained
neutral OpenFreeMap basemap. Authoritative DoBIH summit points, optional
terrain hillshade and contour lines provide mountain context without
pretending generated outlines are real hills. See [Design](wiki/design.md).

## Installation

Install the web app dependencies:

```sh
npm ci
```

The documentation site is built with [MkDocs](https://www.mkdocs.org/) and the
Material theme:

```sh
pip install -r requirements.txt
```

## Usage

Run the app locally:

```sh
npm run dev
```

Build and preview the production app:

```sh
npm run build
npm run preview
```

Run the checks:

```sh
npm run typecheck    # TypeScript, no emit
npm run lint         # ESLint
npm run format:check # Prettier
npm run test         # Vitest unit and component tests
npm run test:coverage
npm run test:e2e     # production build + Playwright (desktop and mobile)
npm run verify       # typecheck, lint, format:check, test, build
```

Refresh reviewed source data:

```sh
npm run data:peaks
npm run data:boundary
npm run data:hill-boundaries
```

Serve the documentation locally with live reload:

```sh
mkdocs serve
```

Then open <http://127.0.0.1:8000>. To build the static site into `site/`:

```sh
mkdocs build --strict
```

## Support

Questions and ideas are welcome — please open a GitHub issue on this
repository.

## Roadmap

1. **Wainwrights MVP** (built) — Lake District map, bag/unbag tracking,
   local-first storage, progress stats and image export, working well on
   desktop and mobile browsers.
2. **More hill lists** — Munros, Munro Tops, Corbetts, Grahams, Donalds,
   Furths, Nuttalls, Hewitts, Marilyns and UK county tops.
3. **Native reach** — installable experience on iPhone and Android (see
   [Platforms](wiki/platforms.md)).
4. **Later** — accounts and cloud sync, GPX upload, Strava import, offline
   support, poster exports and more: see the full [Roadmap](wiki/roadmap.md).

## Contributing

Before contributing, read [SOUL.md](SOUL.md) and
[CONTRIBUTING.md](CONTRIBUTING.md). Munro has a strong point of view about
staying small and polished, and contributions should fit it. Agent/AI
contributors should read [CLAUDE.md](CLAUDE.md) (also available as
[AGENTS.md](AGENTS.md)).

## Authors and acknowledgment

Peak data is sourced with thanks from the
[Database of British and Irish Hills](https://www.hill-bagging.co.uk/dobih/)
under CC BY 4.0. Boundary data is from Natural England's National Parks
(England) dataset under OGL v3. Basemap tiles are served by
[OpenFreeMap](https://openfreemap.org/) using OpenStreetMap data. Terrain
context uses [AWS Terrain Tiles](https://registry.opendata.aws/terrain-tiles/).

## License

The code is released under the [MIT License](LICENSE). The data the app
ships keeps its own licences: DoBIH hill data is CC BY 4.0 and the Natural
England boundary is OGL v3 — see [the data page](wiki/data.md) for the
attribution requirements.

## Project status

**Wainwrights MVP implemented.** The app is complete against the
[MVP scope](wiki/mvp.md): the map tracker, bag/unbag with dates and notes,
local-first progress with JSON backup and restore, progress stats, image
export, terrain hillshade and contours, and a responsive mobile layout — all
covered by unit, component and end-to-end tests. It awaits merge to `main`
and its first deployment to <https://munro.welbournesecurity.com>. The build
history lives in the [implementation plan](wiki/implementation-plan.md); what
comes next is on the [roadmap](wiki/roadmap.md).
