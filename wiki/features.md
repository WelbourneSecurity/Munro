# Core features

## 1. Map view

The map should show a dark, minimal topographic visual style with:

- Contour lines
- Subtle terrain shading where possible
- National park boundary
- Peak markers
- Peak labels at appropriate zoom levels
- Muted styling for incomplete peaks
- Soft green styling for completed peaks

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

- Total peaks in selected list
- Number bagged
- Number remaining
- Completion percentage
- Recent bagged peaks if dates are used
- Filter by bagged, unbagged or all

## 4. Export image

Users should be able to export a clean image of the current national park or
hill list.

The export should include:

- Map area
- Bagged peaks highlighted in green
- Unbagged peaks in grey
- Title, for example "Lake District Wainwrights"
- Progress count, for example "37 / 214 bagged"
- Date exported
- Munro branding

The exported image should be suitable for sharing on LinkedIn, Instagram,
Discord or personal blogs.

## 5. Local-first storage

The first version should use local browser storage rather than accounts.

Use:

- LocalStorage or IndexedDB for user progress
- Import/export JSON backup
- No authentication in the MVP

This keeps the project simple and avoids unnecessary backend complexity.
