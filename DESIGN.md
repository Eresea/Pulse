# Pulse Design

Pulse should feel like a fast native control surface for Roots, not a wrapped website. The design goal is modern, quiet, dense enough for repeated use, and responsive to every touch.

## Feel

- Fast first: every tap should produce visible feedback immediately.
- Native first: screens should respect Android system spacing, back behavior, safe areas, and notification patterns.
- Calm by default: use restrained surfaces, clear status, and useful density instead of decorative layouts.
- Realtime-aware: connection, degraded mode, offline state, and update availability should be visible without interrupting normal use.

## Component Language

Pulse uses shadcn-style composition adapted to React Native through NativeWind and React Native Reusables patterns.

- Components are local source, not opaque theme magic.
- Use semantic variants for buttons, badges, cards, empty states, and inputs.
- Prefer composed primitives over one-off styled views.
- Keep cards to repeated items, settings groups, and focused status panels.
- Radius should stay tight: 4px to 8px for most UI.

## Motion

- Transitions should be short: 120ms to 220ms.
- Use motion to confirm state changes, not to decorate.
- Avoid delayed loaders for actions that can complete optimistically.
- Reconnect and update states should use subtle indicators rather than blocking modals.

## Layout

- Android-first portrait layout.
- Primary screens use safe-area top spacing and a bottom tab bar.
- Dense status rows should align labels left and values right.
- Text must not truncate critical status values unless a detail view also exposes the full value.
- Empty states should be compact and actionable.

## Color And Type

- Base background: light neutral.
- Primary action/status: teal.
- Secondary information: slate gray.
- Accent information: restrained blue.
- Avoid one-note monochrome screens and heavy gradients.
- Use clear hierarchy: screen title, supporting copy, then compact panels.

## Loading, Offline, And Errors

- Loading states should preserve layout dimensions.
- Offline mode should keep the last known useful state visible.
- Degraded realtime should automatically start or keep polling active.
- Errors should say what failed: auth, SignalR, FCM, polling, or updates.
- Avoid technical stack traces in user-facing surfaces; reserve detail for debug settings.

## Performance Expectations

- App shell should cold start quickly and avoid blocking startup on network calls.
- Realtime connections should start after the UI is visible.
- Polling must never block interaction.
- Update checks should be explicit in Settings or automatic on app load for release builds.
- Lists should be virtualized once event history becomes non-trivial.
