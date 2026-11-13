# Forensic Timeline Visualizer

A **standalone, single-file HTML application** that turns forensic event data into a clean, executive-ready timeline. Open `index.html` in any modern browser — no installation, no build step, no network access, no external libraries. Everything runs locally, so case data never leaves the analyst's machine.

**Version 1.14.0** · [Changelog](CHANGELOG.md) · [MIT License](LICENSE)

Built for producing the timeline graphic in an executive incident report: curated events (typically < 50), clear layout, and a one-click **Export PNG** (2x scale) that drops straight into Word or PowerPoint.

## Quick start

```
git clone <this repo>
xdg-open index.html      # or just double-click it
```

On first open the built-in demo incident loads. Import your own data with **Import** (file or clipboard), refine in the **Editor** panel, switch layout modes, then **Export PNG**.

Three views are available from the toolbar: **Swimlane**, **Milestones** and **Density**.

## Input formats

Three import routes, auto-detected:

- **JSON** — file or paste. Either a full document (below) or a bare array of events.
- **CSV** — file or paste (header row required; quoted fields supported).
- **TSV / Excel paste** — paste straight from a spreadsheet.

### JSON schema

```json
{
  "title": "Incident IR-2026-042 — Timeline of Events",
  "caseId": "IR-2026-042",
  "analyst": "A. Tasheff",
  "timezone": "UTC",
  "categories": [
    { "id": "initial-access", "label": "Initial Access", "color": "#c0392b" }
  ],
  "events": [
    {
      "timestamp": "2026-10-09T08:52:00Z",
      "end": "2026-10-09T09:03:00Z",
      "title": "Employee opened invoice-q3.xlsm",
      "description": "Attachment opened on WKSTN-114",
      "category": "initial-access",
      "source": "Outlook PST",
      "machine": "WKSTN-114",
      "confidence": "confirmed"
    }
  ]
}
```

Notes:

- `categories` is optional — categories are derived automatically (with an assigned palette) from event `category` values if omitted.
- `end` is optional and enables a **duration bar** (e.g. "C2 beaconing period").
- `confidence` is `confirmed`, `probable`, or `uncertain` (defaults to `confirmed`). It is encoded everywhere a shape appears: **markers** are solid / hollow ring / dashed ring; **numbered pins** get the same three ring styles (solid pins are filled with the category color); **duration bars** step from fully opaque (confirmed) to faint (probable) to dashed (uncertain).
- `machine` (optional) records the host/device the event happened on; it powers the **Lanes → Machine** grouping and appears in tooltips and event cards.
- `timestamp` accepts ISO strings (recommended, `Z` suffix for UTC) or epoch seconds/milliseconds.
- The `timezone` label documents how naive (offset-less) timestamps should be read; `UTC` renders all values in UTC.

### CSV / TSV headers

Header names are matched case/spacing-insensitively. Recognized columns:

| Column | Aliases | Notes |
|---|---|---|
| `timestamp` | date, datetime, start, time, when | required |
| `end` | endtimestamp, end date, stop, finish | optional (duration) |
| `title` | event, summary, name | required (or description) |
| `description` | details, notes | optional |
| `category` | lane, type, phase, group | optional |
| `source` | evidence, artifact | optional |
| `machine` | host, hostname, computer, device, system, asset | optional |
| `confidence` | certainty | confirmed / probable / uncertain |
| `hidden` | | true/false |

Rows with a missing/invalid timestamp are skipped and reported per row number — never silently dropped.

See `samples/incident.json` and `samples/incident.csv` for working examples (the JSON mirrors the built-in demo).

## Layout modes

**The legend switches categories on and off.** Every category is listed there
with its event count, and clicking one hides it: the chip dims, the count stays
visible so you can see how many events are being held back, and the category
remains in the legend so you can switch it back on again. The switch applies to
**every** view at once — swimlane, milestones, density and the management
views all follow it. A hidden category keeps its place in the list, dimmed,
with a tooltip saying what clicking it will do.

**Red is reserved for malicious events.** In every view, red means
fraudulent or malicious activity, so no category or machine colour may use it:
the category palette and the phase presets are built around the wheel with the
red band left out, and a red picked by hand in the editor is moved out of the
red band (with a note saying so).

- **Swimlane** — one lane per category; point events as markers, durations as bars. The **Lanes** selector switches the grouping:
  - *Category* — lanes per category (default).
  - *Machine* — activity grouped by host: one block per machine, one sub-row per category used on that machine, so categories stay visible while machines are separated. Events without a host land in a *(no machine)* block.

  **The lane column is chrome, not data.** The machine or category names sit in their own **framed panel** on the left, under a **Category** / **Machine** heading and behind a divider, and the lane washes start at that divider — so the names never read as part of the plot, and the plot never reads as part of the names. Every lane and every machine block is framed in its own colour.

  **The lanes lay themselves out.** Every lane is planned before it is drawn: each event is given a label track — a row above or below the lane's time line — and the lane grows taller to fit the tracks it actually needs. A crowded day no longer piles labels on top of each other, and an event is only demoted to a numbered pin when even a fully grown lane has no room left. The same applies to *Machine*, where each machine block grows with the sub-rows it needs.

  **Every event is one dot, and every title is tied to it.** In *Both* the dot on the time line **carries the event's number inside it** — the number is not a second badge competing for space — and a thin stem runs from the dot to the start of its title, so a title that had to move to a distant track is never in doubt about which instant it belongs to. Dots that would fall on top of each other (events minutes apart) keep their true position on the axis and take a row of their own just below the time line, and the lane grows to make room. The stem is drawn under every label, so it never crosses a word.

  **The lane reads from the upper left.** The time line runs along the **top** of the lane and the titles hang below it in rows, so the earliest event is the top-left one and every later event steps **down and to the right** — the chart reads in the same order as the case happened.
  - **Seconds are resolved.** Inside half an hour the axis ticks read `HH:MM:SS` and every label carries its exact second in front of the title (`09:02:30 Beaconing to C2 …`), so two events half a minute apart are never confused. Outside that window the axis steps up to minutes, hours and days as the span grows.
  - **The machine lanes are plates, with the categories as sub-lanes inside them.** Each host gets its own rounded plate, framed in the host's colour, standing apart from the next — no rules run between the plates. Inside a plate, every category the host touched gets a **sub-lane** of its own, named and coloured in that category's colour, so both dimensions stay readable.
  - **Click a dot and the editor opens on that event.** Clicking a marker (or its title) selects the event, opens the editor panel if it was closed, loads the event into the form and scrolls the form into view — so a change is never more than one click away. Clicking the empty plot clears the selection.
  - **Machine colors** — each host is assigned a slot from a validated 12-color palette, so **no two machines ever share a color**. Slots are persisted, so a host keeps its color across re-renders, imports, reloads, and JSON handovers, and adding a new host never recolors the existing ones. The machine name is drawn in that color and its plate is filled with a lighter tint of it, making host blocks readable at a glance. Override any host's color in the editor's **Machines** section; double-click a swatch to return to the automatic color. Hosts with no value share a neutral grey.
- **Milestones** — single axis with alternating event cards and leader lines (cards show the machine in the time row when present).
- **Density** — stacked histogram of event volume plus a zoomable detail band. Drag on the histogram to zoom; double-click to reset.

### Zooming

**+** and **−** narrow and widen the visible time range; **Fit** returns to the whole timeline, and the percentage beside them shows the current level (100% = everything visible). Three details make the buttons behave as expected:

- **Zooming is anchored on your data, not the empty middle of the window.** Zooming in on a cluster of events keeps that cluster centred instead of drifting it off the chart.
- **Zooming out really widens the view.** The window is not clamped back to the data extent, so you can pull back far enough to see the gaps around your evidence.
- **Zooming goes all the way down to the second.** Zooming in steps through the natural units of time (a day, an hour, a minute, a second), so a case that spans years reaches its seconds in a handful of clicks rather than thirty, and the window can narrow to about a second and a half — enough to separate two events that started a second apart. Zooming back out unwinds the way it came, returning the analyst to the exact window they left.

### Moving through time with the mouse

**Drag the chart sideways** and the whole view moves with the pointer — left to look earlier, right to look later. The drag works anywhere on the plot, over the lanes and over the events themselves; a click without movement still opens the event, and a drag never does. The mouse wheel and the arrow keys are not used, so a scroll over the chart never hijacks the page.

Zooming is a working view, not a saved setting: it is deliberately not written to `localStorage`, so a reload always opens on the full timeline rather than on a stale zoom with no obvious way back.

### Limiting the view to a time range

The **Range** fields in the toolbar limit the chart to a window of time. Type a
*from* and a *to* (in the timeline's own timezone) and only what falls inside
is drawn — the lanes, the events and the axis all follow. **All** clears the
range.

The range is a hard limit: it overrides the zoom (the zoom may only narrow
further inside it), and the title block says *"Showing … only"* so a chart
that covers part of the case never reads as the whole case. Like the zoom, it
is a working view and is not written to `localStorage`.

### Choosing the timezone

The **Zone** dropdown at the top of the dashboard sets the zone the whole
timeline is read in — `UTC`, a fixed offset (`UTC+2`) or a region
(`Europe/Berlin`), with an *Other…* field for anything not on the list.
Choosing one **recalculates every time on the chart**: the same instants are
stored, but they are shown in that zone's wall clock, so a case read in Berlin
shows `11:02` where UTC shows `09:02`. The footer always repeats the zone in
force, and the range fields are read in the same zone.

### Events at the very edge

An event sitting at the extreme left **or right** of the chart would otherwise have its text clipped by the plot frame, or (in Milestones and Density) have its card shoved out of alignment with its own marker. The covered time range is therefore extended slightly on both sides so edge events keep their text and stay lined up with their markers. The reserved space is sized from the label that has to fit, and is recomputed against the current scale, so it stays correct at any zoom level.

### Why machine colors are allocated, not hashed

An earlier version derived each host's hue from a hash of its name. That sounds stable, but a hash spreads names over 360 possible hues at random — so with only three or four hosts, two of them routinely landed in the same colour region and were indistinguishable (a hash of `DC-01` and `DESKTOP-2` produced hues 147 and 149).

Host colors are now **allocated from a palette** instead. Twelve slots were chosen so that the closest pair is separated by ~35 CIE ΔE units — comfortably above the ~10 units at which two colors start to read as the same. Slots are handed out in name order and stored, so allocation is deterministic, survives reloads, travels with an exported timeline, and never repaints machines that already have a color. Beyond twelve hosts the palette extends with lightness-shifted variants, so distinctions keep holding.

### One colouring convention, whichever way you group

Whichever dimension owns the lanes also owns the lane colour, and the other dimension stays visible as a mark with its own colours:

| Grouping | Lane name colour | Lane fill | The other dimension |
|---|---|---|---|
| Category | category colour | lighter tint of it, **framed in the category colour** | the machine's **name**, in the machine's colour, after each event label |
| Machine | machine colour | lighter tint of it, **framed in the machine colour** | the **category chip** after each event label |

**The lane's colour reaches all the way across.** A lane is a single band from the name column to the right-hand edge, so the name on the left and the events on the right belong to the same lane and wear the same colour; the band is framed in that colour, so one lane never bleeds into the next. In the machine lanes the host's colour covers the band, the name, the markers and the duration bars; the category rides on each event as a small chip of its own colour.

**One band per host.** The machine lanes used to be split again per category, so a chart with five hosts and five categories grew fifteen horizontal lanes. There is now **one band per host** — the category is a chip on the event — and the chart stays readable.

In the category lanes the host is printed by **name** in the host's own colour, so the machine reads across the whole chart instead of as a bare dot — the same host keeps the same colour in both modes, and a **Machines** key line in the legend decodes the names (omitted in machine-lane mode, where the coloured lane names are the key).

### Long timelines: banding that scales with the span

Vertical separators fall on calendar boundaries, and the **unit adapts to the visible span** so a year-long incident never becomes a grey wall:

| Visible span | Unit | Separators for a 1-year timeline |
|---|---|---|
| ≤ 31 days | day | 365 |
| ≤ 120 days | week | ~52 |
| ≤ ~3 years | month | **12** |
| beyond | year | 1 |

The alternating fill follows the same unit (6 shaded months, not 186 shaded days), the header strip labels the unit (`Thu 9` / `5 Oct` / `Oct 2026` / `2026`), and the faint axis gridlines are dropped when the bands already provide the structure. Zooming in restores day granularity automatically.

## Label strategy (never an unreadable image)

Labels are placed with a deterministic three-tier scheme:

1. Text is **measured** (real rendered widths), never guessed.
2. Overlapping labels are bumped into **slots** (up to 4 per side; 8 in "Always labels" mode).
3. Anything that still cannot fit becomes a **numbered pin** with a full "Event key" legend under the chart.

The **Labels** selector (Auto / Always labels / Numbered / **Both — labels and numbers**) lets the analyst force a strategy. **Both** numbers *every* event in view and keeps the descriptive label beside it, so an analyst can quote "event 14" while the text is still readable; the Event key lists all numbered events. The number sits **inside the dot that marks the event**, so an event is still marked **once** on the timeline — there is no second badge competing for space on a crowded axis — and a thin stem ties that dot to the title.

### Marking event significance

Two controls in the event form decide how an event reads, and they never contradict each other:

| Control | Meaning | Where it shows |
|---|---|---|
| **Malicious — show this event in red** | this one event is malicious | **red in every view** (swimlane, milestones, density) |
| **Event role: Observed / Milestone** | the pivotal event of the case | marked in the event list |

Both are stored in the event's `role` field (`observed`, `milestone`, `fraudulent`, `fraudMilestone`), so they import from JSON/CSV and survive a handover unchanged.

**Red is the analyst's to assign.** Switching on **Malicious** paints the event's marker red in the swimlane, milestones and density, and the chart legend grows a red *Malicious* key so the meaning is never ambiguous. No category or machine colour may use red, so a red mark always means one specific event is malicious. The switch sits at the top of the event form — the one control an analyst reaches for when an event matters — and a malicious event is marked with a red dot in the events table.

The date coins carry no severity: a coin's colour sets the colour of the pills in its column, nothing more.

### Times are never moved

An event's time is evidence, so editing an event must never shift it, and the
timeline must read the same way on every machine. Three things used to break
that, and all three are fixed:

- The timestamp field used to drop the **seconds**, so `09:02:30` came back as
  `09:02:00`. The field now carries seconds (`step="1"`), and the value is
  written back exactly as it was read.
- The field shows a wall clock in the **timeline's** timezone, but it used to
  be read back in the **browser's** timezone. On a UTC timeline opened from a
  UTC+2 browser, every save moved the event two hours earlier. The wall clock
  is now read back in the timeline's own timezone.
- The **Timezone** field was not a timezone at all: anything containing "UTC"
  or "GMT" was read as plain UTC — so `UTC+2` was silently ignored — and
  anything else was read as *the browser's* zone. A pasted UTC dataset could
  therefore appear two hours off, on a machine in a different zone from the
  one the analyst expected.

**The Timezone field is now a real zone.** It takes `UTC`, a fixed offset
(`UTC+2`, `GMT-05:30`) or an IANA name (`Europe/Berlin`,
`America/New_York`), and the wall clock on screen is computed from it. An
unrecognised label falls back to UTC rather than to the browser's zone, so
the chart reads the same everywhere. The footer repeats the zone in force, and
importing data whose stamps carry a `Z` while the timeline is read in another
zone says so out loud.

An ISO-8601 stamp that carries its own zone (`2026-02-03T12:13:25Z`,
`...+02:00`) is read absolutely, exactly as written — never as local time.

A saved event's timestamp and end time are therefore bit-for-bit identical to
what they were before the save.

### Importing what analysts actually export

**Timestamps must be in UTC.** The import dialog says so in as many words:
write them as `2026-02-03T12:13:25Z`, where the trailing `Z` marks UTC. A
stamp with no zone marker is read as UTC — and the import says how many rows
were like that — while a stamp with an offset (`+02:00`) is read as that
offset. The timeline's own **Timezone** only changes the wall clock on
screen; it never changes the instant stored.

- A **machine name** column is recognised (`machine name`, `host name`,
  `device name`, …), not just `machine`.
- A **duration** column (`0d 00:56:18`, `1h 12m`, `45 min`, `2.5 h`) becomes
  the event's end time. Free text — "momentary burst", "record only" — is
  left alone rather than guessed at.

If a column is left with only neutral events it stays entirely blue and gold — colour is never forced for variety. Red is used only where it is accurate, because management reads it as the bad-actor moment.

- Report metadata: title, case ID, analyst, timezone label.
- Categories: **Add** opens a picker of predefined phases (Initial Access, Execution, Command & Control, …) or a custom name + color; rename, recolor, delete (events are reassigned), toggle on/off via the legend chips.
- Machines: one row per host with its event count and a color swatch to override the automatic color (double-click to reset).
- Events: add / edit / delete / hide / duplicate-free table with sorting; each event carries title, start/end, category, source, **machine/host**, description, confidence and an **event role**. Every edit is undoable (**Ctrl+Z** or the Undo button).
- Work is autosaved to `localStorage`; reopening the page restores your session.

## Export

- **Export PNG** — 2x-scale raster of the report (title block, legend, timeline, event key, footer) in the active theme.
- **Copy image** — same raster straight to the clipboard (Chromium-based browsers).
- The exported footer is stamped with the tool version (`FTV v1.1.0`) and a generation timestamp, so a report image records which build produced it.
- The interactive HTML file itself is also shareable as an attachment — recipients get full tooltips, zoom, and filters.

## Sharing a timeline with another analyst

**Export JSON** writes a `.ftv.json` file; **Copy JSON** puts the same payload on the clipboard for pasting into a ticket or chat. The recipient imports it with the usual **Import** button and gets back not just the events but the *presentation* you built:

```json
{
  "format": "ftv-timeline", "schema": 1, "ftvVersion": "1.1.0",
  "title": "...", "caseId": "...", "analyst": "...", "timezone": "UTC",
  "view": { "mode": "swimlane", "labelMode": "auto", "groupBy": "machine",
            "machineColors": { "SRV-FS-02": "#7d3c98" } },
  "categories": [ { "id": "...", "label": "...", "color": "#...", "enabled": true } ],
  "events": [ { "id": "...", "timestamp": "2026-10-09T08:52:00.000Z", "end": "...",
                "title": "...", "description": "...", "category": "...",
                "source": "...", "machine": "WKSTN-114",
                "confidence": "confirmed", "hidden": false } ]
}
```

Carried across: every event field including `machine`, `confidence`, `hidden` and durations; category colours and enabled state; the layout mode, label strategy and lane grouping; and any machine colour overrides. Timestamps are ISO-8601 UTC, so the round trip is exact.

Backwards compatible: a colleague running an older build still imports the events and categories — the extra `view` block is simply ignored. The test suite asserts that export → import → export is byte-identical.

## Version

The current release is **1.14.0**. The version appears in the toolbar next to the `FTV` brand and in every exported image's footer. It is defined once in `index.html` (`APP_VERSION`), mirrored in `package.json`, and the test suite asserts the two agree so they cannot drift.

See [CHANGELOG.md](CHANGELOG.md) for the release history.

## Privacy

No external dependencies, no CDNs, no analytics, no network requests of any kind. Safe for case data.

## Development

The shipped artifact is `index.html` — a single self-contained file with no build step and no runtime dependencies. The `package.json` and `test/` directory exist only for development; they are never loaded by the app.

```bash
npm install     # installs jsdom (dev-only, not shipped)
npm test        # runs the jsdom smoke suite against index.html
```

The suite boots the real page in jsdom with SVG/text-measurement stubs and asserts import behaviour, all three layout modes, machine grouping and machine colors, confidence styling, adaptive banding on long spans, the JSON round trip, undo, autosave, themes, and the version stamp. A GitHub Actions workflow (`.github/workflows/ci.yml`) runs it on Node 20 and 22 for every push and pull request.

## Verification

Tested paths: JSON/CSV/TSV import (including quoted fields and bad rows), the three layout modes, swimlane category/machine grouping, the framed lane column and its heading, every lane framed in its own colour, the number inside the dot, one leader stem per labelled event, staggered dots for events minutes apart, per-machine colors and lane tints, the machine name printed in the machine's colour and the machine key, the malicious switch turning an event red and taking the red away again, clicking a dot opening the editor on that event, **a saved event keeping its exact timestamp and duration — to the second and in the timeline's own timezone — whatever the browser's timezone is**, adaptive band units (day/week/month/year) with bounded separator counts on long spans, duration bars, confidence encoding across markers/pins/bars, zoom in/out including symmetric unwind and non-persistence of the zoom window, edge events at both the left and the right keeping their text inside the plot frame, valid card geometry in every mode, light/dark themes, PNG export, JSON export with an idempotent round trip, category add/delete, undo, version stamping, and offline use via `file://`.

## License

MIT — see `LICENSE`.
