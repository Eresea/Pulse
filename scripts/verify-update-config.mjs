import fs from "node:fs";

const appConfig = JSON.parse(fs.readFileSync("app.json", "utf8"));
const updates = appConfig.expo?.updates;

if (!updates?.enabled) {
  throw new Error("expo.updates.enabled must be true");
}

if (!updates.url?.startsWith("https://roots.eresea.net/")) {
  throw new Error("expo.updates.url must point to Roots-hosted update infrastructure");
}

console.log(`Pulse updates configured for ${updates.url}`);
