# Platforms

Munro is being developed into an app that can be accessed **via the web, on
an iPhone and on an Android device** — one product, one design language, one
record, on whatever screen is in the user's hand.

## Strategy: web-first, then wrap

The path keeps a single TypeScript/React codebase throughout:

### 1. Responsive web app (MVP — built)

The MVP is a responsive web app that works well on desktop and mobile
browsers. This stage is built: the tracker ships with a phone-sized layout,
touch-friendly controls, and end-to-end tests that run in an
iPhone-13-sized mobile project as well as desktop Chromium. It reaches
iPhone and Android users through Safari and Chrome at
<https://munro.welbournesecurity.com>.

### 2. Progressive Web App (PWA — planned)

Adding a manifest and service worker makes Munro installable from the
browser on both iPhone and Android — home-screen icon, full-screen launch,
and a path to offline support. This is listed as a future feature ("Mobile
PWA install") and requires no second codebase.

### 3. Store presence via a wrapper (later, if needed)

If App Store / Play Store distribution becomes worthwhile, wrap the existing
web app with [Capacitor](https://capacitorjs.com/) (or similar) rather than
rewriting. A full native rewrite (e.g. React Native) should only be
considered if the web map experience proves insufficient on mobile — with
MapLibre GL JS this is unlikely for a tracker.

## How the MVP holds these open

- Mobile layouts were designed from day one; the tracker map, bag/unbag
  action and export work on a phone-sized screen and are tested there.
- The app uses libraries that work in a plain browser context (MapLibre GL
  JS, localStorage) so the PWA and wrapper steps stay cheap.
- Local-first storage already suits mobile: progress lives on the device,
  and JSON export/import moves it between devices until cloud sync exists.
- Offline mobile app support remains a **non-goal for the MVP** (see
  [Roadmap](roadmap.md)) — the platform strategy just keeps it reachable.
