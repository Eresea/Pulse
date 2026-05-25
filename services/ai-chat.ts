import { appConfig } from "@/config/app-config";
import { aiDebugLog } from "@/services/ai-debug-log";
import { mapMessage, mapThread, parseAiStreamChunk, parseAiStreamPayload } from "@/services/ai-stream-parser";
import { normalizeAiThreadTitle } from "@/services/ai-thread-title";
import { rootsApi } from "@/services/roots-api";
import { tokenStore } from "@/services/token-store";
import type { AiChatAttachment, AiChatFile, AiChatMessage, AiChatModel, AiChatRole, AiChatStreamEvent, AiChatThread, AiChatTimelineEvent } from "@/services/types";

type SendMessageOptions = {
  threadId: string;
  messages: AiChatMessage[];
  modelId?: string;
  traceId?: string;
  attachments?: AiChatAttachment[];
  onEvent: (event: AiChatStreamEvent) => void;
};

type UploadFileInput = {
  uri: string;
  name: string;
  mimeType?: string;
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

function normalizeTimelineEvent(item: unknown, fallbackThreadId: string): AiChatTimelineEvent | null {
  const event = item as {
    id?: string;
    threadId?: string;
    createdAt?: string;
    type?: string;
    status?: string;
    title?: string;
    message?: string;
    toolCall?: unknown;
    result?: unknown;
    confirmation?: unknown;
    response?: unknown;
    file?: unknown;
    reference?: unknown;
    usage?: unknown;
  };
  const id = event.id ?? `${event.type ?? "event"}-${event.createdAt ?? Date.now()}`;
  const threadId = event.threadId ?? fallbackThreadId;
  const createdAt = event.createdAt ?? new Date().toISOString();
  const parsed =
    event.type === "status"
      ? parseAiStreamPayload(JSON.stringify({ type: "status", status: event.status, title: event.title, message: event.message }), "status")
      : event.type === "tool_call"
        ? parseAiStreamPayload(JSON.stringify({ type: "tool_call", ...(event.toolCall as object) }), "tool_call")
        : event.type === "tool_result"
          ? parseAiStreamPayload(JSON.stringify({ type: "tool_result", ...(event.result as object) }), "tool_result")
          : event.type === "confirmation_request"
            ? parseAiStreamPayload(JSON.stringify({ type: "confirmation_request", ...(event.confirmation as object) }), "confirmation_request")
            : event.type === "confirmation_response"
              ? parseAiStreamPayload(JSON.stringify({ type: "confirmation_response", ...(event.response as object) }), "confirmation_response")
              : event.type === "file"
                ? parseAiStreamPayload(JSON.stringify({ type: "file", file: event.file }), "file")
                : event.type === "reference"
                  ? parseAiStreamPayload(JSON.stringify({ type: "reference", reference: event.reference }), "reference")
                  : event.type === "usage"
                    ? parseAiStreamPayload(JSON.stringify({ type: "usage", usage: event.usage }), "usage")
                    : event.type === "error"
                      ? ({ type: "error", message: event.message ?? "Nexus AI request failed." } as const)
                      : null;
  if (!parsed || parsed.type === "thread" || parsed.type === "message" || parsed.type === "delta" || parsed.type === "done") {
    return null;
  }
  return { id, threadId, createdAt, event: parsed };
}

export { parseAiStreamChunk, parseAiStreamPayload };

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

  async renameThread(threadId: string, title: string): Promise<AiChatThread> {
    const normalizedTitle = normalizeAiThreadTitle(title);
    if (!normalizedTitle) {
      throw new Error("Thread title cannot be empty.");
    }
    return mapThread(await rootsApi.request(appConfig.ai.thread(threadId), {
      method: "PATCH",
      body: JSON.stringify({ title: normalizedTitle })
    }));
  },

  async listMessages(threadId: string): Promise<AiChatMessage[]> {
    return normalizeMessageList(await rootsApi.request(appConfig.ai.messages(threadId)), threadId);
  },

  async listTimelineEvents(threadId: string): Promise<AiChatTimelineEvent[]> {
    const result = await rootsApi.request<{ events?: unknown[] } | unknown[]>(appConfig.ai.events(threadId));
    const source = Array.isArray(result) ? result : Array.isArray(result.events) ? result.events : [];
    return source.map((item) => normalizeTimelineEvent(item, threadId)).filter(Boolean) as AiChatTimelineEvent[];
  },

  async respondToConfirmation(confirmationId: string, accepted: boolean) {
    return rootsApi.request(appConfig.ai.confirmation(confirmationId), {
      method: "POST",
      body: JSON.stringify({ accepted })
    });
  },

  async uploadFile(file: UploadFileInput): Promise<AiChatFile> {
    const form = new FormData();
    form.append("originApp", "pulse");
    form.append("file", {
      uri: file.uri,
      name: file.name,
      type: file.mimeType ?? "application/octet-stream"
    } as unknown as Blob);
    return rootsApi.request<AiChatFile>(appConfig.ai.files, {
      method: "POST",
      body: form,
      headers: {
        Accept: "application/json"
      }
    });
  },

  async sendMessageStream({ threadId, messages, modelId, traceId, attachments, onEvent }: SendMessageOptions): Promise<void> {
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
        originApp: "pulse",
        attachments,
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
            originApp: "pulse",
            attachments,
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
