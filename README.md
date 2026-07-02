# Munro: Project Brief

## Overview

Munro is a clean, map-first hiking tracker for UK peak bagging. The app allows users to view major UK mountain and fell lists on a topographic-style map, mark peaks as bagged, track progress by national park or hill list, and export a shareable image showing their completed peaks.

The first version should stay deliberately simple: a flawless tracker, not a social network, route planner, GPX library or navigation tool.

## Core Idea

Users open the app, choose a hill list or national park, and see all relevant peaks plotted on a dark, minimal topographic map. Unbagged peaks appear muted grey. Bagged peaks illuminate in a soft green accent. The user can click a peak, view basic information, mark it as bagged, and see their progress update.

The app should feel like a premium outdoor logbook with a technical map aesthetic.

## Product Name

Munro

## Target Users

* UK hikers and hillwalkers
* Peak baggers
* Wainwright, Munro, Corbett, Graham, Donald, Nuttall and Marilyn completers
* Outdoor enthusiasts who want a visual record of progress
* Users who want a clean alternative to spreadsheet-based tracking

## MVP Scope

The MVP should focus on one complete, polished experience:

1. View a topographic-style UK national park map
2. Display a curated list of peaks for that area
3. Mark peaks as bagged or unbagged
4. Store progress locally in the browser
5. Show progress statistics
6. Export a clean image of the selected national park/list with bagged peaks highlighted
7. Work well on desktop and mobile

## Recommended MVP Region

Start with the Lake District and the 214 Wainwrights.

Reasons:

* Strong recognisable challenge
* Good bounded geography
* Manageable dataset size
* Ideal for testing the export feature
* Clear visual appeal

After the Wainwright MVP is stable, expand to:

* Munros
* Munro Tops
* Corbetts
* Grahams
* Donalds
* Furths
* Nuttalls
* Hewitts
* Marilyns
* UK county tops

## Core Features

### 1. Map View

The map should show a dark, minimal topographic visual style with:

* Contour lines
* Subtle terrain shading where possible
* National park boundary
* Peak markers
* Peak labels at appropriate zoom levels
* Muted styling for incomplete peaks
* Soft green styling for completed peaks

The visual direction should be monochrome, restrained and premium. Avoid cartoon hiking app styling.

### 2. Peak Tracking

Each peak should have:

* Name
* Height in metres
* Height in feet
* Hill list classification
* Region or national park
* Latitude and longitude
* Optional OS grid reference
* Bagged status
* Date bagged
* Optional notes

For the MVP, notes and dates can be optional. Bagged/unbagged is the core interaction.

### 3. Progress Dashboard

The app should show:

* Total peaks in selected list
* Number bagged
* Number remaining
* Completion percentage
* Recent bagged peaks if dates are used
* Filter by bagged, unbagged or all

### 4. Export Image

Users should be able to export a clean image of the current national park or hill list.

The export should include:

* Map area
* Bagged peaks highlighted in green
* Unbagged peaks in grey
* Title, for example “Lake District Wainwrights”
* Progress count, for example “37 / 214 bagged”
* Date exported
* Munro branding

The exported image should be suitable for sharing on LinkedIn, Instagram, Discord or personal blogs.

### 5. Local-First Storage

The first version should use local browser storage rather than accounts.

Use:

* LocalStorage or IndexedDB for user progress
* Import/export JSON backup
* No authentication in the MVP

This keeps the project simple and avoids unnecessary backend complexity.

## Data Strategy

### Peak Data

The peak dataset should be stored as structured local data first, for example JSON or TypeScript data files.

Each record should follow a consistent schema:

```ts
type Peak = {
  id: string;
  name: string;
  list: string[];
  region: string;
  nationalPark?: string;
  heightM: number;
  heightFt?: number;
  lat: number;
  lon: number;
  gridRef?: string;
  source?: string;
};
```

### Progress Data

User progress should be separate from the source peak data:

```ts
type PeakProgress = {
  peakId: string;
  bagged: boolean;
  baggedDate?: string;
  notes?: string;
};
```

### Map Data

The app should use reliable mapping data and respect licensing.

Preferred sources to investigate:

* Ordnance Survey Data Hub
* OS Maps API
* OS Terrain 50
* OS Terrain 5 if higher terrain detail is needed later
* Database of British and Irish Hills
* Official national park boundary datasets where available

For the MVP, do not attempt to generate accurate “peak boundaries”. Treat peaks as summit points. Peak boundary lighting can be considered later using terrain-derived catchments, prominence regions or Voronoi-style approximations, but that is not needed for the first tracker.

## Visual Style

Munro should feel:

* Dark
* Minimal
* Topographic
* Technical
* Outdoors-focused
* Calm and premium

Suggested styling:

* Dark charcoal background
* Grey contour lines
* Muted grey unbagged peaks
* Pastel green bagged peaks
* Clean sans-serif typography
* Small technical labels
* Thin borders
* Minimal animations
* Smooth hover states

Avoid:

* Bright gamified colours
* Overly playful icons
* Heavy 3D effects
* Bloated dashboards
* Social media clutter
* Complex route planning in MVP

## Suggested Tech Stack

Recommended simple stack:

* React or Next.js
* TypeScript
* Tailwind CSS
* MapLibre GL JS or Leaflet
* LocalStorage or IndexedDB
* html-to-image or similar export library
* Static JSON/TypeScript data files for peaks

If using vector tiles or advanced map styling:

* MapLibre GL JS is preferred

If keeping the first version very simple:

* Leaflet is acceptable

## MVP Pages

### Home

Purpose:

* Explain what Munro is
* Show quick stats
* CTA to open tracker

### Tracker

Purpose:

* Main map interface
* Peak list
* Filters
* Bag/unbag actions
* Progress summary
* Export image button

### Data / Lists

Purpose:

* Show supported hill lists
* Explain data sources and limitations

### Settings

Purpose:

* Export/import user progress
* Reset local progress
* Toggle visual preferences

## Key User Stories

1. As a hiker, I want to see all Wainwrights on a map so I can understand what I have left to complete.
2. As a hiker, I want to mark a peak as bagged so my progress is saved.
3. As a hiker, I want bagged peaks to light up visually so the map feels rewarding.
4. As a hiker, I want to export an image of my progress so I can share it.
5. As a hiker, I want to back up my progress so I do not lose my record.
6. As a hiker, I want to filter remaining peaks so I can plan future walks.

## Non-Goals for MVP

Munro should not initially include:

* Route planning
* Turn-by-turn navigation
* GPX recording
* User accounts
* Social feeds
* Comments
* Public profiles
* Paid subscriptions
* Weather forecasting
* Strava integration
* Offline mobile app support
* Accurate summit catchment boundaries

These can be revisited later.

## Success Criteria

The MVP is successful when:

* The map loads quickly
* Peaks are accurately positioned
* Bagged state is reliable
* Progress persists after refresh
* Exported images look polished
* The interface works well on mobile and desktop
* The codebase is clean and easy to extend
* Adding another hill list is straightforward

## Future Features

Possible later features:

* User accounts and cloud sync
* GPX upload
* Strava import
* Route suggestions
* Offline support
* Peak photos
* Public completion profiles
* National park poster exports
* Completion certificates
* Mobile PWA install
* Terrain-derived peak regions
* Multiple export themes
* Personal hiking journal

## Build Philosophy

Munro should be built as a polished tracker first.

Do not overbuild. Do not chase every outdoor app feature. The unique value is the visual satisfaction of seeing the UK’s major peaks light up as the user bags them.
