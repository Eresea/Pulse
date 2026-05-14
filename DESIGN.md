## Overview

Pulse is a native mobile command surface for Roots, built for repeated operational use rather than promotion or browsing. It should feel fast, calm, and direct: a user opens the app to understand auth state, realtime status, notifications, account details, update health, and connection fallbacks with very little friction.

The visual identity is Android-first, dense, and utilitarian. Screens use safe-area spacing, a bottom navigation model, a drawer for secondary movement, compact status cards, and clear label/value rows. The product should read as a native control panel: structured, quiet, highly legible, and responsive to every tap.

## Colors

The palette is slate plus teal. Light mode uses a near-white slate background with white cards and fine blue-gray borders. Dark mode intentionally collapses most surfaces to true black, creating an AMOLED command-console feel without switching to a decorative neon theme.

Teal is the system's primary action and status color. Use it for active navigation states, primary buttons, live connection indicators, and trusted service icons. Slate gray carries secondary copy, metadata, inactive states, and fallback details. Blue can appear as restrained secondary information, but should not compete with teal as the main interaction color.

Destructive color is reserved for explicit failures or auth/update errors. Error surfaces should be light red in light mode and deep red in dark mode, with readable red text. Do not use large gradients; the only broad color band is the quiet teal-tinted login header.

## Typography

Typography uses the platform system font with straightforward weights. The hierarchy is compact and functional:

- Screen titles are large and bold at 30px, giving each mobile view a clear anchor without becoming a marketing hero.
- Card titles are 16px semibold.
- Body and row text live mostly at 14px, with secondary explanatory text using slate muted color rather than smaller sizes alone.
- Input text is 16px for mobile readability.
- Labels and badges use 12px semibold, with uppercase reserved for form labels and section labels.

Letter spacing should remain neutral. Avoid compressed headings, decorative typefaces, and expressive display treatments. The app's voice comes from clarity and status precision, not typography novelty.

## Layout

Pulse follows a portrait mobile layout with safe-area top spacing and scrollable content. Horizontal screen padding is 16px. Vertical rhythm uses 16px gaps between major panels and 8px to 12px gaps inside grouped content.

Cards are used for focused status groups, settings groups, account panels, and repeated event rows. They should not become nested decorative containers. Status rows align labels left and values right, with values allowed enough width to remain useful. When values are long, right-align and constrain them rather than letting them collide with labels.

Empty states are compact and actionable. They use dashed or subtle borders, a small icon, one short title, and one explanatory sentence. Loading states should preserve layout dimensions and avoid disrupting the user's sense of where services and values live.

## Elevation & Depth

Depth is intentionally restrained. Most hierarchy comes from borders, spacing, typography weight, and tonal surfaces. Cards use thin borders and minimal or no shadow.

The drawer interaction is the one explicit elevation moment: the page slides over the menu with a soft shadow and platform elevation, making the active screen feel like a movable native surface. Login can use a small shadow on the main card and app mark, but heavy shadows should be avoided elsewhere.

## Shapes

The shape language is tight and native. Cards use 8px corners, buttons and inputs use 6px corners, badges use 4px corners, and avatars or icon-only buttons use full circles. Larger 16px rounding is reserved for the login app mark and avatar-like elements, not for ordinary panels.

Avoid mixing very pillowy controls with sharp cards. The system should feel precise and touchable, not bubbly.

## Components

Primary buttons are teal, 44px high by default, semibold, and horizontally padded. Important sign-in actions may use the 48px tall variant. Disabled buttons reduce opacity rather than changing color family.

Outline buttons are white or black surface buttons with slate borders. Ghost buttons are text-forward and should be used for low-risk secondary actions such as switching auth mode or signing out.

Inputs are 48px high with a leading icon, uppercase 12px label, 6px radius, and teal focus border. Icons shift from muted slate to teal when focused. Placeholder and helper text use muted slate.

Badges are compact status chips. Primary badges indicate verified, ready, or active states. Secondary badges indicate neutral counts or supporting facts. Outline badges communicate pending, stubbed, inactive, or informational statuses.

Cards are flat surface panels with 16px padding, a 1px border, and compact headers. Card content should prefer rows, badges, and short supporting text over large illustrations or decorative empty space.

Navigation uses teal-filled active rows and icon tinting. The drawer should feel like a persistent app shell with reserved sections for recent events and AI threads, even when those sections are empty.

## Do's and Don'ts

- Do use teal for the most important action, active route, or healthy live status on a screen.
- Do keep panels compact, bordered, and readable.
- Do preserve last-known useful state during offline, degraded realtime, or polling fallback modes.
- Do state what failed in user-facing errors: auth, SignalR, FCM, polling, updates, or profile.
- Do use icons as small status anchors, not as decorative art.
- Don't create marketing-style hero sections inside the app shell.
- Don't use heavy gradients, large illustrations, or one-note monochrome screens.
- Don't bury critical service values in truncated text without another way to inspect them.
- Don't use blocking modals for reconnecting, polling, or update checks unless the user must act.
- Don't introduce new radii, color families, or font families unless the whole system is intentionally being redesigned.
