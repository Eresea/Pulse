import fs from "node:fs";

const appConfig = JSON.parse(fs.readFileSync("app.json", "utf8"));
const updates = appConfig.expo?.updates;

if (!updates?.enabled) {
  throw new Error("expo.updates.enabled must be true");
}

if (!updates.url?.startsWith("https://nexus.eresea.net/")) {
  throw new Error("expo.updates.url must point to Nexus-hosted update infrastructure");
}

if (updates.checkAutomatically !== "ON_LOAD") {
  throw new Error("expo.updates.checkAutomatically must be ON_LOAD for transparent startup updates");
}

const runtimeVersion = appConfig.expo?.runtimeVersion;
if (runtimeVersion?.policy !== "appVersion") {
  throw new Error("expo.runtimeVersion.policy must stay appVersion until Nexus supports a different compatibility policy");
}

const updateChannel = appConfig.expo?.extra?.roots?.updateChannel;
if (!updateChannel) {
  throw new Error("expo.extra.roots.updateChannel must be set");
}

console.log(`Pulse updates configured for ${updates.url} on ${updateChannel}`);
