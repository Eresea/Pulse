import { appConfig } from "@/config/app-config";
import { aiDebugLog } from "@/services/ai-debug-log";
import { rootsApi } from "@/services/roots-api";
import { tokenStore } from "@/services/token-store";
import type { AiChatMessage, AiChatModel, AiChatRole, AiChatStreamEvent, AiChatThread } from "@/services/types";

type SendMessageOptions = {
  threadId: string;
  messages: AiChatMessage[];
  modelId?: string;
  traceId?: string;
  onEvent: (event: AiChatStreamEvent) => void;
};

type RawThread = Partial<AiChatThread> & {
  id?: string;
  threadId?: string;
  name?: string;
  summary?: string;
  preview?: string;
  lastMessage?: string;
  lastMessagePreview?: string;
  lastActivityAt?: string;
  updatedAt?: string;
  createdAt?: string;
};

type RawMessage = Partial<AiChatMessage> & {
  id?: string;
  messageId?: string;
  role?: AiChatRole | string;
  content?: string;
  text?: string;
  createdAt?: string;
  sentAt?: string;
};

type RawModel = Partial<AiChatModel> & {
  modelId?: string;
  displayName?: string;
  defaultModel?: boolean;
};

function mapThread(thread: RawThread): AiChatThread {
  const id = thread.id ?? thread.threadId ?? "";
  return {
    id,
    title: thread.title ?? thread.name ?? "New chat",
    preview: thread.preview ?? thread.lastMessagePreview ?? thread.lastMessage,
    lastActivityAt: thread.lastActivityAt ?? thread.updatedAt ?? thread.createdAt,
    unreadCount: thread.unreadCount,
    status: thread.status
  };
}

function mapMessage(message: RawMessage): AiChatMessage {
  return {
    id: message.id ?? message.messageId ?? `message-${Date.now()}`,
    threadId: message.threadId ?? "",
    role: normalizeRole(message.role),
    content: message.content ?? message.text ?? "",
    createdAt: message.createdAt ?? message.sentAt ?? new Date().toISOString(),
    status: message.status
  };
}

function normalizeRole(role: RawMessage["role"]): AiChatRole {
  if (role === "user" || role === "assistant" || role === "system") {
    return role;
  }
  return "assistant";
}

function normalizeMessageList(result: unknown, threadId: string): AiChatMessage[] {
  const source = Array.isArray(result) ? result : Array.isArray((result as { messages?: unknown[] })?.messages) ? (result as { messages: unknown[] }).messages : [];
  return source.map((item) => ({ ...mapMessage(item as RawMessage), threadId }));
}

function normalizeThreadList(result: unknown): AiChatThread[] {
  const source = Array.isArray(result) ? result : Array.isArray((result as { threads?: unknown[] })?.threads) ? (result as { threads: unknown[] }).threads : [];
  return source.map((item) => mapThread(item as RawThread)).filter((thread) => thread.id);
}

function normalizeModelList(result: unknown): AiChatModel[] {
  const source = Array.isArray(result) ? result : Array.isArray((result as { models?: unknown[] })?.models) ? (result as { models: unknown[] }).models : [];
  return source
    .map((item) => {
      const model = item as RawModel;
      return {
        id: model.id ?? model.modelId ?? "",
        name: model.name ?? model.displayName ?? model.id ?? model.modelId ?? "AI model",
        provider: model.provider,
        description: model.description,
        defaultModel: model.defaultModel
      };
    })
    .filter((model) => model.id);
}

export function parseAiStreamPayload(payload: string, eventType?: string): AiChatStreamEvent | null {
  if (!payload.trim() || payload === "[DONE]") {
    return payload === "[DONE]" ? { type: "done" } : null;
  }

  try {
    const event = JSON.parse(payload) as Omit<Partial<AiChatStreamEvent>, "type"> & {
      type?: string;
      delta?: string;
      text?: string;
      content?: string;
      output_text?: string;
      error?: { message?: string } | string;
      thread?: RawThread;
      message?: RawMessage;
    };
    const type = event.type ?? eventType;

    const choiceDelta = (event as { choices?: { delta?: { content?: string }; text?: string }[] }).choices?.[0];
    if (choiceDelta?.delta?.content || choiceDelta?.text) {
      return { type: "delta", delta: choiceDelta.delta?.content ?? choiceDelta.text ?? "" };
    }
    if (type === "thread" && event.thread) {
      return { type: "thread", thread: mapThread(event.thread) };
    }
    if (type === "message" && event.message) {
      return { type: "message", message: mapMessage(event.message) };
    }
    if (type === "delta" || type === "response.output_text.delta" || type === "response.text.delta") {
      return { type: "delta", delta: event.delta ?? event.text ?? event.content ?? event.output_text ?? "" };
    }
    if (type === "done" || type === "response.completed" || type === "response.done") {
      return { type: "done" };
    }
    if (type === "error" || type === "response.failed") {
      const message = typeof event.error === "string" ? event.error : event.error?.message ?? event.content ?? event.text;
      return { type: "error", message: formatStreamErrorCode(message) ?? "Nexus AI request failed." };
    }
    if (event.delta || event.text || event.content || event.output_text) {
      return { type: "delta", delta: event.delta ?? event.text ?? event.content ?? event.output_text ?? "" };
    }
    if (event.thread) {
      return { type: "thread", thread: mapThread(event.thread) };
    }
    if (event.message) {
      return { type: "message", message: mapMessage(event.message) };
    }
  } catch {
    return { type: "delta", delta: payload };
  }

  return null;
}

function formatStreamErrorCode(code?: string) {
  switch (code) {
    case "invalid_request":
      return "Nexus rejected the AI request.";
    case "not_found":
      return "The selected Nexus AI model was not found.";
    case "openrouter_not_configured":
      return "Nexus AI is not configured.";
    case "openrouter_upstream_error":
      return "Nexus AI provider returned an error.";
    case "openrouter_empty_response":
      return "Nexus AI provider returned an empty response.";
    case "internal_error":
      return "Nexus returned an internal error.";
    default:
      return code;
  }
}

export function parseAiStreamChunk(chunk: string, remainder: string) {
  const combined = remainder + chunk;
  const lines = combined.split(/\r?\n/);
  return {
    lines: lines.slice(0, -1),
    remainder: lines.at(-1) ?? ""
  };
}

function logStreamEvent(event: AiChatStreamEvent, traceId: string | undefined, modelId: string, final = false) {
  aiDebugLog.add({
    level: event.type === "error" ? "error" : "debug",
    event: `stream.${event.type}`,
    traceId,
    modelId,
    message: event.type === "error" ? event.message : undefined,
    metadata: event.type === "delta" ? { deltaLength: event.delta.length, final } : final ? { final } : undefined
  });
}

function handleBufferedStreamEvent(event: AiChatStreamEvent, traceId: string | undefined, modelId: string, onEvent: (event: AiChatStreamEvent) => void, counts: { eventCount: number; deltaCount: number }, final = false) {
  counts.eventCount += 1;
  if (event.type === "delta") {
    counts.deltaCount += 1;
  }
  logStreamEvent(event, traceId, modelId, final);
  onEvent(event);
}

function parseBufferedStreamText(text: string, traceId: string | undefined, modelId: string, onEvent: (event: AiChatStreamEvent) => void) {
  let pendingEventType: string | undefined;
  const counts = { eventCount: 0, deltaCount: 0 };
  const blocks = text.split(/\r?\n\r?\n/);

  blocks.forEach((block) => {
    block.split(/\r?\n/).forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith(":")) {
        return;
      }
      if (trimmed.startsWith("event:")) {
        pendingEventType = trimmed.slice(6).trim();
        return;
      }
      const normalized = trimmed.startsWith("data:") ? trimmed.slice(5).trimStart() : trimmed;
      const event = parseAiStreamPayload(normalized, pendingEventType);
      pendingEventType = undefined;
      if (event) {
        handleBufferedStreamEvent(event, traceId, modelId, onEvent, counts, true);
      }
    });
  });

  return counts;
}

export const aiChatService = {
  async listModels(): Promise<AiChatModel[]> {
    return normalizeModelList(await rootsApi.request(appConfig.ai.models));
  },

  async listThreads(): Promise<AiChatThread[]> {
    return normalizeThreadList(await rootsApi.request(appConfig.ai.threads));
  },

  async createThread(): Promise<AiChatThread> {
    return mapThread(await rootsApi.request(appConfig.ai.threads, {
      method: "POST",
      body: JSON.stringify({ title: "New chat" })
    }));
  },

  async listMessages(threadId: string): Promise<AiChatMessage[]> {
    return normalizeMessageList(await rootsApi.request(appConfig.ai.messages(threadId)), threadId);
  },

  async sendMessageStream({ threadId, messages, modelId, traceId, onEvent }: SendMessageOptions): Promise<void> {
    const resolvedModelId = modelId ?? (await aiChatService.listModels())[0]?.id;
    if (!resolvedModelId) {
      throw new Error("No Nexus AI model is available.");
    }

    const headers = new Headers({
      Accept: "text/event-stream, application/x-ndjson, application/json",
      "Content-Type": "application/json"
    });
    const token = await tokenStore.getAccessToken();
    if (token) {
      headers.set("Authorization", token.startsWith("Bearer ") ? token : `Bearer ${token}`);
    }
    if (traceId) {
      headers.set("X-Pulse-Trace-Id", traceId);
    }

    const requestMessages = messages
      .filter((message) => message.role !== "system" || message.content.trim())
      .map((message) => ({ role: message.role, content: message.content }));

    aiDebugLog.add({
      event: "request.sent",
      traceId,
      modelId: resolvedModelId,
      metadata: {
        messageCount: requestMessages.length,
        roles: requestMessages.map((message) => message.role).join(","),
        contentLength: requestMessages.reduce((sum, message) => sum + message.content.length, 0)
      }
    });

    let response = await rootsApi.authenticatedFetch(appConfig.ai.chatStream, {
      method: "POST",
      headers,
      body: JSON.stringify({
        threadId,
        modelId: resolvedModelId,
        messages: requestMessages
      })
    });

    if (response.status === 401) {
      const nextToken = await rootsApi.refreshAccessToken();
      if (nextToken) {
        headers.set("Authorization", nextToken.startsWith("Bearer ") ? nextToken : `Bearer ${nextToken}`);
        response = await rootsApi.authenticatedFetch(appConfig.ai.chatStream, {
          method: "POST",
          headers,
          body: JSON.stringify({
            threadId,
            modelId: resolvedModelId,
            messages: requestMessages
          })
        });
      }
    }

    aiDebugLog.add({
      event: "response.status",
      traceId,
      modelId: resolvedModelId,
      metadata: {
        status: response.status,
        ok: response.ok,
        contentType: response.headers.get("Content-Type")
      }
    });

    if (!response.ok) {
      const detail = await response.text();
      aiDebugLog.add({
        level: "error",
        event: "response.error",
        traceId,
        modelId: resolvedModelId,
        message: detail || `Nexus AI request failed with ${response.status}`,
        metadata: { status: response.status }
      });
      throw new Error(detail || `Nexus AI request failed with ${response.status}`);
    }

    if (!response.body) {
      aiDebugLog.add({ level: "warn", event: "response.buffered_body", traceId, modelId: resolvedModelId });
      const text = await response.text();
      const counts = parseBufferedStreamText(text, traceId, resolvedModelId, onEvent);
      aiDebugLog.add({
        event: "stream.completed",
        traceId,
        modelId: resolvedModelId,
        metadata: { chunkCount: 0, eventCount: counts.eventCount, deltaCount: counts.deltaCount, buffered: true, bodyLength: text.length }
      });
      onEvent({ type: "done" });
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let remainder = "";
    let pendingEventType: string | undefined;
    let chunkCount = 0;
    let eventCount = 0;
    let deltaCount = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }

      chunkCount += 1;
      const parsed = parseAiStreamChunk(decoder.decode(value, { stream: true }), remainder);
      remainder = parsed.remainder;

      parsed.lines.forEach((line) => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith(":")) {
          return;
        }
        if (trimmed.startsWith("event:")) {
          pendingEventType = trimmed.slice(6).trim();
          return;
        }
        const normalized = trimmed.startsWith("data:") ? trimmed.slice(5).trimStart() : trimmed;
        const event = parseAiStreamPayload(normalized, pendingEventType);
        pendingEventType = undefined;
        if (event) {
          eventCount += 1;
          if (event.type === "delta") {
            deltaCount += 1;
          }
          logStreamEvent(event, traceId, resolvedModelId);
          onEvent(event);
        }
      });
    }

    const finalText = `${remainder}${decoder.decode()}`.trim();
    if (finalText) {
      const event = parseAiStreamPayload(finalText.startsWith("data:") ? finalText.slice(5).trimStart() : finalText, pendingEventType);
      if (event) {
        eventCount += 1;
        if (event.type === "delta") {
          deltaCount += 1;
        }
        logStreamEvent(event, traceId, resolvedModelId, true);
        onEvent(event);
      }
    }
    aiDebugLog.add({
      event: "stream.completed",
      traceId,
      modelId: resolvedModelId,
      metadata: { chunkCount, eventCount, deltaCount }
    });
    onEvent({ type: "done" });
  }
};
