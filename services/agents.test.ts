import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildAgentGraph, mapAgentDetail, mapAgentList, mapAgentProfileList, mapAgentTimelineEvent, mapBlackboardAgents, normalizeAgentStatus } from "@/services/agents-mapper";

describe("normalizeAgentStatus", () => {
  it("normalizes Nexus status variants into the Pulse status model", () => {
    assert.equal(normalizeAgentStatus("waiting input"), "waiting_input");
    assert.equal(normalizeAgentStatus("blocked"), "blocked");
    assert.equal(normalizeAgentStatus("unknown"), "idle");
  });
});

describe("mapBlackboardAgents", () => {
  it("joins board agents with their latest objectives and tasks", () => {
    const agents = mapBlackboardAgents({
      blackboard: { id: "bb-1" },
      agents: [{ id: "agent-1", displayName: "Planner", status: "running", runtimeSelection: { model: "gpt-5" } }],
      tasks: [{ id: "task-1", title: "Draft plan", assigneeAgentId: "agent-1", status: "in_progress" }]
    }, [{ id: "obj-1", agentId: "agent-1", prompt: "Ship ERE-59", status: "running", updatedAt: "2026-06-11T10:00:00Z" }]);
    assert.equal(agents[0].objective, "Ship ERE-59");
    assert.equal(agents[0].tasks?.[0].id, "task-1");
  });
});

describe("mapAgentList", () => {
  it("maps list payloads and derives attention states", () => {
    const agents = mapAgentList({
      agents: [
        {
          agent_id: "agent-1",
          title: "Release operator",
          profile: { id: "operator", name: "Operator" },
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
        profileId: "operator",
        profileName: "Operator",
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
        profileId: undefined,
        profileName: undefined,
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

  it("maps parent and task relation hints for the visual blackboard", () => {
    const agents = mapAgentList({
      agents: [
        {
          id: "parent",
          name: "Coordinator",
          status: "running",
          childAgents: ["child"],
          tasks: [{ id: "task-1", title: "Review deployment", status: "blocked" }]
        },
        {
          id: "child",
          name: "Reviewer",
          status: "waiting_input",
          parentAgentId: "parent"
        }
      ]
    });

    assert.deepEqual(agents[0].relations, {
      parentAgentId: undefined,
      childAgentIds: ["child"],
      taskIds: ["task-1"]
    });
    assert.deepEqual(agents[0].tasks, [{ id: "task-1", title: "Review deployment", status: "blocked" }]);
    assert.equal(agents[1].relations?.parentAgentId, "parent");
  });
});

describe("buildAgentGraph", () => {
  it("builds nodes and edges for parent, child, and task relationships", () => {
    const agents = mapAgentList({
      agents: [
        {
          id: "parent",
          name: "Coordinator",
          status: "running",
          child_agent_ids: ["child"],
          tasks: [{ id: "task-1", title: "Review deployment", state: "waiting_input" }]
        },
        {
          id: "child",
          name: "Reviewer",
          status: "blocked",
          parent_agent_id: "parent"
        }
      ]
    });

    assert.deepEqual(buildAgentGraph(agents), {
      nodes: [
        { id: "parent", type: "agent", title: "Coordinator", subtitle: "running", status: "running", depth: 0, agentId: "parent" },
        { id: "child", type: "agent", title: "Reviewer", subtitle: "blocked", status: "blocked", depth: 1, agentId: "child" },
        { id: "task-1", type: "task", title: "Review deployment", subtitle: "waiting_input", status: "waiting_input", depth: 1, agentId: "parent" }
      ],
      edges: [
        { id: "parent-child", fromId: "parent", toId: "child", type: "child" },
        { id: "parent-task-1", fromId: "parent", toId: "task-1", type: "task" }
      ]
    });
  });
});

describe("mapAgentProfileList", () => {
  it("maps blackboard agent profiles and falls back to defaults", () => {
    assert.deepEqual(mapAgentProfileList({ profiles: [{ id: "operator", name: "Operator", persona: "Ops", skills: ["monitoring"] }] }), [
      {
        id: "operator",
        name: "Operator",
        description: undefined,
        role: "Ops",
        runtime: undefined,
        location: undefined,
        capabilities: ["monitoring"],
        defaultObjective: undefined
      }
    ]);
    assert.ok(mapAgentProfileList({ profiles: [] }).length > 0);
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

  it("tolerates alternate blackboard collection names from Nexus", () => {
    const detail = mapAgentDetail({
      agent: { id: "agent-1", name: "Planner", status: "running" },
      blackboard: {
        steps: ["Inspect state", "Draft rollout"],
        currentStep: "Draft rollout",
        issues: ["Needs approval"],
        decisionLog: [{ id: "decision-1", summary: "Use staged rollout", reason: "Lower risk" }],
        outputs: [{ id: "artifact-1", title: "rollout.md", kind: "markdown", href: "https://example.test/rollout.md" }],
        sources: [{ id: "ref-1", name: "ERE-56", kind: "issue", href: "https://linear.app/eresea/issue/ERE-56" }],
        activity: ["Created rollout draft"]
      }
    });

    assert.deepEqual(detail.blackboard.plan, ["Inspect state", "Draft rollout"]);
    assert.equal(detail.blackboard.activeStep, "Draft rollout");
    assert.deepEqual(detail.blackboard.blockers, ["Needs approval"]);
    assert.equal(detail.blackboard.decisions[0].title, "Use staged rollout");
    assert.equal(detail.blackboard.artifacts[0].type, "markdown");
    assert.equal(detail.blackboard.artifacts[0].url, "https://example.test/rollout.md");
    assert.equal(detail.blackboard.contextReferences[0].type, "issue");
    assert.equal(detail.blackboard.contextReferences[0].url, "https://linear.app/eresea/issue/ERE-56");
    assert.deepEqual(detail.blackboard.recentUpdates, ["Created rollout draft"]);
  });

  it("sorts timeline events newest first and keeps resolved approvals out of pending attention", () => {
    const detail = mapAgentDetail({
      agent: { id: "agent-1", name: "Planner", status: "running" },
      approvals: [
        { id: "approval-1", status: "approved", title: "Already handled" },
        { id: "approval-2", status: "pending", title: "Needs review" }
      ],
      timeline: [
        { id: "older", type: "message", created_at: "2026-06-02T20:00:00Z" },
        { id: "newer", kind: "blackboard", createdAt: "2026-06-02T21:00:00Z" }
      ]
    });

    assert.deepEqual(detail.timeline.map((event) => event.id), ["newer", "older"]);
    assert.deepEqual(detail.approvals.map((approval) => approval.status), ["approved", "pending"]);
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
