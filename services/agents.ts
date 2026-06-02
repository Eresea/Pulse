import { appConfig } from "@/config/app-config";
import { defaultAgentProfiles, mapAgentApproval, mapAgentDetail, mapAgentList, mapAgentProfileList, mapAgentTimelineEvent } from "@/services/agents-mapper";
import { rootsApi } from "@/services/roots-api";
import type { AgentApprovalResponse, AgentDetail, AgentInstructionRequest, AgentProfile, AgentSpawnRequest, AgentSummary, AgentTimelineEvent } from "@/services/types";

export { defaultAgentProfiles, mapAgentApproval, mapAgentDetail, mapAgentList, mapAgentProfile, mapAgentProfileList, mapAgentSummary, mapAgentTimelineEvent, normalizeAgentStatus } from "@/services/agents-mapper";

export const agentService = {
  async listAgents(): Promise<AgentSummary[]> {
    return mapAgentList(await rootsApi.request(appConfig.agents.list));
  },

  async listProfiles(): Promise<AgentProfile[]> {
    try {
      return mapAgentProfileList(await rootsApi.request(appConfig.agents.profiles));
    } catch (err) {
      if (/404|not found|not_found/i.test(err instanceof Error ? err.message : String(err))) {
        return defaultAgentProfiles;
      }
      throw err;
    }
  },

  async getAgent(agentId: string): Promise<AgentDetail> {
    return mapAgentDetail(await rootsApi.request(appConfig.agents.detail(agentId)));
  },

  async spawnAgent(request: AgentSpawnRequest): Promise<AgentDetail> {
    return mapAgentDetail(await rootsApi.request(appConfig.agents.list, {
      method: "POST",
      body: JSON.stringify(request)
    }));
  },

  async sendInstruction(agentId: string, request: AgentInstructionRequest): Promise<AgentTimelineEvent | undefined> {
    const result = await rootsApi.request<unknown>(appConfig.agents.messages(agentId), {
      method: "POST",
      body: JSON.stringify(request)
    });
    return result ? mapAgentTimelineEvent(result, agentId) : undefined;
  },

  async pauseAgent(agentId: string): Promise<AgentDetail | undefined> {
    return mapOptionalDetail(await rootsApi.request(appConfig.agents.pause(agentId), { method: "POST" }));
  },

  async resumeAgent(agentId: string): Promise<AgentDetail | undefined> {
    return mapOptionalDetail(await rootsApi.request(appConfig.agents.resume(agentId), { method: "POST" }));
  },

  async stopAgent(agentId: string): Promise<AgentDetail | undefined> {
    return mapOptionalDetail(await rootsApi.request(appConfig.agents.stop(agentId), { method: "POST" }));
  },

  async respondToApproval(approvalId: string, response: AgentApprovalResponse) {
    const result = await rootsApi.request<unknown>(appConfig.agents.approval(approvalId), {
      method: "POST",
      body: JSON.stringify(response)
    });
    return result ? mapAgentApproval(result) : undefined;
  }
};

function mapOptionalDetail(result: unknown): AgentDetail | undefined {
  return result ? mapAgentDetail(result) : undefined;
}
