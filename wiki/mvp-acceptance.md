# MVP acceptance review

**Reviewed: 11 July 2026.** An acceptance panel checked the implemented
Wainwrights MVP against the success criteria in [MVP](mvp.md), from five
angles: data accuracy, tracker reliability, export quality, the phone
experience, and extensibility.

One caveat applies throughout. The first deploy to
<https://munro.welbournesecurity.com> happens only after this work merges
to `main`, so every check ran against a **local production build**
(`npm run build && npm run preview`), not the live site. The review
sandbox also cannot complete AWS terrain (DEM) tile requests, so flows
that wait for map idle were tested with the Terrain toggle off — an
environment limitation, not an app bug. Anything that genuinely needs the
deployed site or real terrain tiles is marked **deferred** below and
listed at the end.

## Success criteria

| Criterion | Verdict | Evidence |
| --- | --- | --- |
| The map loads quickly | Pass (local) | Map canvas drew in under 1 second on emulated iPhone 13 against the local preview; a real-network Lighthouse run is deferred to post-merge. |
| Peaks are accurately positioned | Pass | All 214 peaks diffed field-by-field against the DoBIH v18.4 source CSV with zero mismatches; an independent WGS84→OSGB36 conversion puts every peak within 65 m of its grid-square centre. |
| Bagged state is reliable | Pass | 40 rapid toggles across single and multiple peaks kept the store, stats, list indicators and live map GeoJSON exactly consistent, including record deletion on unbag. |
| Progress persists after refresh | Pass | Bagged state, dates and notes survived page reload and a fresh browser context imported from exported storage state; un-blurred notes are flushed on `pagehide`. |
| Exported images look polished | Pass, with reservations | Both presets pixel-exact at DPR 1 and 2, all four licence strings drawn verbatim, viewport restored exactly; but the auto-selected peak's bright ring is baked into every fresh-session export, and the basemap could not render in the sandbox. |
| The interface works well on mobile and desktop | Pass | All six user stories complete on iPhone-13 emulation with every story-critical control at 44 px or larger, no page overflow, safe-area insets respected; keyboard-only desktop pass with correct focus trapping. |
| The codebase is clean and easy to extend | Pass | The acid test added a second hill list with zero changes to `src/domain`, `src/store` or map layer styling; `npm run verify` and the full Playwright suite stayed green throughout. |
| Adding another hill list is straightforward | Fail as literally stated | Straightforward, but not data-only: three UI files (`MapView.tsx`, `App.tsx`, `PeakListPanel.tsx`) needed shallow wiring changes because no list seam exists yet. |

## Data accuracy

Verdict: **pass**, with two advisory notes.

- The panel went beyond a spot check: it downloaded the actual DoBIH v18.4
  CSV from the URL recorded in the data file's own metadata and diffed all
  214 peaks on name, height (m and ft), latitude, longitude, grid
  reference and region. Zero mismatches; the 214 W-flagged DoBIH rows are
  exactly the app's peak set.
- Internal consistency holds: all grid references match `^(NY|SD)\d{6}$`
  (the five SD peaks are the genuine Coniston/Eskdale group), regions are
  exactly the seven Wainwright volumes with canonical counts summing to
  214, and metres/feet agree within rounding everywhere.
- The Lake District boundary GeoJSON is a single valid WGS84 polygon under
  50 KB with the OGL v3 licence and Natural England attribution embedded.
  The 214 hill-profile features correspond 1:1 with peak ids and carry the
  non-authoritative "visual lighting profile" caveat in their metadata.
- Licence strings on the Data page and in exported images both render from
  the constants in `src/data/attribution.ts`; tests assert the labels
  verbatim. No hand-copied licence text exists.

Advisory notes: Skiddaw is 930.4 m per DoBIH v18.4 (the app matches the
source exactly; 931 m is the older OS-map convention), and 42 peak names
carry DoBIH disambiguation brackets verbatim (for example "Cat Bells
[Catbells]") — accurate to source, but display-name polish worth a look.

## Tracker reliability

Verdict: **pass** on every criterion, tested adversarially.

- Rapid toggling (22 toggles on one peak, 18 across five) never desynced
  the store, stats line, list indicators or the map's live GeoJSON source,
  which was queried directly through the real MapLibre instance.
- Persistence survives reload and a fresh browser context — the closest
  local equivalent of a browser restart — including bagged date and notes.
- Selection syncs in both directions: a list click flies the map to the
  peak, and a canvas click at the projected pixel of a neighbouring fell
  updates the detail panel and list highlight.
- Filter and search counts matched independently computed expectations for
  every case tried, including the empty-state message.
- Dates and notes round-trip correctly: clearing a date removes the stored
  key, notes commit on blur, and notes typed without blurring still
  survive a reload.
- The reset flow is gated on typing `RESET` exactly, and a backup export
  re-imported after reset restored a byte-identical store.

The repository's own 15-spec Playwright suite (desktop Chromium plus
iPhone-13 mobile) also passed against the same preview build.

## Export quality

Verdict: **pass** on mechanics, **pass with reservations** on look.

- Dimensions are exactly 1600×2000 (portrait) and 1920×1080 (landscape) at
  both device pixel ratios; the filename follows
  `munro-wainwrights-YYYY-MM-DD.png`; the charcoal ground is exactly
  `#111713`; the bagged count renders in the soft green accent.
- All four licence strings are drawn into the pixels verbatim, verified
  two independent ways (a `fillText` hook and per-line ink-pixel counts).
- The map viewport is restored exactly after export, even after
  deliberately zooming away first. 76 automated checks passed with zero
  first-party console errors.
- Reservation one: the currently selected peak's bright ring is baked into
  the shareable image, and a peak is auto-selected on load — so every
  fresh-session export ships a meaningless bright ring. Follow-up below.
- Reservation two: the sandbox proxy prevents the browser from fetching
  OpenFreeMap basemap tiles at all, and terrain was off, so the exported
  map here contained only the local overlays. What a production export
  actually looks like with basemap and terrain is **deferred** to a
  post-deploy re-check.

## Phone experience and user stories

Verdict: **pass** — all six [MVP user stories](mvp.md#key-user-stories)
complete on iPhone-13 emulation, one-handed-plausibly, with terrain off.

- Story 1 (see all Wainwrights): map draws quickly with all 214 fells as
  summit-centred outlines. Noted: unbagged fells are deliberately faint at
  default zoom, so "what's left" leans on the list and Open filter.
- Story 2 (mark bagged, saved): the full path from search to Mark bagged
  writes to `munro.progress.v1` and survives reload; every control on the
  path measured at least 44 px.
- Story 3 (bagged peaks light up): a same-camera pixel diff shows the
  green lighting appearing exactly at the bagged fell's position.
- Story 4 (export): the dialog fits a 375×667 viewport, both presets
  produced verified PNGs on the emulated phone, and attribution is in the
  pixels.
- Story 5 (backup): full export → typed-RESET → restore round trip works
  on the phone, and an invalid file is rejected with the confirm button
  disabled.
- Story 6 (filter remaining): Open and Bagged filters show correct counts
  with 44 px filter segments in the lower half of the screen.

Platform checks passed: map gestures never fight page scroll, no route has
horizontal overflow at 390 px, safe-area insets are respected under notch
emulation, no visible text is under 12 px, and a keyboard-only desktop
pass completed all six stories with the export dialog trapping focus and
Escape returning focus to its trigger. The one ergonomic failure — the
open sheet's "Hide panel" toggle scrolls off-screen — is listed below.

## Extensibility acid test

Claim under test: *adding a second hill list is a data-only change*.

Verdict: **fail as literally stated, pass at the core.** A 16-fell
Outlying Fells fixture worked end to end — list switching, bagging,
fully isolated progress — with zero changes to the domain schemas, the
progress store or the map layer styling. But the UI had no list seam:
every consumer imported `wainwrights.json` directly, so three runtime
files had to change beyond the two new data files.

Files touched (in a disposable worktree; nothing ships):

- `src/data/outlying-fells.json` — new, data-only (fixture, clearly marked)
- `src/data/lists.ts` — new list registry constant (data-only in spirit)
- `src/map/MapView.tsx` — **violation**: hardwired Wainwright imports and
  header, no list switcher
- `src/app/App.tsx` — **violation**: home page imported `wainwrights.json`
  directly with one hardcoded stats block
- `src/components/PeakListPanel.tsx` — **violation**: hardcoded
  region-prefix stripping
- `src/domain/data-validation.test.ts` and
  `tests/e2e/acid-outlying.spec.ts` — test evidence only

The violations are shallow wiring, not refactors. A one-time "list seam"
change would make the data-only promise true for every list after it. The
test also flushed out real issues for that work: the export title is a
baked constant, the Data page hardcodes the Wainwrights card, the active
list isn't persisted, the camera is hard-locked to the Lake District, and
list data all loads in the initial chunk — each listed below.

## Failures and follow-ups

These would become tracked issues, roughly in priority order:

1. **Export bakes the selection ring into the image.** `MapView.tsx`
   auto-selects the first peak on load and the selected hill draws as the
   brightest mark on the map, so fresh-session exports carry a meaningless
   ring. Suppress or clear the selected flag while framing the export
   snapshot.
2. **The open bottom sheet's "Hide panel" toggle is not sticky.** After
   scrolling to the peak list it sits off-screen, and even unscrolled it's
   in the top fifth of the screen. Make it sticky at the top of the sheet,
   or add a persistent bottom handle. All stories remain completable, so
   this is polish, not a blocker.
3. **Build the hill-list seam** so the next list really is data-only:
   introduce a list registry, thread the active list through `MapView`,
   the home page stats and the peak list panel, and reset panel
   search/filter state on list switch (a leak found and fixed during the
   acid test).
4. **Thread the export title from the active list.** `EXPORT_TITLE`
   ("Lake District · Wainwrights") is a constant in `src/export/layout.ts`
   drawn unconditionally by `compose.ts`.
5. **Render the Data page list card from the registry** instead of the
   hardcoded "Wainwrights / 214 fells" block in `src/app/DataPage.tsx`.
6. **Persist the active list** in the preferences store
   (`munro.prefs.v1`).
7. **Make camera bounds and initial view per-list data.**
   `src/map/config.ts` hard-locks the camera to the Lake District — fine
   for the Outlying Fells, fatal for Munros.
8. **Per-list hill lighting.** The lighting profiles and the `scripts/`
   generation pipeline exist only for the Wainwrights; new lists need
   their own generation or a graceful no-lighting mode.
9. **Lazy-load list data.** `lists.ts` as prototyped pulls every list into
   the initial chunk; Munros-scale data would breach the performance
   budget in [Operations](operations.md).
10. **Unbagging silently discards the date and notes.** "Mark unbagged"
    deletes the whole record, so a mis-click followed by re-bag loses the
    hiker's notes with no undo. Consistent behaviour, but worth a product
    decision.
11. **Dead paint config on the peak marker layer.** The summit-dot circle
    layer has both opacities at 0 despite a fully specified colour
    expression — either intentional "hill lighting only" design to
    document, or an oversight to fix.
12. **Display-name polish decisions.** Whether to note Skiddaw's 930.4 m
    (DoBIH) versus the traditional 931 m on the Data page, and whether to
    tidy DoBIH disambiguation brackets in 42 peak names. Both are
    source-fidelity questions for a human, not data errors.

## Conclusion

The MVP definition of done is met, with honest edges. Every scope item
works, all six user stories pass on desktop and on an emulated phone, the
data is source-exact against DoBIH v18.4, licensing is rendered and drawn
correctly everywhere, and bagged state proved reliable under deliberately
hostile toggling. The two real failures — the selection ring in exports
and the non-sticky sheet toggle — are polish items with clear fixes, and
the extensibility promise holds at the architecture level even though the
UI still needs its one-time list seam.

Deferred to after the merge to `main`, because they need the live site or
a real network: checks against <https://munro.welbournesecurity.com>
itself (custom domain, CNAME, tile preconnects), a real Lighthouse run,
export appearance with the basemap and terrain actually rendered, and a
first-load spot check on a physical phone with terrain on. None of these
blocks the merge; all of them should happen soon after it.
