# Changelog

All notable changes to this project are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/);
versioning follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.14.0] - 2026-11-13 (public build)

This is the **public build** of the Forensic Timeline Visualizer: the swimlane,
the milestones and the density views, with the management-slide view removed.
Everything else — the self-laying lanes, the numbers inside the dots, the
red-for-malicious coding, the time handling, the timezone dropdown, the time
range and the drag-to-pan — is the same.

### Removed

- **The management-slide view.** The 16:9 executive presentation is not part
  of this build: the button, the slide engine, the company-logo upload that
  only existed for it, and the slide tests are all gone.

## [1.1.3] - 2026-10-22

### Fixed

- **Text was still hidden for an event at the very right of the chart.** The
  earlier edge fix reserved room on the left only. In swimlane mode the label
  is drawn to the *right* of its marker and can be up to 270px wide, so an
  event near the right frame had no room: the renderer silently replaced the
  text with a numbered pin, and in the other modes the card was pushed out of
  alignment with its marker. The covered time range is now extended on the
  right as well, sized from the label that actually has to fit, and the pixel
  margins are recomputed against the current scale so the reserved space is
  accurate at any zoom level. Labels at the right edge now render in full
  instead of being truncated away or swapped for a pin.

## [1.1.2] - 2026-10-22

### Fixed

- **The zoom-in and zoom-out buttons did not behave as expected.**
  - *Zoom out was a no-op.* The zoom window was clamped back to the data
    extent, so widening the view could never produce a wider view: the range
    stopped growing after a single click. The window is no longer clamped, so
    the button keeps widening the timeline as it should.
  - *Zooming in could push the analyst's data off the chart.* The zoom was
    anchored on the arithmetic centre of the window, which is empty space when
    events are clustered. It is now anchored on the median event in view, so
    the data being examined stays centred and visible.
  - *A stale zoom was restored on reload.* The zoom window was written to
    `localStorage`, so reopening the page could present a fraction of the
    timeline with no obvious way back. The zoom is now a working view only and
    is no longer persisted.
  - A zoom level indicator was added beside the buttons (100% = the whole
    timeline) and clicking it resets the view, so the current state is visible
    at a glance.
- **Event cards in Milestones and Density were drawn at an invalid position.**
  The slot layout returned no width for a placed card while the renderers read
  that width, so every card was emitted with `x="NaN"` and
  `width="undefined"`. In the browser the cards collapsed on top of each
  other at the left edge of the chart instead of appearing beside their
  markers. Cards are now positioned and sized correctly.
- **Events at the very edge of the timeline lost their text.** The covered time
  range is now extended slightly so an event sitting at the extreme left keeps
  its label inside the plot frame and its card stays aligned with its marker,
  instead of being clipped or shoved out of alignment.

## [1.14.0] - 2026-10-29

### Changed

- **The slide's text boxes expand to fit their titles.** A title that needs
  more lines than the column offered no longer gets cut off at three lines:
  its box grows downwards and the words are shown in full. The column is
  planned around those taller boxes, so the growth is measured before the
  layout is committed.
- **The slide's planner now works in a clear order.** The boxes take the
  lines their titles need; if the column cannot afford that, the titles are
  shortened with an ellipsis and the plates and gaps tighten; only if even
  one line per event will not fit is the day split into sub-columns. Nothing
  is dropped either way.
- **The text boxes hug their text.** A box is as tall as its title needs, so
  the columns are no longer padded with empty lines, and the pins above them
  keep the band they are drawn in.

Suite grows to 249 assertions.

## [1.13.1] - 2026-10-26

### Changed

- **The timezone dropdown moved to the top of the dashboard.** The **Zone**
  selector now sits in the toolbar, right after the version chip, where it is
  always visible instead of buried in the editor panel. Choosing a zone still
  recalculates every time on the chart, and the control stays available in the
  slide view, which is drawn in the same zone.

## [1.13.0] - 2026-10-26

### Added

- **Drag the chart sideways to move through time.** Left to look earlier, right
  to look later, anywhere on the plot — over the lanes and over the events. A
  click without movement still opens the event; a drag never does.
- **The category sub-lanes are back inside each machine plate.** The plate is
  the machine, the sub-lanes inside it are the categories — so both
  dimensions stay readable without the chart multiplying into a row for every
  host-and-category pair.

### Changed

- **The lane reads from the upper left.** The time line now runs along the
  **top** of the lane and the titles hang below it in rows, so the earliest
  event is the top-left one and every later event steps **down and to the
  right**. The chart reads in the same order as the case happened.
- **Zooming reaches the seconds.** Zooming in steps through the natural units
  of time instead of a fixed ratio, and the window can narrow to about a
  second and a half — enough to separate two events that started a second
  apart. Zooming back out unwinds the way it came and returns the analyst to
  the exact window they left.

Suite grows to 247 assertions.

## [1.12.0] - 2026-10-26

### Added

- **Seconds are resolved in the swimlane.** Inside half an hour the axis
  ticks read `HH:MM:SS` and every label carries its exact second in front of
  the title, so two events half a minute apart are never confused.
- **A time range selector.** The **Range** fields in the toolbar limit the
  chart to a window of time: only what falls inside is drawn, the zoom may
  only narrow further within it, and the title block says *"Showing … only"*
  so a chart that covers part of the case never reads as the whole case.
  **All** clears it.
- **A timezone dropdown.** The *Timezone* field is now a list of zones
  (`UTC`, fixed offsets, IANA region names, plus an *Other…* field). Choosing
  one **recalculates every time on the chart** — the instants stored never
  move, but they are shown in that zone's wall clock.
- **The import says what it needs.** The import dialog states in as many
  words that **timestamps must be in UTC** (`2026-02-03T12:13:25Z`, the
  trailing `Z` marking UTC), the paste box repeats it, and an import whose
  rows carry no zone marker reports how many there were.

### Changed

- **The machine lanes are plates.** Each host gets its own rounded plate,
  framed in the host's colour, standing apart from the next — the horizontal
  rules that used to run between the lanes are gone.

### Fixed

- **A duration bar no longer drags the zoom window out to its end.** Zooming
  into a window that overlapped a long-running event stretched the chart to
  the event's end, which made the seconds impossible to see.

Suite grows to 242 assertions.

## [1.11.0] - 2026-10-26

### Fixed

- **The Timezone field is now a real timezone.** It used to be a decoration:
  anything containing "UTC" or "GMT" was read as plain UTC — so `UTC+2` was
  silently ignored — and anything else was read as *the browser's* zone. A
  pasted UTC dataset could therefore appear hours off, and the same file
  read differently on two machines. The field now takes `UTC`, a fixed offset
  (`UTC+2`, `GMT-05:30`) or an IANA name (`Europe/Berlin`), an
  unrecognised label falls back to UTC instead of the browser's zone, and
  importing data whose stamps carry a `Z` into a timeline read in another
  zone says so out loud.
- **An ISO stamp that carries its own zone is read absolutely.**
  `2026-02-03T12:13:25Z` is now parsed as exactly that instant instead of
  relying on the browser's date parser.
- **A `machine name` column is recognised** (`machine name`, `host name`,
  `device name`, …), not just `machine` — so a host column that reads
  "machine name" no longer imports empty.
- **A `duration` column becomes the end time** (`0d 00:56:18`, `1h 12m`,
  `45 min`, `2.5 h`). Free text such as "momentary burst" is left alone
  rather than guessed at.

### Changed

- **The lane's colour reaches the name column.** A lane is now one band from
  the name column to the right-hand edge, so the name on the left and the
  events on the right wear the same colour, and the band is framed in it.
- **One band per host.** The machine lanes used to be split again per
  category, so five hosts and five categories grew fifteen horizontal lanes.
  There is now one band per host — the category rides on the event as a chip
  of its own colour — and the host's colour covers the band, the name, the
  markers and the duration bars.

Suite grows to 236 assertions.

## [1.10.0] - 2026-10-26

### Fixed

- **Tagging an event no longer moves its time.** Saving an event used to
  rewrite its timestamp twice over: the form's wall clock dropped the
  **seconds** (`09:02:30` became `09:02:00`), and it was read back in the
  **browser's** timezone instead of the timeline's own. On the built-in UTC
  demo opened from a UTC+2 browser, tagging an event malicious moved it
  **2 hours and 30 seconds earlier**. The form now carries seconds, the wall
  clock is parsed in the timeline's timezone, and a saved event comes back as
  the exact instant it was — whatever the browser's timezone is.

### Changed

- **The host is named, not dotted.** In the category lanes each event is now
  followed by the **machine's name in the machine's colour**, so the host
  reads across the whole chart instead of as a bare dot. The machine lanes
  keep their dot, because the block already says which host it is.
- **Frames, not just washes.** The lane column is now a **framed panel**
  instead of a flat surface with a divider, and every lane and every machine
  block is **framed in its own colour**, so one block never bleeds into the
  next.

## [1.9.0] - 2026-10-26

### Added

- **Red is now a switch an analyst can reach.** A prominent **"Malicious —
  show this event in red"** control sits at the top of the event form, and it
  drives the existing `role` field, so the JSON stays schema-1 compatible.
  The role dropdown keeps only *Observed* and *Milestone*, so the two
  controls can never contradict each other, and a malicious event is marked
  with a red dot in the events table.
- **Clicking a dot opens the editor on that event.** Clicking a marker — or
  its title — selects the event, opens the editor panel if it was closed,
  loads the event into the form, scrolls the form into view and flashes it.
  Clicking the empty plot clears the selection.
- **The swimlane's lane column is now visibly separate from the plot.** The
  machine or category names get their own surface, a **Category** / **Machine**
  heading and a divider, and the lane washes start at that divider.

### Changed

- **The number is inside the dot that marks the event.** In *Both* the number
  no longer sits in front of the title: the dot on the time line carries it,
  so an event is still marked once and no space is taken from an already
  crowded axis. A thin **stem** now runs from every dot to the start of its
  title, so a title that had to move to a distant track is never in doubt
  about which instant it belongs to. The stems are drawn under every label,
  so they never cross a word.
- **Dots that would overlap are staggered.** Two events minutes apart keep
  their true position on the axis and take a row of their own just above or
  below it; the lane grows to make room for them.
- **The slide's timestamp pills follow the coin above them** — blue for the
  even columns, gold for the odd ones, with white type on blue and navy on
  gold. A malicious event keeps its solid red pill (the one deliberate
  exception, because red must always mean the same thing), and a milestone
  keeps a **gold rim** on its pill instead of a gold fill.

## [1.8.0] - 2026-10-26

### Added

- **Red is the analyst's to assign, per event.** An event marked *Fraudulent /
  malicious* is now painted red in **every** view — swimlane, milestones,
  density and the slide — not just on the slide, and the chart legend grows a
  red **Malicious** key so the meaning is never ambiguous. The editor's field
  is now called *Event role* rather than *Slide role*, because it is no
  longer slide-only.
- **The slide now explains its own category squares.** The small coloured
  square in front of each time is the event's category, and a key listing the
  categories with their colours sits centred in the band between the coins and
  the gold strip, above the machine key.

### Changed

- **One mark per event in the swimlane's "both" mode.** An event was drawn as
  two dots: a solid marker on the timeline and a second, numbered circle in
  the label. The number is now a plain bold numeral in front of the label, so
  the event is marked once and no space is taken from an already crowded
  axis. The numeral takes the event's own colour, so a malicious event's
  number is red too.

## [1.7.0] - 2026-10-26

This release carries two sets of work: the swimlane now lays itself out, and
the legend becomes a category switch.

### Added

- **The legend switches categories on and off.** Every category is listed with
  its event count, and clicking one hides it — the chip dims, the count stays
  so you can see how many events are being held back, and the category stays
  in the legend so it can be switched back on. The switch applies to **every**
  view at once: swimlane, milestones, density and the management slide all
  follow it. Each chip carries a tooltip saying what clicking it will do.
- A category's legend count now reflects **all** of its events rather than
  only the visible ones, so a hidden category still shows what it holds.

### Changed

- **Red is reserved for malicious events.** On the management slide, red means
  fraudulent or malicious activity, so nothing else may use it:
  - The category palette and the phase presets are rebuilt around the colour
    wheel with the red band (roughly 0-30 degrees) left out, and the demo's
    own "Initial Access" phase moved from red to amber.
  - Two machine colour slots that were red — a dark red and a red-orange —
    became a violet and a warm taupe.
  - A red picked by hand in the editor is moved out of the red band, with a
    note explaining why.
- **The slide's timestamp always fits its plate.** The type size now scales
  with the plate and the time is centred in it, so a slide with sixteen dates
  (measured: 16 coins, 32 plates) has no overflowing timestamps — the type
  drops to 8.3 px, which is 16.6 px in the 2x export.


### Changed

- **The swimlane now lays itself out.** Previously every lane had exactly two
  rows for labels, so a busy day either overlapped its labels or dumped half
  its events into a pile of numbered pins. Now each lane is **planned before it
  is drawn**: every event is given a label track — a row above or below the
  lane's time line — and the **lane grows taller** to fit the tracks it
  actually needs. An event is only demoted to a numbered pin once a fully
  grown lane has no room left. The same applies to the machine view, where each
  machine block grows with the sub-rows it needs.
- **The "both" mode number travels with the label**, not with the marker, so
  two events a few pixels apart can no longer pile their badges on top of
  each other.
- **Milestones and Density cards now clear the axis date labels.** The first
  card below the axis used to land on the axis's own date labels; the detail
  band now starts clear of them, and the density view drops further when its
  cards above the baseline need the extra room.
- **Milestones cards are slightly taller** (39 px instead of 34) so the title
  and the time row no longer touch.

### Fixed

- Two events at the same instant used to draw their numbered pins on top of
  each other in Milestones and Density. They now get their own line above the
  axis, and the space is reserved so nothing else lands there.

Overlapping text pairs in the demo incident, measured on the rendered page:
Swimlane 1 → 0, Swimlane by machine 1 → 0, Swimlane "both" 13 → 0,
Milestones 8 → 0, Density 2 → 0.

## [1.6.0] - 2026-10-23

### Changed

- **The text boxes carry the same gradient as the coin faces.** A soft
  light-grey wash lit from above replaces the flat fill, so the boxes and the
  date nodes share one visual language. Just as faint as the coin shading
  (248,250,252 at the top of a box down to 237,240,244 at the bottom).
- **The machine key moved to the bottom centre.** The swatches that decode the
  text-box frames now sit centred in the band between the date nodes and the
  gold accent strip, reading as a footer to the timeline rather than
  competing with the header.
- **The gold accent strip is now the same width as the blue base bar** (2%–98%
  of the slide, previously the full 1280 px), so the timeline reads as one
  aligned band from the top rule down to the bottom edge.

## [1.5.5] - 2026-10-23

### Changed

- **The coin faces carry a whisper of shading.** A very light grey gradient,
  lit from above, replaces the flat white, so the date node reads as a slightly
  recessed disc rather than a hole punched in the bar. It is deliberately
  faint — the whole face spans about 16 of 255 levels (251,252,253 at the top
  down to 237,241,244 at the bottom) against a pure white slide, so it never
  competes with the date.

## [1.5.4] - 2026-10-23

### Changed

- **The coin frame is 75% thicker** — 4.2 px instead of 2.4 px, so the date
  nodes read as solid badges rather than hairline outlines. The frame's outer
  edge still sits exactly on the coin's 64 px diameter, and the white face
  now meets the frame's inner edge precisely.

## [1.5.3] - 2026-10-23

### Changed

- **The upper ends of the pins are now scattered.** Each column draws its own
  level from a hash of its date, so the tops read as an irregular skyline
  rather than a ruled line. The scatter is seeded from the dates, so a given
  case always draws the same slide — it does not jitter between renders or
  change when the analyst re-exports the timeline.
- The rule about how high a pin may reach is now measured against **its own
  text box**, so a column of single-line boxes can reach further up than a
  column of tall ones, and the whole band of possible levels is wider.

### Fixed

- The hash behind the scatter had a weak final mix, so consecutive dates
  landed on almost the same level and the ends came out evenly spaced after
  all. It now ends with a proper avalanche step, which spreads similar keys
  apart.

## [1.5.2] - 2026-10-23

### Fixed

- **The pins were still rising too high.** The rule is the *ceiling*: a pin
  may not rise higher than one text-box height **below** the blue header
  rule. v1.5.1 read that the other way round and let the pins come within a
  few pixels of the rule. The ends now sit at least one box height under it
  (measured on the demo incident: 131–175 px against a rule at 106 px), and
  are still staggered from column to column.
- **The pin heads are twice the size** — the round cap at the top of each
  connector grew from 2.6 px to 5.2 px, so it reads as a proper anchor point
  rather than a speck.

## [1.5.1] - 2026-10-23

### Fixed

- **The pin ends now stop within one text-box height of the blue header
  rule.** Previously a pin could end a long way below the rule, leaving the
  band under the header looking empty. The end of each pin is now placed
  inside a band one text-box tall under the rule, still staggered from
  column to column so the tops are not all alike.
- **Text can no longer escape its text box.** The wrapper now hard-breaks a
  word that is longer than the line instead of letting it overflow, the
  available width carries a safety margin, and the box is sized to the text
  that actually landed in it.

### Changed

- A pin's length no longer tracks the height of its column: the pins all now
  reach up to the header, and their *ends* are what vary.

## [1.5.0] - 2026-10-23

### Added

- **Company logo upload.** The analyst can upload a logo in the editor's
  *Report* section (PNG, JPEG, SVG, GIF or WebP, up to 400 KB). It is drawn in
  the **top-right corner of the management slide**, with a dashed
  "COMPANY LOGO" placeholder until one is uploaded, and it travels with the
  exported JSON so another analyst's slide shows the same logo.
- **The pins now rise into the upper band.** Each connector runs from its date
  node up past the content into the empty space under the header, and the
  tops are staggered so every column stops at its own level. Purely
  decorative, but it stops the top of the slide reading as an empty white
  band and gives each column its own silhouette.

### Changed

- **The case ID now sits below the title** on the slide, where it reads as a
  case reference rather than a wordmark. The top-right corner is reserved
  for the company logo.
- **The timestamp pills and text boxes are 25% narrower**, which opens the
  columns up and leaves a clear gutter between them (71 px between
  side-by-side columns on the demo incident).

## [1.4.1] - 2026-10-23

### Changed

- **The machine is now carried by the text-box frame.** The small machine dot
  beside each timestamp pill has been removed; instead the **frame of the
  event's text box is drawn in that machine's colour**, so the machine reads
  straight off the box. Events with no machine keep the neutral grey frame.
  The machine key under the header now uses matching swatches.
- **The coins are 20% smaller** — a 64 px coin instead of 80 px, with the
  frame stroke and the date font scaled to match so the proportions are
  unchanged.
- **The lowest text boxes no longer collide with the coins.** The content
  band now ends a clear gap above the coin, so a column's last box never
  overlaps its date node.

## [1.4.0] - 2026-10-23

### Changed

- **Slide event text now sits in centred text boxes.** Each title is drawn in
  its own box, centred under the timestamp pill and centred within that box.
  Because the boxes are opaque, the connector line that rises from the date
  node now passes **behind** them instead of showing through the glyphs, and
  it no longer has to be kept clear of the text.
- **Coin frames are split.** The coin keeps its white face and the date
  centred on it, but the frame is now coloured on the **upper half**
  (alternating blue `#2AA3E0` / gold `#FFD34D` from the left) and **grey on
  the lower half**, with a hard edge at the coin's midpoint.
- **The lower-right legend has been removed** from the slide.

### Added

- The machine dot now sits beside the timestamp pill rather than inside the
  text, so the title can use the full width of its box.

## [1.3.1] - 2026-10-23

### Fixed

- **Slide coins looked wrong.** v1.3.0 gave each coin a blue-or-gold upper
  half over a grey lower half, which read as a muddy two-tone disc and, on
  blue coins, merged into the blue bar. The **face of every coin is white
  again**; the only thing that changed is the **colour of the outer frame**,
  which alternates blue `#2AA3E0` and gold `#FFD34D` from the left. The date
  is centred on the white face in dark charcoal, and the soft shadow beneath
  the coin is unchanged.

## [1.3.0] - 2026-10-23

### Changed

- **Redesigned the slide's date nodes ("coins")** to the detailed coin
  specification:
  - Every coin is split horizontally at exactly 50% of its height. The upper
    half alternates **blue `#2AA3E0`** and **gold `#FFD34D`** strictly by
    position from the left (1st, 3rd, 5th… blue; 2nd, 4th, 6th… gold), and the
    lower half is always the shaded grey `#BFC5CB`. The split is a hard edge
    with no gradient, and the coloured half is always on top.
  - The coin colour is **purely decorative** — it encodes no event type, no
    severity and no importance. Red remains reserved for fraudulent event
    pills. The milestone is now signalled only by its gold pill.
  - Each coin carries a 3 px cool-grey ring `#C8CDD2` on its outer edge and a
    soft elliptical shadow beneath it (`0 3px 8px rgba(0,0,0,0.25)`), so the
    grey half reads as a shaded base under the lit coloured face.
  - The date is centred across both halves, `DD MMM` over the year, in dark
    charcoal on blue coins and dark navy on gold coins.
- **Coin placement** now follows the specified distribution rule: equal
  centre-to-centre spacing along the bar, inset by an end margin of at least
  12% of the slide width, and the coin shrinks (floor ~58 px) rather than
  touching when the spacing gets tight.
- The event plates were narrowed to the new coin spacing so that adjacent
  columns keep their clearance.

## [1.2.1] - 2026-10-22

### Fixed

- **Labels dropdown** — the "Both" option rendered the literal text `\u2014`; the
  escape sequence was only valid inside a JavaScript string, not in markup.
- **Management slide dropped events** — a date column that overflowed lost
  events ("+4 more"). The slide now carries *every* event the swimlane shows:
  a column gives up title lines and then spacing before anything is dropped,
  and only a pathological day splits into sub-columns.
- **Slide text did not match the swimlane** — the slide showed the event
  description; it now shows the same title the swimlane labels the event with,
  together with the event's category and machine, so the two views carry the
  same information.
- **Slide connector lines ran through the descriptions and over the plates** —
  the pin is now drawn before the plates so it sits behind them, and it ends
  above the text instead of crossing it. Its length follows the amount of
  content in the column, as the design calls for.
- **Slide columns wasted the space under the header** — the clock only blocks
  the top-left corner, so a column now uses the space that is actually free to
  it, which gives dense days room for more of the title.

### Added

- A machine key under the header on the slide, so the machine dots on the
  plates mean something.

## [1.2.0] - 2026-10-22

### Added

- **Management slide view** — a new layout mode that renders the timeline as a
  16:9 slide (1280x720) for executive reporting, following the DFIR
  incident-timeline slide design specification: a `TIMELINE` header with a
  sky-blue rule and a gold wordmark, a decorative two-tone clock, a blue base
  bar with a dashed centreline and a gold bottom strip, circular date "coins"
  centred on the bar, chronological event columns with rounded timestamp
  pills, and a legend of the three event types.
  - Date columns are schematic rather than to time scale, so the slide reads as
    a management summary rather than a Gantt chart.
  - Event-type colour coding is enforced: blue for observed events, gold for
    the milestone, and **red for anything fraudulent or malicious** (red takes
    precedence). The single pivotal date gets a gold coin; a column containing
    only neutral events stays entirely blue, so colour is never forced.
- **Slide role on every event** — a new `role` field (`observed`, `milestone`,
  `fraudulent`, `fraudMilestone`) set in the event form, importable from
  JSON/CSV via a `role`/`significance` column, exported with the timeline, and
  flagged with a badge in the event table.
- **"Both — labels and numbers" label mode** — numbers every event in view
  while keeping the descriptive label beside it, so an analyst can quote
  "event 14" without losing the text. The Event key lists every numbered
  event. Available in all three chart views.

### Fixed

- Milestones and Density in "both" mode dropped the numbered marker for
  events whose card did not fit; every event now keeps a visible number.

## [1.1.1] - 2026-10-22

### Fixed

- **Two machines could share the same color.** Host colors were derived from a
  hash of the machine name, which spreads names over 360 hues at random. With
  only a handful of hosts this regularly put two of them in the same color
  region — a hash of `DC-01` and `DESKTOP-2` yielded hues 147 and 149, and
  more than a tenth of all name pairs landed within 25 degrees of each other.
  Host colors are now allocated from a validated 12-slot palette whose closest
  pair is separated by ~35 CIE ΔE units, so no two machines read as the same
  color in either theme.
- Colors are allocated in name order and stored, so a host keeps its color
  across re-renders, imports, reloads and JSON handovers, and adding a new
  host no longer repaints the machines that already have one. Hosts with no
  machine value share a neutral grey rather than a palette slot.

## [1.1.0] - 2026-10-22

### Added

- **JSON export and import round trip** — a new *Export JSON* button writes a
  `.ftv.json` file and *Copy JSON* puts the same payload on the clipboard, so a
  constructed timeline can be handed to another analyst who imports it into
  their own FTV instance. The payload carries the report metadata, every event
  field (including `machine`, `confidence`, `hidden` and durations), category
  colours and enabled state, the layout mode / label strategy / lane grouping,
  and any machine colour overrides — so the recipient sees the same chart, not
  just the same events. Timestamps are ISO-8601 UTC, making the round trip
  exact. Older builds can still import the file; the extra `view` block is
  ignored.
- **Machine key in the legend** — a compact `Machines ● …` line decodes the
  per-event machine marks. It is omitted in machine-lane mode, where the
  coloured lane names already serve that purpose.
- **`svgText` attribute pass-through** — text elements can now carry arbitrary
  attributes, which the test suite uses to assert on rendered content.

### Changed

- **Symmetric lane colouring.** Whichever dimension owns the lanes now also
  owns the lane colour, and the other dimension stays visible as a mark:
  - Category mode draws the lane name in the category colour and fills the
    lane with a lighter tint of it, replacing the flat alternating grey.
  - Each event in category mode carries a small machine-coloured dot after its
    label, so a host stays identifiable while grouped by category — and the
    same host keeps the same colour in both grouping modes.
  - Milestone cards draw the machine in the card's time row in the machine
    colour; density detail cards carry a machine-coloured edge stripe.
- **Adaptive banding for long timelines.** The vertical separators previously
  drew one line and one alternating fill *per calendar day* regardless of zoom,
  which turned a one-year timeline into a grey wall (372 lines and 186 fills
  in swimlane, 722 and 362 in density). The band unit now scales with the
  visible span — day (≤ 31 days), week (≤ 120 days), month (≤ ~3 years), then
  year — with separators falling on natural calendar boundaries (midnight,
  Monday, the 1st of a month, 1 January) in the report timezone. A one-year
  timeline now shows 12 month separators and 6 shaded months. The header strip
  labels the unit (`Thu 9` / `5 Oct` / `Oct 2026` / `2026`), the faint axis
  gridlines are dropped when the bands already provide the structure, and
  zooming in restores day granularity automatically.

## [1.0.0] - 2026-10-22

First tagged release. Single-file HTML app, no build step, no network access.

### Added

- **Import** three ways, auto-detected: JSON (full document or bare event array),
  CSV, and TSV/clipboard paste. Quoted fields supported; malformed rows are
  skipped and reported per row number rather than silently dropped.
- **Three layout modes**: Swimlane (lanes per category), Milestones (single axis
  with event cards), and Density (stacked histogram plus a zoomable detail band
  with drag-to-zoom brush).
- **Machine grouping** in the Swimlane: a Lanes selector switches between
  Category and Machine. Machine mode gives each host its own block with a
  per-category sub-row, so activity is separated by host while categories stay
  visible. Events without a host collect under a "(no machine)" block.
- **Per-machine colors**: each machine gets a deterministic color derived from a
  hash of its name, so a host keeps its color across renders, imports, and
  reloads. The machine name is drawn in that color and its lane is filled with a
  lighter tint of the same color. The editor's Machines section lists every host
  with a swatch to override the color; double-clicking the swatch resets it.
- **Event model**: point-in-time events plus optional start–end durations drawn
  as bars; per-event title, description, category, source, machine/host, and
  confidence.
- **Confidence encoding** everywhere a shape appears: markers are solid /
  hollow ring / dashed ring; numbered pins carry the same three ring styles;
  duration bars step from opaque to faint to dashed.
- **Deterministic label placement**: measured text widths, greedy slot
  allocation, and a numbered-pin fallback with an "Event key" legend, so dense
  timelines stay readable instead of overlapping.
- **Editor panel**: report metadata, categories (rename, recolor, delete with
  reassignment, toggle via legend chips), an Add flow with 17 predefined phase
  presets plus custom name + color, machines, and a sortable event table.
- **Undo** (Ctrl+Z or the Undo button) for all editing operations.
- **Autosave** to localStorage; reopening the page restores the session.
- **Export**: PNG at 2x scale and a "Copy image" action, both in the active
  theme, stamped with the tool version in the footer.
- **Light and dark themes**, with a day-separation layer in every mode (day
  header strip, alternating day shading, midnight boundary lines).
- Built-in 24-event demo incident (IR-2026-042) and matching `samples/` files.

### Project

- Single-file distribution: `index.html` is the whole application.
- jsdom-based smoke suite (`npm test`) covering import, all three modes,
  machine grouping and colors, confidence styling, undo, autosave, themes, and
  the version stamp. Currently 75 assertions.
- GitHub Actions workflow running the suite on Node 20 and 22.
- MIT license.
