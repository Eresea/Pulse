import type {
  AgentApprovalRequest,
  AgentBlackboard,
  AgentContextReference,
  AgentDecision,
  AgentDetail,
  AgentProfile,
  AgentStatus,
  AgentSummary,
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
    updatedAt: stringValue(agent.updatedAt) ?? stringValue(agent.updated_at) ?? stringValue(agent.lastActivityAt)
  };
}

export function mapAgentList(result: unknown): AgentSummary[] {
  const source = Array.isArray(result) ? result : Array.isArray(asRecord(result).agents) ? (asRecord(result).agents as unknown[]) : [];
  return source.map(mapAgentSummary).filter((agent) => agent.id);
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
