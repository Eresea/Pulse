import { appConfig } from "@/config/app-config";
import { rootsApi } from "@/services/roots-api";
import { tokenStore } from "@/services/token-store";
import type { AiChatMessage, AiChatModel, AiChatRole, AiChatStreamEvent, AiChatThread } from "@/services/types";

type SendMessageOptions = {
  messages: AiChatMessage[];
  modelId?: string;
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

function normalizeModelList(result: unknown): AiChatModel[] {
  const source = Array.isArray(result) ? result : Array.isArray((result as { models?: unknown[] })?.models) ? (result as { models: unknown[] }).models : [];
  return source
    .map((item) => {
      const model = item as RawModel;
      return {
        id: model.id ?? model.modelId ?? "",
        name: model.name ?? model.displayName ?? model.id ?? model.modelId ?? "AI model",
        provider: model.provider,
        description: model.description
      };
    })
    .filter((model) => model.id);
}

function parseStreamPayload(payload: string): AiChatStreamEvent | null {
  if (!payload.trim() || payload === "[DONE]") {
    return payload === "[DONE]" ? { type: "done" } : null;
  }

  try {
    const event = JSON.parse(payload) as Partial<AiChatStreamEvent> & {
      delta?: string;
      text?: string;
      content?: string;
      thread?: RawThread;
      message?: RawMessage;
    };

    if (event.type) {
      return event as AiChatStreamEvent;
    }
    const choiceDelta = (event as { choices?: { delta?: { content?: string }; text?: string }[] }).choices?.[0];
    if (choiceDelta?.delta?.content || choiceDelta?.text) {
      return { type: "delta", delta: choiceDelta.delta?.content ?? choiceDelta.text ?? "" };
    }
    if (event.delta || event.text || event.content) {
      return { type: "delta", delta: event.delta ?? event.text ?? event.content ?? "" };
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

function parseStreamChunk(chunk: string, remainder: string) {
  const combined = remainder + chunk;
  const lines = combined.split(/\r?\n/);
  return {
    lines: lines.slice(0, -1),
    remainder: lines.at(-1) ?? ""
  };
}

export const aiChatService = {
  async listModels(): Promise<AiChatModel[]> {
    return normalizeModelList(await rootsApi.request(appConfig.ai.models));
  },

  async listThreads(): Promise<AiChatThread[]> {
    return [];
  },

  async createThread(): Promise<AiChatThread> {
    const now = new Date().toISOString();
    return {
      id: `local-thread-${Date.now()}`,
      title: "New chat",
      lastActivityAt: now,
      status: "idle"
    };
  },

  async listMessages(threadId: string): Promise<AiChatMessage[]> {
    return normalizeMessageList([], threadId);
  },

  async sendMessageStream({ messages, modelId, onEvent }: SendMessageOptions): Promise<void> {
    const headers = new Headers({
      Accept: "text/event-stream, application/x-ndjson, application/json",
      "Content-Type": "application/json"
    });
    const token = await tokenStore.getAccessToken();
    if (token) {
      headers.set("Authorization", token.startsWith("Bearer ") ? token : `Bearer ${token}`);
    }

    const response = await fetch(`${appConfig.apiBaseUrl}${appConfig.ai.chatStream}`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: modelId,
        messages: messages
          .filter((message) => message.role !== "system" || message.content.trim())
          .map((message) => ({ role: message.role, content: message.content }))
      })
    });

    if (!response.ok) {
      throw new Error((await response.text()) || `Nexus AI request failed with ${response.status}`);
    }

    if (!response.body) {
      onEvent({ type: "done" });
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let remainder = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }

      const parsed = parseStreamChunk(decoder.decode(value, { stream: true }), remainder);
      remainder = parsed.remainder;

      parsed.lines.forEach((line) => {
        const normalized = line.startsWith("data:") ? line.slice(5).trimStart() : line.trim();
        const event = parseStreamPayload(normalized);
        if (event) {
          onEvent(event);
        }
      });
    }

    const finalText = `${remainder}${decoder.decode()}`.trim();
    if (finalText) {
      const event = parseStreamPayload(finalText.startsWith("data:") ? finalText.slice(5).trimStart() : finalText);
      if (event) {
        onEvent(event);
      }
    }
    onEvent({ type: "done" });
  }
};
