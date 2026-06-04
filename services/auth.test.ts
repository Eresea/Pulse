import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { mapNexusConnectorList, mapNexusUser } from "@/services/auth-mapper";

describe("mapNexusUser", () => {
  it("maps Nexus connectors with statuses and permissions from /me", () => {
    const user = mapNexusUser({
      id: "user-1",
      email: "ada@example.com",
      connectors: [
        {
          id: "github",
          name: "GitHub",
          status: "connected",
          email: "ada@github.example",
          connectedAt: "2026-05-24T10:00:00Z",
          permissions: [
            { id: "repo", name: "Repository access", granted: true },
            { scope: "issues:write", description: "Create and update issues", granted: false }
          ]
        }
      ],
      permissions: [
        { id: "chat", name: "Chat", description: "Use Nexus chat", granted: true },
        "profile:read"
      ]
    });

    assert.deepEqual(user.providers, [
      {
        id: "github",
        name: "GitHub",
        email: "ada@github.example",
        connectedAt: "2026-05-24T10:00:00Z",
        status: "connected",
        permissions: [
          { id: "repo", name: "Repository access", granted: true },
          { id: "issues:write", name: "issues:write", description: "Create and update issues", granted: false }
        ]
      }
    ]);
    assert.deepEqual(user.permissions, [
      { id: "chat", name: "Chat", description: "Use Nexus chat", granted: true },
      { id: "profile:read", name: "profile:read" }
    ]);
  });

  it("maps Nexus authorization roles, claims, and feature overrides into profile permissions", () => {
    const user = mapNexusUser({
      id: "user-1",
      roles: [
        { key: "roots.admin", name: "Roots Admin", description: "Manage Roots" },
        "operator"
      ],
      claims: {
        "ai.chat": true,
        "billing.read": false
      },
      featureOverrides: {
        inbox: true
      }
    });

    assert.deepEqual(user.permissions, [
      { id: "role:roots.admin", name: "Roots Admin", description: "Manage Roots", granted: true, category: "Role" },
      { id: "role:operator", name: "operator", granted: true, category: "Role" },
      { id: "claim:ai.chat", name: "ai.chat", granted: true, category: "Claim" },
      { id: "claim:billing.read", name: "billing.read", granted: false, category: "Claim" },
      { id: "feature:inbox", name: "inbox", granted: true, category: "Feature" }
    ]);
  });
});

describe("mapNexusConnectorList", () => {
  it("maps the Nexus connector catalog used by Workbench", () => {
    const connectors = mapNexusConnectorList({
      connectors: [
        {
          id: "linear",
          displayName: "Linear",
          providerType: "linear",
          status: "disconnected",
          capabilities: ["issues"],
          supportedApps: ["workbench", "pulse"],
          supportedModules: ["steward"],
          canConnect: true
        },
        {
          connector_id: "gmail",
          display_name: "Gmail",
          provider_type: "google",
          status: "needs_reauth",
          status_message: "Token expired",
          account_email: "ada@example.com",
          can_reauth: true
        }
      ]
    });

    assert.deepEqual(connectors, [
      {
        id: "linear",
        displayName: "Linear",
        providerType: "linear",
        authMethod: undefined,
        capabilities: ["issues"],
        supportedApps: ["workbench", "pulse"],
        supportedModules: ["steward"],
        supportMode: undefined,
        status: "disconnected",
        rawStatus: "disconnected",
        statusMessage: undefined,
        accountEmail: undefined,
        accountName: undefined,
        connectedAt: undefined,
        updatedAt: undefined,
        expiresAt: undefined,
        localAvailable: false,
        actions: { canConnect: true, canDisconnect: false, canRefresh: false, canReauth: false },
        actionUrl: undefined
      },
      {
        id: "gmail",
        displayName: "Gmail",
        providerType: "google",
        authMethod: undefined,
        capabilities: [],
        supportedApps: [],
        supportedModules: [],
        supportMode: undefined,
        status: "needsReauth",
        rawStatus: "needs_reauth",
        statusMessage: "Token expired",
        accountEmail: "ada@example.com",
        accountName: undefined,
        connectedAt: undefined,
        updatedAt: undefined,
        expiresAt: undefined,
        localAvailable: false,
        actions: { canConnect: false, canDisconnect: true, canRefresh: true, canReauth: true },
        actionUrl: undefined
      }
    ]);
  });
});
