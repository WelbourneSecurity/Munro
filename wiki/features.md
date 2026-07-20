# Core features

## 1. Map view

The map offers Midnight, Light and Nature topographic visual styles with:

- Contour lines
- Subtle terrain shading where possible
- National park boundary
- Peak markers
- Peak labels at appropriate zoom levels
- Hollow stone survey diamonds for incomplete peaks inside individual ranges
- Solid bone survey diamonds for completed peaks

The UK overview shows completed hills only. Every edition opens in a curated
frame and cannot be panned or zoomed beyond that frame.

The visual direction should be monochrome, restrained and premium. Avoid
cartoon hiking app styling.

## 2. Peak tracking

Each peak should have:

- Name
- Height in metres
- Height in feet
- Hill list classification
- Region or national park
- Latitude and longitude
- Optional OS grid reference
- Bagged status
- Date bagged
- Optional notes

For the MVP, notes and dates can be optional. Bagged/unbagged is the core
interaction.

## 3. Progress dashboard

The app should show:

- Total peaks in the selected geographic edition
- Number bagged
- Number remaining
- Completion percentage
- Recent bagged peaks if dates are used
- Filter by bagged, unbagged or all

## 4. Export poster

Users can export a clean field poster of the currently selected edition at any
point.

The export should include:

- Map area
- Bagged peaks shown with solid/inverted bone-and-ink status
- No unbagged markers or selected reticle
- Midnight, Light or Nature map colour chosen independently in the dialog
- Edition title, for example "Wainwrights" or "Scotland"
- Edition progress count, for example "37 / 330 BAGGED"
- Date exported
- Munro / Field Edition branding on warm bone stock

The exported image should be suitable for sharing on LinkedIn, Instagram,
Discord or personal blogs.

## 5. Local-first storage

The first version should use local browser storage rather than accounts.

Use:

- LocalStorage or IndexedDB for user progress
- Import/export JSON backup
- No authentication in the MVP
- Persist the selected range and appearance, but deliberately reset each map
  camera to its curated frame

This keeps the project simple and avoids unnecessary backend complexity.

## 6. Summit detection (optional)

A post-MVP convenience, strictly opt-in and off by default. When the
"Summit detection" setting is enabled, the app watches the device's
location while it is open and marks a peak as bagged when the hiker
reaches its summit — within roughly 100 m, widened a little to allow for
the reported GPS accuracy. Fixes with very poor accuracy never trigger a
detection, and a fix that only reaches a summit through that accuracy
widening needs a second consecutive fix to agree before the peak is
bagged — someone on the summit lingers; a walk or drive past it should
not bag anything.

Constraints that keep it in character:

- Opt-in only; turning the setting off stops location watching
  immediately, and a hard permission denial switches it off by itself.
- A fix bags at most one peak — the nearest summit — and only when it
  points to that summit unambiguously. A fix that could belong to more
  than one summit, such as one taken on the col between two neighbouring
  peaks, bags nothing and detection waits for a closer fix.
- Location is used only in the moment, on the device. No position
  history or last-known location is ever stored — only the boolean
  preference and the ordinary progress record persist.
- Detection never overwrites an existing record: a peak already bagged
  keeps its date and notes.
- Confirmation is a quiet ink-and-bone notice consistent with the design
  language — no sounds, badges or pop-ups.
