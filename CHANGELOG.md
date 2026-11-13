# Changelog

All notable changes to this project are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.1/);
versioning follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.14.0] - 2026-11-13

The first release of the Forensic Timeline Visualizer.

### Added

- **Three views of the same timeline.** **Swimlane** — one lane per category or
  per host; the lanes plan themselves before they are drawn, so a crowded day
  never piles labels on top of each other, and every lane reads from the
  upper left, the earliest event first, each later one stepping down and to
  the right. **Milestones** — a single axis with event cards. **Density** —
  event volume over time with a zoomable detail band.
- **Import** JSON, CSV/TSV or pasted data. Timestamps must be in UTC
  (`2026-02-03T12:13:25Z`); a stamp with no zone marker is read as UTC, and
  the import says how many rows were like that. A `machine name` column and a
  `duration` column are both recognised.
- **Editing** in place: click a dot and the editor opens on that event.
  Every edit is undoable (**Ctrl+Z** or the Undo button).
- **Red for the events that matter.** An event marked **Malicious** is painted
  red in every view, and the legend grows a red *Malicious* key. No category
  or machine colour may use red, so a red mark always means one specific
  event.
- **Times that never move.** The form carries seconds, and a wall clock is
  read back in the timeline's own timezone, so a saved event comes back as
  the exact instant it was — whatever the browser's timezone is.
- **A timezone dropdown** at the top of the dashboard: choosing a zone
  recalculates every time on the chart, and the same wall clock is read on
  every machine.
- **A time range selector** that limits the chart to a window of time, and
  **drag-to-pan** to move through the timeline with the mouse.
- **Export** a 2x PNG for the report, a shareable HTML file for a colleague,
  and JSON for a handover.

### Notes

- Zero dependencies, no build step, no network access: open `index.html` in
  any modern browser and everything runs locally, so case data never leaves
  the analyst's machine.
- The suite is 193 assertions, run by CI on Node 20 and 22.
