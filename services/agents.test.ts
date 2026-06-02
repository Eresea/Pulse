import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { mapAgentDetail, mapAgentList, mapAgentTimelineEvent, normalizeAgentStatus } from "@/services/agents-mapper";

describe("normalizeAgentStatus", () => {
  it("normalizes Nexus status variants into the Pulse status model", () => {
    assert.equal(normalizeAgentStatus("waiting input"), "waiting_input");
    assert.equal(normalizeAgentStatus("blocked"), "blocked");
    assert.equal(normalizeAgentStatus("unknown"), "idle");
  });
});

describe("mapAgentList", () => {
  it("maps list payloads and derives attention states", () => {
    const agents = mapAgentList({
      agents: [
        {
          agent_id: "agent-1",
          title: "Release operator",
          goal: "Ship the release",
          state: "running",
          workspace: "nexus",
          engine: "gpt-5",
          progress: { done: 2, total: 5 },
          last_update: "Checking CI"
        },
        {
          id: "agent-2",
          name: "Reviewer",
          status: "waiting-input"
        }
      ]
    });

    assert.deepEqual(agents, [
      {
        id: "agent-1",
        name: "Release operator",
        objective: "Ship the release",
        status: "running",
        location: "nexus",
        runtime: "gpt-5",
        owner: undefined,
        progress: { current: 2, total: 5, percent: undefined, label: undefined },
        needsAttention: false,
        lastUpdate: "Checking CI",
        updatedAt: undefined
      },
      {
        id: "agent-2",
        name: "Reviewer",
        objective: undefined,
        status: "waiting_input",
        location: undefined,
        runtime: undefined,
        owner: undefined,
        progress: undefined,
        needsAttention: true,
        lastUpdate: undefined,
        updatedAt: undefined
      }
    ]);
  });
});

describe("mapAgentDetail", () => {
  it("maps blackboard, approvals, and timeline payloads", () => {
    const detail = mapAgentDetail({
      agent: { id: "agent-1", name: "Planner", status: "blocked", objective: "Plan rollout" },
      blackboard: {
        plan: ["Inspect state", "Draft rollout"],
        active_step: "Inspect state",
        blockers: ["Needs approval"],
        decisions: [{ id: "decision-1", title: "Use staged rollout", rationale: "Lower risk" }],
        artifacts: [{ id: "artifact-1", name: "rollout.md", type: "markdown" }],
        references: [{ id: "ref-1", title: "ERE-56" }],
        recent_updates: ["Created rollout draft"]
      },
      approvals: [{ id: "approval-1", title: "Pause production deploy", message: "Confirm pause", risk: "high" }],
      events: [{ id: "event-1", type: "blackboard", title: "Plan updated", createdAt: "2026-06-02T20:00:00Z" }]
    });

    assert.equal(detail.id, "agent-1");
    assert.equal(detail.needsAttention, true);
    assert.deepEqual(detail.blackboard.plan, ["Inspect state", "Draft rollout"]);
    assert.deepEqual(detail.blackboard.blockers, ["Needs approval"]);
    assert.equal(detail.approvals[0].status, "pending");
    assert.equal(detail.approvals[0].risk, "high");
    assert.equal(detail.timeline[0].type, "blackboard");
  });
});

describe("mapAgentTimelineEvent", () => {
  it("maps message events with fallback agent ids", () => {
    assert.deepEqual(mapAgentTimelineEvent({ id: "event-1", kind: "message", message: "Hello", created_at: "2026-06-02T21:00:00Z" }, "agent-1"), {
      id: "event-1",
      agentId: "agent-1",
      type: "message",
      title: "Message",
      body: "Hello",
      createdAt: "2026-06-02T21:00:00Z",
      severity: "info",
      approval: undefined,
      artifact: undefined
    });
  });
});
