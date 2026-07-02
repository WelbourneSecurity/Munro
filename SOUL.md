# The Soul of Munro

This document describes the philosophy of the project — the beliefs that
shape every product and engineering decision. When a choice is unclear, come
back here.

## One thing, done flawlessly

Munro is a tracker. Not a social network, not a route planner, not a GPX
library, not a navigation tool. The unique value is the visual satisfaction
of seeing the UK's major peaks light up as you bag them — everything else is
in service of that moment.

Do not overbuild. Do not chase every outdoor app feature. A small product
that feels perfect beats a large product that feels average. Features earn
their place by making the core tracking experience better; if they don't,
they belong on the roadmap, not in the app.

## A premium outdoor logbook

Munro should feel like a well-made piece of outdoor equipment: dark, minimal,
topographic, technical, calm. The map is the hero — a restrained, monochrome
canvas where a bagged peak glowing soft green is the emotional payoff.

That means no bright gamified colours, no cartoon hiking mascots, no heavy 3D
effects, no bloated dashboards, no social clutter. Restraint *is* the brand.

## The user owns their record

A hiker's bagging record can represent decades of days on the hills. It is
theirs, not ours.

- Local-first: progress lives on the user's device, no account required.
- Always exportable: backup and restore as plain JSON, never locked in.
- No dark patterns: no sign-up walls, no engagement mechanics, no pressure.

Cloud sync may come later — as a convenience, never as a condition.

## Respect the hills and the data

Peaks, heights and positions must be accurate; hillwalkers notice. Use
authoritative sources — the Database of British and Irish Hills, Ordnance
Survey open data — and respect their licences. Treat peaks honestly as
summit points rather than inventing boundaries the data can't support.

## Everywhere the hiker is

Progress gets logged in the pub after the walk, on the sofa planning the next
one, or at a desk. Munro should feel equally at home on the web, on an
iPhone and on an Android phone — one product, one design language, one
record, on whatever screen is in the user's hand.

## Simple to extend, hard to bloat

The codebase should make the right things easy: adding another hill list
should be straightforward data work, not a refactor. Clean schemas, data
separated from progress, progress separated from presentation. Complexity is
a cost paid on every future change — spend it reluctantly.

## In one sentence

> Build a small, beautiful, trustworthy logbook that makes bagging a peak
> feel as good on screen as it did on the summit.
