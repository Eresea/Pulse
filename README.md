# Pulse

Pulse is the Android-first native mobile companion for the Roots ecosystem. It is built with Expo React Native and connects directly to `https://nexus.eresea.net` for auth, HTTP APIs, user-scoped websocket realtime events, Firebase Cloud Messaging push delivery, and polling fallback.

The first version is an app shell: it establishes the project structure, native UI direction, service boundaries, update policy, and debug surfaces needed to grow into the full Roots mobile experience.

## Stack

- Expo + React Native + TypeScript
- Expo Router for app navigation
- NativeWind and shadcn-style local components inspired by React Native Reusables
- React Native Firebase Messaging for Android FCM
- `expo-secure-store` for access token persistence
- Nexus APK update checks for full Android app updates

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
https://nexus.eresea.net
```

Known auth endpoints:

- `POST /api/auth/login/email`
- `GET /api/auth/login/google?code=...`
- `GET /api/auth/login/github?code=...`
- `POST /api/auth/refresh`
- `POST /api/auth/user/{userId}/device`

Known realtime endpoint:

- `GET /ws/v1/user`

Websocket access tokens are sent as an `access_token` query parameter because React Native's websocket API does not reliably support custom headers.

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

Realtime is the preferred event path. Pulse connects to the Nexus user websocket first and keeps polling as a fallback for degraded or background states.

Current shell behavior:

- Home shows auth, websocket, FCM, polling, and update state.
- Inbox defines the event landing zone for chat, Bellum, and push events.
- Settings exposes API, update URL, runtime, and service status.

## APK Updates

Pulse checks Nexus for full Android APK updates:

```text
GET /api/v1/updates/check?appId=pulse&platform=android&channel=production&currentVersion=...
```

Nexus returns `204 No Content` when the installed APK is current. When a newer APK is available, Settings shows the returned version and exposes an action to open the update URL externally. Pulse does not install APKs silently.

## Release Policy

- Native dependency changes, app config changes, permissions, Firebase config changes, JavaScript changes, styling, and bundled asset changes require a new Android APK build.
- Production update publishing should be channel-aware; the default channel in this scaffold is `production`.
