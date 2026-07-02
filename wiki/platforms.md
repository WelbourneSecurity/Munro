# Platforms

Munro is being developed into an app that can be accessed **via the web, on
an iPhone and on an Android device** — one product, one design language, one
record, on whatever screen is in the user's hand.

## Strategy: web-first, then wrap

The recommended path keeps a single TypeScript/React codebase throughout:

### 1. Responsive web app (MVP)

The MVP is a responsive web app that works well on desktop and mobile
browsers. This is the fastest way to a polished tracker and already reaches
iPhone and Android users through Safari and Chrome.

### 2. Progressive Web App (PWA)

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

## Implications for the MVP

- Design mobile layouts from day one; the tracker map, bag/unbag action and
  export must feel great on a phone-sized screen.
- Prefer libraries that work in a plain browser context (MapLibre GL JS,
  IndexedDB) so the PWA and wrapper steps stay cheap.
- Local-first storage already suits mobile: progress lives on the device,
  and JSON export/import moves it between devices until cloud sync exists.
- Offline mobile app support remains a **non-goal for the MVP** (see
  [Roadmap](roadmap.md)) — the platform strategy just keeps it reachable.
