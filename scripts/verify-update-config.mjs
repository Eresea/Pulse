import fs from "node:fs";

const appConfig = JSON.parse(fs.readFileSync("app.json", "utf8"));
const updates = appConfig.expo?.updates;

if (updates?.enabled) {
  throw new Error("expo.updates.enabled must stay false while Pulse uses Nexus APK updates");
}

if (updates?.checkAutomatically !== "NEVER") {
  throw new Error("expo.updates.checkAutomatically must be NEVER while Pulse uses Nexus APK updates");
}

const runtimeVersion = appConfig.expo?.runtimeVersion;
if (runtimeVersion?.policy !== "appVersion") {
  throw new Error("expo.runtimeVersion.policy must stay appVersion until Nexus supports a different compatibility policy");
}

const updateChannel = appConfig.expo?.extra?.roots?.updateChannel;
if (!updateChannel) {
  throw new Error("expo.extra.roots.updateChannel must be set");
}

console.log(`Pulse APK updates configured for https://nexus.eresea.net/api/v1/updates/check on ${updateChannel}`);
