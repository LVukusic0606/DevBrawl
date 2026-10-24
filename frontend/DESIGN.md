# DevBrawl: Design System

This document is the source of truth for the frontend visual style. Every new component and page must follow these rules. If something changes, update this file first.

## Character

- **Cozy futuristic, dark theme.** Technological feel, but warm and friendly, not cold or sterile.
- **Two faces of the app:** learning (calmer, focused on reading) and duel (more dramatic, focused on the timer and the result).
- **Programmer aesthetic without clutter.** The terminal tone lives in the typography and small details, not in a crowded screen.

## Palette (cyber cyan)

| Token | Hex | Purpose |
|---|---|---|
| `--color-bg` | `#07111a` | Page background |
| `--color-surface` | `#0d1b26` | Cards, panels, sidebar |
| `--color-border` | `#1b3345` | Borders, dividers |
| `--color-text` | `#e0f2fe` | Primary text |
| `--color-text-muted` | `#7893a8` | Secondary text, labels, placeholders |
| `--color-accent` | `#22d3ee` | Learning: primary actions, active states, focus |
| `--color-duel` | `#f472b6` | Duel: actions, timer, active states inside duel |
| `--color-success` | `#4ade80` | Correct answer, progress |
| `--color-danger` | `#f87171` | Wrong answer, errors |
| `--color-warning` | `#facc15` | Warnings, approaching deadlines |

Color rules:
- Cyan belongs to learning, magenta to duel. Do not mix them within the same action.
- Use the accent sparingly: at most one accent action per screen.
- Text always uses `--color-text` or `--color-text-muted`, never pure white or a gray from another palette.

## Typography

- **Text (headings, labels, short copy):** Share Tech Mono, regular (400).
- **Code and numbers:** Martian Mono, bold (700).
- **Lesson body paragraphs:** Exo 2, regular (400). It keeps the futuristic tone and is much easier to read for long text than Share Tech Mono. Share Tech Mono stays for headings, labels and short copy.
- Only two weights per family: 400 for text, 700 for code and emphasized labels.
- Sentence case everywhere. Never ALL CAPS for full sentences. Short labels such as `XP` or `STREAK` are the exception.
- Sizes: page title 24px, card title 18px, body 15px, small text 13px. Minimum 12px.
- Line height for text: 1.6.

## Density and spacing

- Medium density. Enough room to read, enough data on screen.
- Spacing scale in 4px steps: 4, 8, 12, 16, 24, 32.
- Card inner padding: 16px. Gap between cards: 12px.

## Radius and borders

- Radius: **8px** for cards, buttons and inputs. **12px** for large inner panels, **16px** for full-screen frames. Pills only for small badges.
- Borders are **1px** in `--color-border`. No thick outlines except for focus and active states.
- Shadows are minimal. Only the focus ring is allowed (`box-shadow: 0 0 0 2px` in the accent color).

## Navigation

- **Sidebar** on desktop. Fixed width around 220px, containing learning, duel, profile and streak.
- **Mobile:** the sidebar becomes a bottom bar with four items: learning, duel, profile and streak. Each item has an icon and a short label. The active item uses `--color-accent` (or `--color-duel` inside the duel).
- The bottom bar sits on `--color-surface` with a 1px top border in `--color-border`.

## Layout and composition

- Key screens use the full screen with a bold composition, not a small centered card.
- Headings are large (40 to 48px on key screens). Hierarchy comes from scale.
- Inputs are filled (`--color-field`), 52px tall, without leading icons. The focus state is a 1px accent ring.
- Switching between related views (log in / sign up) uses an inline text link, not segmented tabs.

### Auth screen

- Split layout inside a large frame: a visual panel on the left, the form on the right.
- The visual panel holds the logo, the mascot artwork (to be defined) and the tagline. Its background is `--color-bg` with a subtle 32px grid in `--color-grid`.
- Form order: title, switch link, fields, remember me (log in only), primary button, "Or log in with" divider, Google button.
- Below 900px the visual panel collapses into a header with only the logo.

## Icons

- **Tabler outline** icons (`ti ti-*`). Never the `-filled` variants.
- 16 to 20px inline, 24px at most for decoration.
- Icon-only buttons need an `aria-label`. Decorative icons get `aria-hidden="true"`.

## Motion

- Medium intensity. Duration 150 to 300ms, easing `ease-out`.
- Allowed:
  - smooth card entrance
  - correct-answer feedback (short pulse in `--color-success`)
  - streak indicator animation
- Not allowed: confetti, glitch effects, and constant animations that pull attention away from content.
- Respect `prefers-reduced-motion`: reduce all animations to instant changes.

## Duel

- The magenta accent (`--color-duel`) marks competition.
- The timer is prominent: large numbers, color shifts with time (accent, then warning, then danger).
- Result and rank are emphasized, without heavy effects.

## Anti-slop rules

These rules prevent generic AI-looking design. Check every new screen against this list:

- No purple or blue gradients in backgrounds.
- No glassmorphism (frosted glass) without a purpose.
- No emoji used as icons. Use Tabler.
- No generic hero screens with three cards and a big button.
- No small centered card with tabs, icons in every input and a generic subtitle. This was rejected for the auth screen.
- No shadows, glows or neon outlines except the focus ring.
- Not every element has the same weight. Hierarchy comes from size and color, not from added effects.
- No decorative elements that carry no meaning. Every element needs a function.
- No lorem ipsum or placeholder headings in finished designs.

## Tone of voice

- Short and friendly. Encouraging, never pressuring.
- Examples: "Good progress! 2 more questions." / "No duels yet. Start your first one."
- Sentence case. Ends with a period in body copy, not on button labels.
- Feedback is direct: say what happened, then what to do next.

## Empty, loading and error states

- **Empty:** a small Tabler icon, one sentence, and one primary action. Example: "No duels yet." with a button "Start a duel".
- **Loading:** a simple text label or a thin progress bar in `--color-accent`. No spinners that take over the screen.
- **Error:** one sentence in `--color-danger` with the next step. Example: "Couldn't connect. Try again."
- No illustrations in these states.

## Component rules

- Colors, spacing and radius come from tokens. No hardcoded hex values inside components.
- Buttons: one primary (filled accent) per screen. Others are secondary (outlined).
- States: hover, active, focus and disabled must be visible and distinct.
- Correct and incorrect answers always include a text label next to the color, not color alone (accessibility).

## Open questions

- Concrete tokens in `frontend/src/index.css`, when implementation starts.
- Mockups of the lesson and duel screens, to validate these rules together.
