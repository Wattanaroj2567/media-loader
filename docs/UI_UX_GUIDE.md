# UI/UX Guide

## Visual Direction

Design the interface as a modern dark utility dashboard.

Style keywords:

```text
Dark
Clean
Sharp
Minimal
Premium utility
Developer-friendly
Calm
Focused
```

---

## Color Direction

Preferred:

- Near-black background
- Dark gray surfaces
- Subtle gray borders
- White and gray text hierarchy
- Restrained blue/cyan/green accent
- Red for danger
- Amber for warning
- Green for success

Avoid:

- Pastel-heavy palette
- Excessive purple gradients
- Colorful toy-like UI
- Low contrast text
- Neon everywhere

---

## Icons

Do not use emoji as icons.

Use:

- Lucide React
- Tabler Icons

Recommended icons:

- `Download`
- `Music`
- `Video`
- `ShieldCheck`
- `History`
- `Settings`
- `AlertTriangle`
- `FileVideo`
- `FileAudio`
- `LoaderCircle`
- `Lock`
- `ExternalLink`

---

## Main Layout

Recommended layout:

- Left sidebar on desktop
- Top bar on mobile
- Main content max-width for readability
- Large URL input card
- Separate status cards
- History table/card hybrid

---

## Main Components

### URL Input Card

Must include:

- Large input
- Clear placeholder
- Analyze button
- Rights-aware note
- Validation message

### Policy Result Card

States:

- Allowed
- Needs confirmation
- Blocked
- Unsupported

### Format Selection

Show:

- Type
- Quality
- Extension
- Codec
- Estimated size
- Action

### Progress Card

Show:

- Status badge
- Progress bar
- Current step
- Safe error message if failed

### History

Show:

- Title
- Platform/domain
- Output format
- Status
- Date
- File size
- Actions

---

## Interaction Rules

- Make the primary path obvious
- Do not hide policy warnings
- Do not overload the dashboard
- Use skeleton loading instead of layout jumps
- Use concise error messages
- Keep destructive actions confirmed

---

## Copywriting Tone

Use clear, direct text.

Good:

```text
This URL needs rights confirmation before processing.
```

Avoid vague text:

```text
Something weird happened.
```

---

## Responsive Rules

Desktop:

- Sidebar + main workspace
- Table for history

Mobile:

- Top nav
- Cards instead of dense tables
- Large tap targets

---

## Accessibility

- Maintain strong contrast
- Do not rely on color alone
- Use labels for inputs
- Use semantic buttons
- Include visible focus states
