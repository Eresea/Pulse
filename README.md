# Pulse

Pulse is the Android-first native mobile companion for the Roots ecosystem. It is built with Expo React Native and connects directly to `https://roots.eresea.net` for auth, HTTP APIs, SignalR realtime events, Firebase Cloud Messaging push delivery, and polling fallback.

The first version is an app shell: it establishes the project structure, native UI direction, service boundaries, update policy, and debug surfaces needed to grow into the full Roots mobile experience.

## Stack

- Expo + React Native + TypeScript
- Expo Router for app navigation
- NativeWind and shadcn-style local components inspired by React Native Reusables
- `@microsoft/signalr` for Roots realtime hubs
- React Native Firebase Messaging for Android FCM
- `expo-secure-store` for access token persistence
- `expo-updates` configured for Roots-hosted OTA manifests and assets

## Development

Install dependencies:

```powershell
node "C:\Program Files\nodejs\node_modules\npm\bin\npm-cli.js" install
```

Start Metro:

```powershell
node "C:\Program Files\nodejs\node_modules\npm\bin\npm-cli.js" run start
```

Run Android:

```powershell
node "C:\Program Files\nodejs\node_modules\npm\bin\npm-cli.js" run android
```

Validate TypeScript:

```powershell
node "C:\Program Files\nodejs\node_modules\npm\bin\npm-cli.js" run typecheck
```

Validate update config:

```powershell
node "C:\Program Files\nodejs\node_modules\npm\bin\npm-cli.js" run updates:check
```

## Roots Integration

The app config lives in `app.json` under `expo.extra.roots`.

Default API base URL:

```text
https://roots.eresea.net
```

Known auth endpoints:

- `POST /api/auth/login/email`
- `GET /api/auth/login/google?code=...`
- `GET /api/auth/login/github?code=...`
- `POST /api/auth/refresh`
- `POST /api/auth/user/{userId}/device`

Known SignalR hubs:

- `/api/chatHub`
- `/api/bellumHub`
- `/api/battleHub`

SignalR access tokens are sent through the SignalR `accessTokenFactory`, matching the existing Roots backend behavior.

## Push Notifications

Pulse uses FCM on Android. The app expects a Firebase Android config file at:

```text
google-services.json
```

That file is intentionally ignored by git. After login, Pulse should request notification permission, retrieve the FCM token, then register the device with:

```text
POST /api/auth/user/{userId}/device
```

The device payload follows the existing Roots `DeviceInfo` shape: device id, FCM token, platform, and user agent.

## Realtime And Polling

Realtime is the preferred event path. Pulse connects to SignalR first and keeps polling as a fallback for degraded or background states.

Current shell behavior:

- Home shows auth, SignalR, FCM, polling, and update state.
- Inbox defines the event landing zone for chat, Bellum, and push events.
- Settings exposes API, update URL, runtime, and service status.

## Self-Hosted Updates

Pulse uses `expo-updates` with a Roots-hosted update URL:

```text
https://roots.eresea.net/api/mobile-updates/pulse
```

Native changes still require a new Android build. JavaScript and asset-only changes can be exported and published to the Roots update infrastructure.

Export an Android update bundle:

```powershell
node "C:\Program Files\nodejs\node_modules\npm\bin\npm-cli.js" run updates:export
```

The Roots backend must serve Expo update manifests and assets compatible with the runtime version policy in `app.json`.

## Release Policy

- Native dependency changes, app config changes, permissions, and Firebase config changes require a new Android build.
- JavaScript, styling, and bundled asset changes can be shipped through self-hosted `expo-updates` when the runtime version is compatible.
- Production update publishing should be channel-aware; the default channel in this scaffold is `production`.
