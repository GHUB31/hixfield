---
name: Hixfield
description: A night grading suite for AI cinematography — the preset gallery is the interface.
colors:
  ink-950: "#09090b"
  ink-900: "#0e0e11"
  ink-850: "#121216"
  ink-800: "#17171d"
  ink-700: "#26262e"
  ink-600: "#34343e"
  ink-400: "#71717e"
  ink-300: "#9c9ca8"
  ink-100: "#e9e9ec"
  ink-50: "#f5f5f7"
  lime-400: "#ccff00"
  lime-300: "#dbff4d"
  lime-600: "#9dc400"
  danger: "#ff6161"
  amber: "#ffc24d"
typography:
  display:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "clamp(3.5rem, 11vw, 8.5rem)"
    fontWeight: 700
    lineHeight: 0.92
    letterSpacing: "-0.025em"
    fontVariation: "'wdth' 125"
  headline:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "1.875rem"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-0.025em"
  title:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "-0.025em"
  body:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.625
    letterSpacing: "normal"
  label:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: "normal"
  data:
    fontFamily: "Spline Sans Mono, ui-monospace, monospace"
    fontSize: "11px"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "0.025em"
    fontFeature: "tabular-nums"
rounded:
  md: "6px"
  lg: "8px"
  xl: "12px"
  full: "9999px"
spacing:
  xs: "6px"
  sm: "12px"
  md: "16px"
  lg: "20px"
  xl: "24px"
  2xl: "40px"
  section: "80px"
components:
  button-primary:
    backgroundColor: "{colors.lime-400}"
    textColor: "{colors.ink-950}"
    rounded: "{rounded.lg}"
    height: "40px"
    padding: "0 16px"
  button-primary-hover:
    backgroundColor: "{colors.lime-300}"
  button-primary-off:
    backgroundColor: "{colors.ink-800}"
    textColor: "{colors.ink-400}"
    rounded: "{rounded.lg}"
    height: "40px"
    padding: "0 16px"
  button-secondary:
    backgroundColor: "{colors.ink-800}"
    textColor: "{colors.ink-50}"
    rounded: "{rounded.lg}"
    height: "40px"
    padding: "0 16px"
  button-ghost:
    textColor: "{colors.ink-300}"
    rounded: "{rounded.lg}"
    height: "40px"
    padding: "0 16px"
  input:
    backgroundColor: "{colors.ink-900}"
    textColor: "{colors.ink-50}"
    rounded: "{rounded.lg}"
    height: "40px"
    padding: "0 14px"
  card:
    backgroundColor: "{colors.ink-900}"
    rounded: "{rounded.xl}"
    padding: "20px"
  status-badge:
    typography: "{typography.data}"
    rounded: "{rounded.full}"
    padding: "2px 10px"
  preset-card:
    backgroundColor: "{colors.ink-900}"
    rounded: "{rounded.xl}"
---

# Design System: Hixfield

## Overview

**Creative North Star: "The Night Grading Suite"**

Hixfield is a color-grading room after hours: layered near-blacks under hairline borders, one lime signal, and a gallery of looping camera-motion previews doing the talking. The preset gallery IS the interface — the product's beauty is the catalog itself, so chrome recedes into flat ink panels and the generated media carries the visual weight. The system explicitly refuses the SaaS-dashboard arrangement: no stat cards, no hero metrics, no decorative gradients.

Two voices speak. Archivo (a variable face with its width axis loaded) is the human voice — the wide-set HIXFIELD wordmark, headlines, prose, labels. Spline Sans Mono is the machine voice, reserved strictly for data: timecodes, elapsed seconds, seeds, credit costs, job ids, status labels, shell commands. Depth comes from ink layering, not shadows; life comes from the media (hover-play video tiles, a recording-lamp pulse on jobs in flight), not from ornament.

There is exactly one theme. The root declares `color-scheme: dark` and no light palette exists anywhere in the build — this is a deliberate commitment to a single dark look, not an omission. Do not add a light mode.

**Key Characteristics:**
- Layered near-black surfaces (#09090b → #17171d) separated by 1px hairlines, never by shadows
- One accent — lime #ccff00 — used as state in the studio, committed at page scale only once, on the landing
- Two faces with a hard boundary: Archivo for language, Spline Sans Mono for data
- Motion grammar of exactly two devices: the staggered rise entrance and the recording-lamp pulse
- Media-first: preset cards are looping video tiles; text sits on gradient scrims over the footage

## Colors

A ten-step near-black "ink" scale carries the whole room; one lime signal cuts through it; amber and red exist only to report job states.

### Primary
- **Signal Lime** (#ccff00, `lime-400`): the single accent. In the studio it marks state — the selected preset's ring and tag, the active nav item, the primary button, the focus outline, the text caret, text selection, the completed-job badge. On the landing it commits once at page scale as the full-bleed "Run it tonight" section (`bg-lime-400` with ink-950 text).
- **Signal Lime Hover** (#dbff4d, `lime-300`): hover state of lime-filled elements; also the text tint while dragging over a drop zone.
- **Worn Lime** (#9dc400, `lime-600`): the filled (elapsed) portion of playhead slider tracks — dimmer than the thumb so the thumb stays the brightest point.

### Neutral
- **Stage Black** (#09090b, `ink-950`): the page ground, scrollbar track, and the text color on any lime fill.
- **Panel Black** (#0e0e11, `ink-900`): cards, form panels, inputs, the segmented-control shell.
- **Well Black** (#121216, `ink-850`): media wells behind video thumbnails; nav hover fill.
- **Raised Black** (#17171d, `ink-800`): secondary buttons, active nav fill, inline-code chips, the disabled-primary "off" fill.
- **Hairline** (#26262e, `ink-700`): the 1px border on nearly every surface; resting slider track; off switch track.
- **Hairline Hover** (#34343e, `ink-600`): border brightening on hover; disabled slider thumbs; canceled-state dots.
- **Dim Meta** (#71717e, `ink-400`): placeholders, help text, captions, provenance notes, inactive mobile-nav items.
- **Secondary Text** (#9c9ca8, `ink-300`): field labels, body copy on panels, ghost buttons, slider value readouts.
- **Bright Text** (#e9e9ec, `ink-100`): prose sitting on media scrims and code blocks.
- **Paper White** (#f5f5f7, `ink-50`): headings, primary text, the wordmark.

### Status
- **Render Amber** (#ffc24d, `amber`): jobs queued or rendering; the missing-API-key lamp; the keys banner.
- **Fail Red** (#ff6161, `danger`): failed and NSFW-flagged jobs, destructive buttons, form errors. Always applied as tinted fills (`danger/10` bg, `danger/30` border) with the full-strength color reserved for text and dots.

### Named Rules
**The One Signal Rule.** Lime is the only accent, and in the studio it only ever means state: selection, activity, the primary action, focus. It never decorates. Page-scale lime belongs to the Persuade surface (the landing's "Run it tonight" block) alone; no Operate surface floods it.

**The Tinted-Status Rule.** Status colors render as a 10% fill + 30% border + full-strength text and dot (`text-amber border-amber/30 bg-amber/10`), never as solid chips.

## Typography

**Display/Body Font:** Archivo (variable, `wdth` axis loaded; system-ui fallback)
**Data Font:** Spline Sans Mono (ui-monospace fallback)

**Character:** A grotesque that can physically widen for the marquee moments, against a mono that reads like a timecode burn-in. The pairing is technical without being cold: Archivo talks, Spline Sans Mono reports.

### Hierarchy
- **Display** (700, `clamp(3.5rem, 11vw, 8.5rem)`, line-height 0.92, tracking-tight, `font-stretch: 125%`): the HIXFIELD wordmark-as-hero on the landing. The width axis, not extra weight, is what makes it loud.
- **Headline** (600, 1.875rem → 2.25rem at `sm`, tracking-tight): landing section headings. The lime block's heading steps up to 700 at `font-stretch: 115%`.
- **Title** (600, 1.5rem → 1.875rem at `sm`, tracking-tight): studio page titles ("Create video", "Library").
- **Body** (400, 0.875–1rem, line-height 1.625): panel copy in ink-300; prose over media scrims in ink-100. Landing intro copy runs 1.125–1.25rem.
- **Label** (500, 13px): form-field labels in ink-300; help and error lines match the 13px size.
- **Data** (400, 11–13px, tracking-wide, tabular figures): everything mono — see the rule below. Tabular numerals are enforced globally on `.font-mono`, `code`, and `kbd`.

### Named Rules
**The Mono-Is-Data Rule.** Spline Sans Mono is strictly for machine truth: timecodes and elapsed seconds, seeds, credit costs, job ids, status-badge labels, endpoint paths, selection tags (A/B), env vars and shell commands, provenance captions. It never sets a heading, a sentence of prose, or a button label.

**The Width-Axis Rule.** Archivo's `wdth` axis is the expressive range. The wordmark sets at `font-stretch: 125%` everywhere it appears (hero, nav, footer, sidebar); one landing headline uses 115%. Expression comes from width at these marquee moments — not from new faces, italics, or ultra weights.

## Layout

Two shells share one content spine (`max-w-6xl`, 1152px).

- **Landing (Persuade):** full-bleed sections stacked vertically; the hero is `min-h-[94svh]` with its content anchored to the bottom edge. Horizontal padding 20px → 40px at `sm`; section rhythm `py-20 sm:py-28` (80 → 112px). Sections separate by hairline top borders or a tonal shift to `ink-900/40` — never by shadow.
- **Studio (Operate):** a fixed 224px sidebar on `lg` (`lg:pl-56` on the shell), replaced below `lg` by a fixed bottom tab bar (6 items, safe-area padded, `ink-950/95` + backdrop blur). Main column: `max-w-6xl`, px 16 → 24 → 40px, `pb-28` on mobile to clear the bar.
- **Working grids:** 12-column split on Create video (gallery `lg:col-span-7`, form `lg:col-span-5`, gallery ordered first on mobile); 16px gaps (`gap-4`) throughout; the Soul gallery uses CSS columns (2 → 3) for the masonry.
- **Spacing rhythm:** 6px label-to-control; 16px grid gaps; 20–24px card padding (`p-5`/`p-6`); 40px heading-to-content (`mt-10`); 80/112px section padding.

**The One-Entrance Rule.** Each page gets exactly one authored entrance: the header block and its siblings ride `animate-rise` (0.65s, `cubic-bezier(0.16, 1, 0.3, 1)`, 14px rise) with `rise-1`…`rise-5` staggers at 60ms steps. Nothing else animates on load, and `prefers-reduced-motion` collapses all animation globally.

## Elevation & Depth

The system is tonal, not shadowed. Depth is read from the ink ladder — 950 ground, 900 panel, 850 well, 800 raised — with a 1px `ink-700` hairline at every boundary, brightening to `ink-600` on hover. Media gets legibility from gradient scrims (`from-ink-950/95 via-ink-950/60 to-transparent`), not from overlays with shadows.

### Shadow Vocabulary
- **Signal glow** (`box-shadow: 0 2px 12px rgba(204,255,0,0.15)`): under lime primary buttons only — an emissive halo, not a drop shadow.
- **Console drop** (`box-shadow: 0 16px 48px rgba(9,9,11,0.35)`): the landing's terminal block floating on the lime section — the one place a surface sits on a bright ground.
- **Thumb shadow** (`box-shadow: 0 1px 6px rgba(0,0,0,0.6)`): grounds the 5×18px playhead thumb on its 3px track.

### Named Rules
**The Hairline Rule.** Surfaces never cast shadows on the dark ground. Separation is a 1px `ink-700` border plus a tonal step; the three shadows above are the entire vocabulary.

**The Recording-Lamp Rule.** Work in flight pulses like a tally lamp: `animate-lamp` (1.6s ease-in-out, opacity 1 → 0.35 → 1) on a 6px status dot — rendering jobs, the missing-key chip, characters in training. Inline waits (button loading, uploads) use the small stroke spinner instead; the lamp is reserved for live jobs and unresolved setup.

## Shapes

Rectangles with quiet corners, in exactly four radii: 6px (`rounded-md`) for small controls and selection tags, 8px (`rounded-lg`) for buttons, inputs, and nav items, 12px (`rounded-xl`) for cards, panels, and media figures, and full-round for status pills, dots, and the switch. Borders are always 1px; the only dashed border in the system is the upload drop zone. Focus is a 2px lime outline offset 2px, applied globally via `:focus-visible`. No pill-shaped buttons, no sharp-cornered panels, no clipped or slanted geometry.

## Components

### Buttons
- **Shape:** quiet corners (8px; 6px at the `sm` size); heights 32 / 40 / 48px.
- **Primary:** Signal Lime fill, ink-950 semibold text, the signal glow shadow; hover lifts to lime-300; `active:translate-y-px` gives a 1px physical press.
- **The Explicit-Off Rule.** A disabled primary is never a dimmed lime button: it re-renders as explicitly off — `ink-800` fill, `ink-700` border, `ink-400` semibold text. Only non-primary variants use 50% opacity when disabled.
- **Secondary:** `ink-800` fill with `ink-700` hairline; hover brightens both. **Ghost:** text-only, ink-300 → ink-50 on hover with an `ink-800` fill. **Danger:** tinted red (`danger/10` fill, `danger/30` border).
- **Loading:** a 16px stroke spinner inline with the label.

### Preset Card (the signature component)
A camera preset as a looping video tile — the component the whole world is built around.
- **Shape:** 12px radius, `ink-900` base, media well in `ink-850`, 16:9 by default.
- **Playback:** desktop plays on hover/focus (scale 1.03 over 500ms); touch devices autoplay while in view; `prefers-reduced-motion` gets the still first frame. Videos lazy-load via IntersectionObserver (240px margin) so a 50-tile gallery stays light.
- **The Lime-Ring Selection Rule.** Selected = `border-lime-400` plus a 1px lime ring, plus a 24px lime square at the top-right carrying the selection tag in mono ("A"/"B" when two motions stack). Unselected hover only brightens the hairline to `ink-600` — hover never impersonates selection.
- **Caption:** name and description on a bottom gradient scrim (`from-ink-950/95`).

### Status Badge
Mono 11px pill (full-round, tinted per the Tinted-Status Rule) with a 6px dot; the dot runs the recording-lamp pulse while a job renders. Amber = queued/rendering, lime = done, red = failed/NSFW, ink = waiting/canceled.

### Inputs / Fields
- **Style:** `ink-900` fill, `ink-700` hairline, 8px radius, 40px height; placeholder in ink-400; labels 13px/500 in ink-300 with 6px gap.
- **Focus:** border shifts to `lime-400/70` (outline suppressed inside fields; the global lime `:focus-visible` outline covers everything else). Caret is lime.
- **Error / Help:** one 13px line below — danger red for errors, ink-400 for help; error replaces help.
- **Select:** same control skin with an inline stroke chevron.

### Playhead Slider
The strength control styled as a timeline playhead: 3px track (elapsed portion in Worn Lime via a gradient, remainder `ink-700`), a 5×18px rectangular lime thumb with the thumb shadow, and the numeric value rendered beside it in mono (`toFixed(2)`). Disabled thumbs turn `ink-600`.

### Switch / Segmented
- **Switch:** 36×20px track — lime with an ink-950 knob when on, `ink-700` with an ink-300 knob when off.
- **Segmented:** hairline `ink-900` shell with 4px inner padding; the active option gets `ink-700` fill + lime text. Hover deliberately stops short of white so only the lime treatment ever reads as selected.

### Empty State
**The Empty-States-Teach Rule.** Every empty state teaches the first run: one icon in lime at 80% opacity, a one-line title, at most one short body, one action — centered in a hairlined `ink-900` panel. Used across every studio surface (no keys, no catalog, no jobs yet).

### Media Upload
Dashed `ink-600` drop zone; dragging over it flips the border to lime with a `lime-400/5` wash; a filled zone shows the asset with a floating remove button on an `ink-950/80` blur chip.

### Navigation
Desktop: fixed 224px `ink-950` sidebar, hairline right edge; items are 8px-radius rows — active gets `ink-800` fill + lime text, inactive ink-300 with `ink-850` hover. Mobile: six-column bottom bar, active items simply turn lime. The API chip in the sidebar reports connection state in mono with a status dot (lamp-pulsing amber when keys are missing).

## Do's and Don'ts

### Do:
- **Do** build depth from the ink ladder (950 ground → 900 panel → 850 well → 800 raised) under 1px `ink-700` hairlines that brighten to `ink-600` on hover.
- **Do** set every number and identifier — seconds, seeds, credits, job ids, statuses, commands — in Spline Sans Mono with tabular figures.
- **Do** give each page exactly one entrance: `animate-rise` with `rise-1`…`rise-5` staggers, and nothing else on load.
- **Do** mark selection with the lime ring + mono tag, activity with the recording-lamp pulse, and a disabled primary as explicitly off (`ink-800` fill, `ink-400` text).
- **Do** ship a same-name `.json` provenance sidecar (prompt + createdAt) beside every generated raster and clip in `public/media/`, and caption generated media honestly on the page.
- **Do** put text over footage on a `from-ink-950/95` gradient scrim, and honor `prefers-reduced-motion` (stills instead of loops; the global animation kill stays).

### Don't:
- **Don't** add a light theme — the build commits to a single dark look (`color-scheme: dark`) and defines no light palette.
- **Don't** use lime decoratively in the studio; it means state (selection, active, primary action, focus). Page-scale lime exists only on the landing's closing block.
- **Don't** arrange stat cards, hero metrics, or dashboard tiles — the world's founding refusal.
- **Don't** cast drop shadows for separation; the only shadows are the lime CTA glow, the landing console drop, and the playhead-thumb shadow.
- **Don't** introduce radii beyond 6 / 8 / 12px / full, a second accent hue, or a third typeface.
