import { buildApkUpdateCheckPath, parseApkUpdateResponse } from "@/services/update-check";
import assert from "node:assert/strict";
import { describe, it } from "node:test";

describe("buildApkUpdateCheckPath", () => {
  it("builds the Nexus APK update check query for Pulse", () => {
    assert.equal(
      buildApkUpdateCheckPath({
        appId: "pulse",
        platform: "android",
        channel: "production",
        currentVersion: "0.1.4",
        deviceId: "device 1"
      }),
      "/api/v1/updates/check?appId=pulse&platform=android&channel=production&currentVersion=0.1.4&deviceId=device+1"
    );
  });
});

describe("parseApkUpdateResponse", () => {
  it("treats 204 as the current version", async () => {
    const result = await parseApkUpdateResponse(new Response(null, { status: 204 }));

    assert.deepEqual(result, { status: "current", available: false });
  });

  it("maps available Nexus APK updates", async () => {
    const result = await parseApkUpdateResponse(
      Response.json({
        version: "0.1.4",
        url: "https://nexus.eresea.net/downloads/pulse.apk",
        signature: "sig",
        notes: "Bug fixes"
      })
    );

    assert.deepEqual(result, {
      status: "available",
      available: true,
      version: "0.1.4",
      url: "https://nexus.eresea.net/downloads/pulse.apk",
      signature: "sig",
      notes: "Bug fixes"
    });
  });

  it("throws a useful error for failed Nexus checks", async () => {
    await assert.rejects(
      parseApkUpdateResponse(Response.json({ error: "invalid_request" }, { status: 400 })),
      /Nexus APK update check failed with 400/
    );
  });
});
