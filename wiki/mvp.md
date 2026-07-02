# MVP

## Scope

The MVP should focus on one complete, polished experience:

1. View a topographic-style UK national park map
2. Display a curated list of peaks for that area
3. Mark peaks as bagged or unbagged
4. Store progress locally in the browser
5. Show progress statistics
6. Export a clean image of the selected national park/list with bagged
   peaks highlighted
7. Work well on desktop and mobile

## Recommended MVP region

Start with the **Lake District and the 214 Wainwrights**.

Reasons:

- Strong recognisable challenge
- Good bounded geography
- Manageable dataset size
- Ideal for testing the export feature
- Clear visual appeal

After the Wainwright MVP is stable, expand to:

- Munros
- Munro Tops
- Corbetts
- Grahams
- Donalds
- Furths
- Nuttalls
- Hewitts
- Marilyns
- UK county tops

## MVP pages

### Home

- Explain what Munro is
- Show quick stats
- CTA to open tracker

### Tracker

- Main map interface
- Peak list
- Filters
- Bag/unbag actions
- Progress summary
- Export image button

### Data / Lists

- Show supported hill lists
- Explain data sources and limitations

### Settings

- Export/import user progress
- Reset local progress
- Toggle visual preferences

## Key user stories

1. As a hiker, I want to see all Wainwrights on a map so I can understand
   what I have left to complete.
2. As a hiker, I want to mark a peak as bagged so my progress is saved.
3. As a hiker, I want bagged peaks to light up visually so the map feels
   rewarding.
4. As a hiker, I want to export an image of my progress so I can share it.
5. As a hiker, I want to back up my progress so I do not lose my record.
6. As a hiker, I want to filter remaining peaks so I can plan future walks.

## Success criteria

The MVP is successful when:

- The map loads quickly
- Peaks are accurately positioned
- Bagged state is reliable
- Progress persists after refresh
- Exported images look polished
- The interface works well on mobile and desktop
- The codebase is clean and easy to extend
- Adding another hill list is straightforward
