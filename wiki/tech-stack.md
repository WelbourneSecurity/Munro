# Suggested tech stack

Recommended simple stack:

- React or Next.js
- TypeScript
- Tailwind CSS
- MapLibre GL JS or Leaflet
- LocalStorage or IndexedDB
- html-to-image or similar export library
- Static JSON/TypeScript data files for peaks

## Map library choice

If using vector tiles or advanced map styling:

- **MapLibre GL JS is preferred**

If keeping the first version very simple:

- Leaflet is acceptable

## Architectural rules

- **Local-first**: no backend, no accounts, no authentication in the MVP.
  User progress lives in the browser with JSON import/export as backup.
- **Data separated from progress**: peak source data and user bagging
  records are distinct schemas — see [Data](data.md).
- **Lists are data, not code**: adding another hill list must be a
  straightforward data change, not a refactor.
- **Web-first, multi-platform-ready**: the stack above targets the browser
  first, but choices should keep the iPhone and Android paths open — see
  [Platforms](platforms.md).
