import { appConfig } from "@/config/app-config";
import { defaultAgentProfiles, mapAgentApproval, mapAgentDetail, mapAgentProfileList, mapAgentTimelineEvent, mapBlackboardAgents } from "@/services/agents-mapper";
import { rootsApi } from "@/services/roots-api";
import type { AgentApprovalResponse, AgentDetail, AgentInstructionRequest, AgentProfile, AgentSpawnRequest, AgentSummary, AgentTimelineEvent } from "@/services/types";

export { buildAgentGraph, defaultAgentProfiles, mapAgentApproval, mapAgentDetail, mapAgentList, mapAgentProfile, mapAgentProfileList, mapAgentSummary, mapAgentTimelineEvent, mapBlackboardAgents, normalizeAgentStatus } from "@/services/agents-mapper";

type Board = { id: string };
type Objective = { id: string; blackboardId: string; agentId: string; prompt: string; status: string };

async function boards(): Promise<Board[]> {
  const result = await rootsApi.request<{ blackboards?: Board[] }>(appConfig.agents.boards);
  return result.blackboards ?? [];
}

async function boardAgents(board: Board): Promise<AgentSummary[]> {
  const [detail, objectives] = await Promise.all([
    rootsApi.request(appConfig.agents.board(board.id)),
    rootsApi.request<{ objectives?: Objective[] }>(appConfig.agents.objectives(board.id))
  ]);
  return mapBlackboardAgents(detail, objectives.objectives ?? []);
}

async function locate(agentId: string): Promise<AgentSummary | undefined> {
  const groups = await Promise.all((await boards()).map(boardAgents));
  return groups.flat().find(agent => agent.id === agentId);
}

export const agentService = {
  async listAgents(): Promise<AgentSummary[]> {
    return (await Promise.all((await boards()).map(boardAgents))).flat();
  },
  async listProfiles(): Promise<AgentProfile[]> {
    try { return mapAgentProfileList(await rootsApi.request(appConfig.agents.profiles)); }
    catch (err) { if (/404|not found|not_found/i.test(String(err))) return defaultAgentProfiles; throw err; }
  },
  async getAgent(agentId: string): Promise<AgentDetail> {
    const agent = await locate(agentId);
    if (!agent?.blackboardId) throw new Error("Agent not found.");
    const [detail, objectiveDetail, plans] = await Promise.all([
      rootsApi.request<Record<string, unknown>>(appConfig.agents.board(agent.blackboardId)),
      agent.objectiveId ? rootsApi.request<Record<string, unknown>>(appConfig.agents.objective(agent.blackboardId, agent.objectiveId)) : Promise.resolve({}),
      agent.objectiveId ? rootsApi.request<{ plans?: Record<string, unknown>[] }>(appConfig.agents.plan(agent.objectiveId)) : Promise.resolve({ plans: [] as Record<string, unknown>[] })
    ]);
    const planList = Array.isArray(plans.plans) ? plans.plans as Record<string, unknown>[] : [];
    const latestPlan = planList.at(-1);
    return mapAgentDetail({ agent, blackboard: { ...objectiveDetail, objective: agent.objective, plan: Array.isArray(latestPlan?.steps) ? latestPlan.steps.map(step => String((step as Record<string, unknown>).title ?? "")) : [] }, events: (detail as { events?: unknown[] }).events ?? [] });
  },
  async spawnAgent(request: AgentSpawnRequest): Promise<AgentDetail> {
    const board = request.blackboardId ? { id: request.blackboardId } : (await boards())[0];
    if (!board) throw new Error("Create a Blackboard before spawning an agent.");
    const agent = await rootsApi.request<{ id: string }>(appConfig.agents.instances(board.id), { method: "POST", body: JSON.stringify({ profileId: request.profileId ?? "builtin_planner", x: 120, y: 120 }) });
    await rootsApi.request(appConfig.agents.objectives(board.id), { method: "POST", body: JSON.stringify({ agentId: agent.id, prompt: request.objective, source: "pulse", desiredOutput: "summary and artifacts", approvalPolicy: "supervised" }) });
    return this.getAgent(agent.id);
  },
  async sendInstruction(agentId: string, request: AgentInstructionRequest): Promise<AgentTimelineEvent | undefined> {
    const agent = await locate(agentId); if (!agent?.blackboardId) throw new Error("Agent not found.");
    const result = await rootsApi.request(appConfig.agents.commands(agent.blackboardId), { method: "POST", body: JSON.stringify({ type: "agent.message", workspaceId: agent.blackboardId, targetType: "agent", targetId: agentId, payload: { message: request.message } }) });
    return mapAgentTimelineEvent(result, agentId);
  },
  async pauseAgent(agentId: string) { return change(agentId, "pause"); },
  async resumeAgent(agentId: string) { return change(agentId, "resume"); },
  async stopAgent(agentId: string) { return change(agentId, "cancel"); },
  async respondToApproval(_approvalId: string, _response: AgentApprovalResponse) {
    throw new Error("Planner approval correlation is not available in the current Blackboard objective response.");
  }
};

async function change(agentId: string, action: "pause" | "resume" | "cancel") {
  const agent = await locate(agentId);
  if (!agent?.objectiveId) throw new Error("Agent has no active objective.");
  await rootsApi.request(appConfig.agents.objectiveAction(agent.objectiveId, action), { method: "POST", body: "{}" });
  return agentService.getAgent(agentId);
}
