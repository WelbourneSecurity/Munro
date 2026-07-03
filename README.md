# Munro

A clean, map-first hiking tracker for UK peak bagging.

Munro lets you view the UK's major mountain and fell lists on a dark,
topographic-style map, mark peaks as bagged, track your progress by hill list
or national park, and export a polished, shareable image of your completed
peaks.

The first version is deliberately simple: a flawless tracker — not a social
network, route planner, GPX library or navigation tool. See
[SOUL.md](SOUL.md) for the philosophy behind that choice.

## Description

Open the app, choose a hill list or national park, and see every relevant
peak plotted on a minimal topographic map. Unbagged peaks sit muted grey;
bagged peaks illuminate in a soft green. Click a peak to view its details,
mark it as bagged, and watch your progress update.

Munro is being developed as a single product accessible from the **web**, on
**iPhone** and on **Android** devices. The MVP targets the Lake District and
the 214 Wainwrights, expanding afterwards to Munros, Corbetts, Grahams,
Donalds, Nuttalls, Hewitts, Marilyns and more.

Full product detail lives in the [project wiki](wiki/index.md):

| Page | Contents |
| --- | --- |
| [Vision](wiki/vision.md) | Core idea, target users, what Munro is and isn't |
| [MVP](wiki/mvp.md) | MVP scope, recommended region, pages, user stories, success criteria |
| [Implementation plan](wiki/implementation-plan.md) | Verified tech decisions, CI/CD design, and the full agentic task breakdown for building the MVP |
| [Features](wiki/features.md) | Map view, peak tracking, progress dashboard, image export, local-first storage |
| [Data](wiki/data.md) | Peak and progress schemas, map data sources and licensing |
| [Design](wiki/design.md) | Visual style, styling guidance, what to avoid |
| [Tech stack](wiki/tech-stack.md) | Recommended libraries and architecture |
| [Platforms](wiki/platforms.md) | Web, iPhone and Android strategy |
| [Roadmap](wiki/roadmap.md) | Non-goals for the MVP and possible future features |

## Visuals

No screenshots yet — the project is in the planning stage. The target look is
a dark charcoal topographic map with grey contour lines, muted grey markers
for unbagged peaks and pastel green for bagged ones. See
[Design](wiki/design.md).

## Installation

The application itself has not been built yet. What you can install today is
the documentation site, which is built with [MkDocs](https://www.mkdocs.org/)
and the Material theme:

```sh
pip install -r requirements.txt
```

## Usage

Serve the documentation locally with live reload:

```sh
mkdocs serve
```

Then open <http://127.0.0.1:8000>. To build the static site into `site/`:

```sh
mkdocs build
```

Once the app exists, this section will cover running it for web, iOS and
Android.

## Support

Questions and ideas are welcome — please open a GitHub issue on this
repository.

## Roadmap

1. **Wainwrights MVP** — Lake District map, bag/unbag tracking, local-first
   storage, progress stats and image export, working well on desktop and
   mobile browsers.
2. **More hill lists** — Munros, Munro Tops, Corbetts, Grahams, Donalds,
   Furths, Nuttalls, Hewitts, Marilyns and UK county tops.
3. **Native reach** — installable experience on iPhone and Android (see
   [Platforms](wiki/platforms.md)).
4. **Later** — accounts and cloud sync, GPX upload, Strava import, offline
   support, poster exports and more: see the full [Roadmap](wiki/roadmap.md).

## Contributing

The project is at the planning stage, so contributions right now are ideas,
data-source suggestions and design feedback via issues. Before contributing,
read [SOUL.md](SOUL.md) — Munro has a strong point of view about staying
small and polished, and contributions should fit it. Agent/AI contributors
should read [CLAUDE.md](CLAUDE.md) (also available as [AGENTS.md](AGENTS.md)).

## Authors and acknowledgment

Peak data will be sourced with thanks from the
[Database of British and Irish Hills](https://www.hills-database.co.uk/) and
mapping from [Ordnance Survey](https://osdatahub.os.uk/) open data, subject
to their licences.

## License

[MIT](LICENSE). Note that the licence covers this repository's code and
documentation; hill data and map data used by the app remain under their own
licences (Database of British and Irish Hills, CC BY 4.0; Ordnance Survey /
Natural England open data, OGL v3) — see [Data](wiki/data.md).

## Project status

**Planning.** This repository currently contains the product brief (as a
documentation site) and no application code. The next milestone is the
Wainwrights MVP described in [MVP](wiki/mvp.md); the build itself is broken
down into tasks in the
[implementation plan](wiki/implementation-plan.md).
