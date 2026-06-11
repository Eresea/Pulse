import type {
  AgentApprovalRequest,
  AgentBlackboard,
  AgentContextReference,
  AgentDecision,
  AgentDetail,
  AgentGraph,
  AgentProfile,
  AgentStatus,
  AgentSummary,
  AgentTask,
  AgentTimelineEvent,
  AgentTimelineEventType,
  AgentArtifact
} from "@/services/types";

type RawRecord = Record<string, unknown>;

const statuses: AgentStatus[] = ["idle", "running", "waiting_input", "blocked", "paused", "failed", "completed"];
const eventTypes: AgentTimelineEventType[] = ["blackboard", "message", "approval", "log", "artifact", "error"];

export function normalizeAgentStatus(value: unknown): AgentStatus {
  const normalized = String(value ?? "idle").trim().toLowerCase().replace(/[-\s]+/g, "_");
  return statuses.includes(normalized as AgentStatus) ? (normalized as AgentStatus) : "idle";
}

export function mapAgentSummary(item: unknown): AgentSummary {
  const agent = asRecord(item);
  const id = stringValue(agent.id) ?? stringValue(agent.agentId) ?? stringValue(agent.agent_id) ?? "";
  const status = normalizeAgentStatus(agent.status ?? agent.state);
  const relations = mapRelations(agent);
  const tasks = mapTaskList(agent.tasks ?? agent.taskList ?? agent.task_list);
  return {
    id,
    name: stringValue(agent.name) ?? stringValue(agent.title) ?? "Agent",
    profileId: stringValue(agent.profileId) ?? stringValue(agent.profile_id) ?? stringValue(asRecord(agent.profile).id),
    profileName: stringValue(agent.profileName) ?? stringValue(agent.profile_name) ?? stringValue(asRecord(agent.profile).name),
    objective: stringValue(agent.objective) ?? stringValue(agent.goal),
    status,
    location: stringValue(agent.location) ?? stringValue(agent.host) ?? stringValue(agent.workspace),
    runtime: stringValue(agent.runtime) ?? stringValue(agent.model) ?? stringValue(agent.engine),
    owner: stringValue(agent.owner) ?? stringValue(agent.ownerName),
    progress: mapProgress(agent.progress),
    needsAttention: booleanValue(agent.needsAttention) ?? ["waiting_input", "blocked", "failed"].includes(status),
    lastUpdate: stringValue(agent.lastUpdate) ?? stringValue(agent.last_update) ?? stringValue(agent.preview),
    updatedAt: stringValue(agent.updatedAt) ?? stringValue(agent.updated_at) ?? stringValue(agent.lastActivityAt),
    ...(relations ? { relations } : {}),
    ...(tasks ? { tasks } : {})
  };
}

export function mapAgentList(result: unknown): AgentSummary[] {
  const source = Array.isArray(result) ? result : Array.isArray(asRecord(result).agents) ? (asRecord(result).agents as unknown[]) : [];
  return source.map(mapAgentSummary).filter((agent) => agent.id);
}

export function mapBlackboardAgents(detailValue: unknown, objectiveValues: unknown[]): AgentSummary[] {
  const detail = asRecord(detailValue);
  const blackboard = asRecord(detail.blackboard);
  const tasks = recordList(detail.tasks);
  return recordList(detail.agents).map(agent => {
    const latest = objectiveValues
      .map(asRecord)
      .filter(objective => stringValue(objective.agentId) === stringValue(agent.id))
      .sort((a, b) => String(b.updatedAt ?? "").localeCompare(String(a.updatedAt ?? "")))[0];
    const summary = mapAgentSummary({
      ...agent,
      name: agent.displayName ?? agent.label,
      model: asRecord(agent.runtimeSelection).model ?? agent.model,
      objective: latest?.prompt,
      status: latest?.status ?? agent.status,
      tasks: tasks.filter(task => stringValue(task.assigneeAgentId) === stringValue(agent.id))
    });
    return { ...summary, blackboardId: stringValue(blackboard.id), objectiveId: stringValue(latest?.id) };
  }).filter(agent => agent.id);
}

export function buildAgentGraph(agents: AgentSummary[]): AgentGraph {
  const agentIds = new Set(agents.map((agent) => agent.id));
  const childIds = new Set<string>();
  const edges = new Map<string, AgentGraph["edges"][number]>();

  agents.forEach((agent) => {
    agent.relations?.childAgentIds.forEach((childId) => {
      if (agentIds.has(childId)) {
        childIds.add(childId);
        edges.set(`${agent.id}-${childId}`, { id: `${agent.id}-${childId}`, fromId: agent.id, toId: childId, type: "child" });
      }
    });
    if (agent.relations?.parentAgentId && agentIds.has(agent.relations.parentAgentId)) {
      childIds.add(agent.id);
      edges.set(`${agent.relations.parentAgentId}-${agent.id}`, { id: `${agent.relations.parentAgentId}-${agent.id}`, fromId: agent.relations.parentAgentId, toId: agent.id, type: "child" });
    }
    agent.tasks?.forEach((task) => {
      edges.set(`${agent.id}-${task.id}`, { id: `${agent.id}-${task.id}`, fromId: agent.id, toId: task.id, type: "task" });
    });
  });

  const depthByAgent = new Map<string, number>();
  agents.forEach((agent) => {
    if (!childIds.has(agent.id)) {
      assignDepth(agent.id, 0, agents, depthByAgent);
    }
  });
  agents.forEach((agent) => {
    if (!depthByAgent.has(agent.id)) {
      assignDepth(agent.id, 0, agents, depthByAgent);
    }
  });

  const agentNodes: AgentGraph["nodes"] = agents.map((agent) => {
    const depth = depthByAgent.get(agent.id) ?? 0;
    return { id: agent.id, type: "agent", title: agent.name, subtitle: agent.status, status: agent.status, depth, agentId: agent.id };
  });
  const taskNodes: AgentGraph["nodes"] = agents.flatMap((agent) => {
    const depth = depthByAgent.get(agent.id) ?? 0;
    return (agent.tasks ?? []).map((task) => ({ id: task.id, type: "task" as const, title: task.title, subtitle: task.status, status: task.status, depth: depth + 1, agentId: agent.id }));
  });

  return { nodes: [...agentNodes, ...taskNodes], edges: Array.from(edges.values()) };
}

export function mapAgentProfile(item: unknown): AgentProfile {
  const profile = asRecord(item);
  return {
    id: stringValue(profile.id) ?? stringValue(profile.profileId) ?? "",
    name: stringValue(profile.name) ?? stringValue(profile.title) ?? "Agent profile",
    description: stringValue(profile.description) ?? stringValue(profile.summary),
    role: stringValue(profile.role) ?? stringValue(profile.persona),
    runtime: stringValue(profile.runtime) ?? stringValue(profile.model) ?? stringValue(profile.engine),
    location: stringValue(profile.location) ?? stringValue(profile.workspace),
    capabilities: stringList(profile.capabilities ?? profile.skills),
    defaultObjective: stringValue(profile.defaultObjective) ?? stringValue(profile.default_objective)
  };
}

export function mapAgentProfileList(result: unknown): AgentProfile[] {
  const source = Array.isArray(result) ? result : Array.isArray(asRecord(result).profiles) ? (asRecord(result).profiles as unknown[]) : [];
  const profiles = source.map(mapAgentProfile).filter((profile) => profile.id);
  return profiles.length ? profiles : defaultAgentProfiles;
}

export const defaultAgentProfiles: AgentProfile[] = [
  {
    id: "operator",
    name: "Operator",
    description: "Tracks active work, escalates blockers, and keeps the blackboard current.",
    role: "Operations",
    runtime: "Nexus",
    location: "Control plane",
    capabilities: ["monitoring", "status updates", "escalation"],
    defaultObjective: "Monitor the current workstream and surface anything that needs attention."
  },
  {
    id: "researcher",
    name: "Researcher",
    description: "Collects context, compares sources, and records decisions on the blackboard.",
    role: "Discovery",
    runtime: "Nexus",
    location: "Knowledge graph",
    capabilities: ["context gathering", "summaries", "references"],
    defaultObjective: "Research the requested topic and keep findings organized on the blackboard."
  },
  {
    id: "builder",
    name: "Builder",
    description: "Executes implementation steps and reports progress, artifacts, and blockers.",
    role: "Execution",
    runtime: "Workbench",
    location: "Operator console",
    capabilities: ["planning", "implementation", "artifact tracking"],
    defaultObjective: "Execute the requested implementation plan and report progress as blackboard updates."
  }
];

export function mapAgentDetail(result: unknown): AgentDetail {
  const source = asRecord(result);
  const summary = mapAgentSummary(source.agent ?? result);
  const blackboard = mapBlackboard(source.blackboard);
  const timeline = mapTimelineList(source.timeline ?? source.events, summary.id);
  const approvals = mapApprovalList(source.approvals, summary.id);
  return { ...summary, blackboard, timeline, approvals };
}

export function mapAgentTimelineEvent(item: unknown, fallbackAgentId: string): AgentTimelineEvent {
  const event = asRecord(item);
  const type = normalizeEventType(event.type ?? event.kind);
  return {
    id: stringValue(event.id) ?? `${type}-${stringValue(event.createdAt) ?? Date.now()}`,
    agentId: stringValue(event.agentId) ?? stringValue(event.agent_id) ?? fallbackAgentId,
    type,
    title: stringValue(event.title) ?? defaultEventTitle(type),
    body: stringValue(event.body) ?? stringValue(event.message) ?? stringValue(event.summary),
    createdAt: stringValue(event.createdAt) ?? stringValue(event.created_at) ?? new Date().toISOString(),
    severity: normalizeSeverity(event.severity),
    approval: event.approval ? mapAgentApproval(event.approval, fallbackAgentId) : undefined,
    artifact: event.artifact ? mapArtifact(event.artifact) : undefined
  };
}

export function mapAgentApproval(item: unknown, fallbackAgentId = ""): AgentApprovalRequest {
  const approval = asRecord(item);
  const status = String(approval.status ?? "pending").toLowerCase();
  return {
    id: stringValue(approval.id) ?? stringValue(approval.approvalId) ?? "",
    agentId: stringValue(approval.agentId) ?? stringValue(approval.agent_id) ?? fallbackAgentId,
    title: stringValue(approval.title) ?? "Approval requested",
    body: stringValue(approval.body) ?? stringValue(approval.message) ?? "Review this request before the agent continues.",
    risk: normalizeRisk(approval.risk),
    confirmLabel: stringValue(approval.confirmLabel) ?? stringValue(approval.confirm_label),
    cancelLabel: stringValue(approval.cancelLabel) ?? stringValue(approval.cancel_label),
    requestedAt: stringValue(approval.requestedAt) ?? stringValue(approval.createdAt),
    expiresAt: stringValue(approval.expiresAt),
    status: status === "approved" ? "approved" : status === "rejected" ? "rejected" : "pending"
  };
}

function mapBlackboard(value: unknown): AgentBlackboard {
  const blackboard = asRecord(value);
  return {
    objective: stringValue(blackboard.objective) ?? stringValue(blackboard.goal),
    plan: stringList(blackboard.plan ?? blackboard.steps ?? blackboard.currentPlan ?? blackboard.current_plan),
    activeStep: stringValue(blackboard.activeStep) ?? stringValue(blackboard.active_step) ?? stringValue(blackboard.currentStep) ?? stringValue(blackboard.current_step),
    decisions: recordList(blackboard.decisions ?? blackboard.decisionLog ?? blackboard.decision_log).map(mapDecision),
    blockers: stringList(blackboard.blockers ?? blackboard.issues ?? blackboard.blockingIssues ?? blackboard.blocking_issues),
    artifacts: recordList(blackboard.artifacts ?? blackboard.outputs ?? blackboard.files).map(mapArtifact),
    contextReferences: recordList(blackboard.contextReferences ?? blackboard.context_references ?? blackboard.references ?? blackboard.sources).map(mapReference),
    recentUpdates: stringList(blackboard.recentUpdates ?? blackboard.recent_updates ?? blackboard.updates ?? blackboard.activity),
    updatedAt: stringValue(blackboard.updatedAt) ?? stringValue(blackboard.updated_at)
  };
}

function mapTimelineList(value: unknown, fallbackAgentId: string) {
  return (Array.isArray(value) ? value : []).map((item) => mapAgentTimelineEvent(item, fallbackAgentId)).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

function mapApprovalList(value: unknown, fallbackAgentId: string) {
  return (Array.isArray(value) ? value : []).map((item) => mapAgentApproval(item, fallbackAgentId));
}

function mapRelations(agent: RawRecord) {
  const parentAgentId = stringValue(agent.parentAgentId) ?? stringValue(agent.parent_agent_id) ?? stringValue(agent.parentId) ?? stringValue(agent.parent_id);
  const childAgentIds = stringList(agent.childAgentIds ?? agent.child_agent_ids ?? agent.children ?? agent.childAgents);
  const taskIds = stringList(agent.taskIds ?? agent.task_ids);
  const taskList = mapTaskList(agent.tasks ?? agent.taskList ?? agent.task_list);
  const relations = {
    parentAgentId,
    childAgentIds,
    taskIds: taskIds.length ? taskIds : (taskList ?? []).map((task) => task.id)
  };
  return relations.parentAgentId || relations.childAgentIds.length || relations.taskIds.length ? relations : undefined;
}

function mapTaskList(value: unknown): AgentTask[] | undefined {
  const tasks = recordList(value)
    .map((task) => compactTask({
      id: stringValue(task.id) ?? stringValue(task.taskId) ?? stringValue(task.task_id) ?? "",
      title: stringValue(task.title) ?? stringValue(task.name) ?? stringValue(task.objective) ?? "Task",
      status: normalizeOptionalStatus(task.status ?? task.state),
      summary: stringValue(task.summary) ?? stringValue(task.description)
    }))
    .filter((task) => task.id);
  return tasks.length ? tasks : undefined;
}

function assignDepth(agentId: string, depth: number, agents: AgentSummary[], depthByAgent: Map<string, number>) {
  const currentDepth = depthByAgent.get(agentId);
  if (currentDepth !== undefined && currentDepth <= depth) {
    return;
  }
  depthByAgent.set(agentId, depth);
  const agent = agents.find((item) => item.id === agentId);
  agent?.relations?.childAgentIds.forEach((childId) => assignDepth(childId, depth + 1, agents, depthByAgent));
  agents.filter((item) => item.relations?.parentAgentId === agentId).forEach((child) => assignDepth(child.id, depth + 1, agents, depthByAgent));
}

function mapDecision(item: RawRecord): AgentDecision {
  return {
    id: stringValue(item.id) ?? `decision-${stringValue(item.createdAt) ?? Date.now()}`,
    title: stringValue(item.title) ?? stringValue(item.summary) ?? "Decision",
    rationale: stringValue(item.rationale) ?? stringValue(item.reason),
    createdAt: stringValue(item.createdAt) ?? stringValue(item.created_at)
  };
}

function mapArtifact(item: unknown): AgentArtifact {
  const artifact = asRecord(item);
  return {
    id: stringValue(artifact.id) ?? `artifact-${stringValue(artifact.createdAt) ?? Date.now()}`,
    title: stringValue(artifact.title) ?? stringValue(artifact.name) ?? "Artifact",
    type: stringValue(artifact.type) ?? stringValue(artifact.kind),
    url: stringValue(artifact.url) ?? stringValue(artifact.href),
    summary: stringValue(artifact.summary),
    createdAt: stringValue(artifact.createdAt) ?? stringValue(artifact.created_at)
  };
}

function mapReference(item: RawRecord): AgentContextReference {
  return {
    id: stringValue(item.id) ?? stringValue(item.url) ?? stringValue(item.href) ?? `reference-${Date.now()}`,
    title: stringValue(item.title) ?? stringValue(item.name) ?? stringValue(item.url) ?? stringValue(item.href) ?? "Reference",
    type: stringValue(item.type) ?? stringValue(item.kind),
    url: stringValue(item.url) ?? stringValue(item.href),
    summary: stringValue(item.summary)
  };
}

function mapProgress(value: unknown) {
  const progress = asRecord(value);
  const current = numberValue(progress.current ?? progress.done);
  const total = numberValue(progress.total);
  const percent = numberValue(progress.percent ?? progress.percentage);
  if (current === undefined && total === undefined && percent === undefined && !progress.label) {
    return undefined;
  }
  return { current, total, percent, label: stringValue(progress.label) };
}

function normalizeEventType(value: unknown): AgentTimelineEventType {
  const normalized = String(value ?? "log").trim().toLowerCase().replace(/[-\s]+/g, "_");
  return eventTypes.includes(normalized as AgentTimelineEventType) ? (normalized as AgentTimelineEventType) : "log";
}

function normalizeSeverity(value: unknown) {
  const normalized = String(value ?? "info").toLowerCase();
  return normalized === "warning" || normalized === "error" ? normalized : "info";
}

function normalizeOptionalStatus(value: unknown): AgentStatus | undefined {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }
  return normalizeAgentStatus(value);
}

function normalizeRisk(value: unknown) {
  const normalized = String(value ?? "").toLowerCase();
  return normalized === "low" || normalized === "medium" || normalized === "high" ? normalized : undefined;
}

function defaultEventTitle(type: AgentTimelineEventType) {
  switch (type) {
    case "blackboard":
      return "Blackboard updated";
    case "message":
      return "Message";
    case "approval":
      return "Approval requested";
    case "artifact":
      return "Artifact produced";
    case "error":
      return "Error";
    default:
      return "Activity";
  }
}

function asRecord(value: unknown): RawRecord {
  return value && typeof value === "object" ? (value as RawRecord) : {};
}

function recordList(value: unknown): RawRecord[] {
  return Array.isArray(value) ? value.map(asRecord) : [];
}

function stringList(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.map((item) => stringValue(item)).filter(Boolean) as string[];
}

function stringValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function numberValue(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function booleanValue(value: unknown) {
  return typeof value === "boolean" ? value : undefined;
}

function compactTask(task: AgentTask): AgentTask {
  return Object.fromEntries(Object.entries(task).filter(([, value]) => value !== undefined)) as AgentTask;
}
