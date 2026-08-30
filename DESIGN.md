# Design

The visual system for OYC. Tokens live in [`src/ui/theme.ts`](src/ui/theme.ts) and primitives in [`src/ui/components.tsx`](src/ui/components.tsx); this file explains the reasoning so the system survives being edited by someone who wasn't here.

## Theme

Restrained. Tinted neutrals carry almost everything; colour is reserved for state and for the one number that matters. The app frequently delivers bad news, so nothing is celebratory and nothing is softened — red means the truth here, not alarm.

Both schemes are first-class. Dark is not a lightened flip of light: each has its own steps, verified separately.

## Colour

Neutrals are tinted very slightly toward the brand's blue rather than defaulting warm.

### Light

| Token | Value | Role |
|---|---|---|
| `background` | `#F2F5F9` | Page |
| `surface` | `#FFFFFF` | Cards, groups |
| `surfaceAlt` | `#EAEFF6` | Inputs, segmented tracks |
| `border` | `#D6DEEA` | Hairlines |
| `text` | `#0B1B2E` | Primary ink — 15.0:1 |
| `textMuted` | `#48586E` | Secondary — 6.3:1 |
| `textFaint` | `#5B6A80` | Captions, hints — 4.8:1 |
| `accent` | `#125EA8` | Primary action, links, selection |
| `pass` / `stretch` / `fail` | `#177140` / `#8A5300` / `#B3261E` | Verdict state |

### Dark

| Token | Value | Role |
|---|---|---|
| `background` | `#080E18` | Page |
| `surface` | `#111A28` | Cards, groups |
| `surfaceAlt` | `#182434` | Inputs |
| `border` | `#26344A` | Hairlines |
| `text` | `#E9F0F8` | 13.6:1 |
| `textMuted` | `#A6B6CA` | 7.6:1 |
| `textFaint` | `#8595AA` | 5.1:1 |
| `accent` | `#5FA8F2` | |
| `pass` / `stretch` / `fail` | `#4FD08E` / `#E8A94E` / `#FF8F84` | |

**The contrast rule is non-negotiable and was learned the hard way.** An earlier `textFaint` measured 3.1:1 and carried every caption, hint, axis label and source note in the app. Every ink is now verified at ≥4.5:1 against *every* surface it can appear on — page, card, alt surface, and its own soft pill background. The status green failed at 4.34:1 on the alt surface for exactly that reason and was re-stepped.

### Chart series

Separate from the UI palette, and validated for protanopia, deuteranopia and tritanopia rather than chosen by eye. Light `#1F5FA0` `#B45309` `#7C3AED`; dark `#4A93DB` `#C0862E` `#8B6FE0`. Status colours are reserved and never reused as a series.

## Typography

One family, many weights — the product default. Roughly a 1.15 ratio, which keeps many type roles distinguishable without shouting.

| Role | Size / weight | Use |
|---|---|---|
| `hero` | 40 / 800, -1.2 tracking | Landing headline only |
| `display` | 28 / 800 | Screen titles |
| `title` | 20 / 700 | Section headings |
| `heading` | 16 / 600 | Card headings |
| `body` | 15 / 400 | Prose |
| `label` | 13 / 600 | Field labels, buttons |
| `caption` | 12 / 400 | Hints, sources |
| `mono` / `monoLarge` | 15 / 30, tabular | **All currency** |

Currency always uses tabular figures. These users scan columns of numbers; proportional digits make that harder for no gain. Prose is capped at ~560px and screens at 760px so a caption never stretches across a desktop window.

## Layout

Spacing is a 4px base: `4 8 12 16 24 32 48`. Radii: `6 10 12 16 22` plus a pill.

**Cards are not the default.** An earlier build was a scrollable pile of identical rounded rectangles, which is the clearest tell of a generated interface. Three structures instead:

- **`Section`** — a heading over open space. The default for grouping.
- **`Group`** — a run of related rows sharing one surface with hairline dividers. Replaces one-card-per-row.
- **`Card`** — reserved for content that genuinely sits apart. `raised` adds elevation for a single focal block.

Elevation has three levels only. Beyond that a surface stops reading as paper.

## Components

Every interactive component ships default, pressed, disabled and — where it can wait on something — loading.

- **Button** — primary and ghost, both with `disabled` and `loading`; 48px min height, press scales to 0.975.
- **Inputs** — focus thickens the border to 2px and lifts the fill to `surface`, with a compensating negative margin so nothing shifts.
- **Segmented** — the selected cell is a raised surface, not a colour fill.
- **Stepper** — 44px targets, disabled at the bounds.
- **Skeleton** — shaped like the content it replaces. Spinners mid-content are not used; they say nothing about what is coming.
- **EmptyState** — teaches the screen and offers the next action.
- **SourceBadge** — Official / Indicative, at the same weight as the figure it qualifies.

## Motion

150–250ms on most transitions; users are in a task and should never wait on choreography. Ease-out curves, no bounce.

`useReducedMotion` drives every animation, and reveals resolve to their finished state rather than gating content behind a transition that may never fire. Entrance motion is limited to the landing hero plus one staggered list — an identical fade on every section is itself a tell.

## Accessibility

- WCAG 2.2 AA verified rather than assumed; the ratios above are measured.
- Status is a **word** first, colour second. Charts pair every series with a named legend entry and a text readout.
- Tap targets ≥44px.
- Respects the system colour scheme and the reduce-motion setting.
