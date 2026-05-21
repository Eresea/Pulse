import type {
  AiChatConfirmationRequest,
  AiChatConfirmationResponse,
  AiChatMessage,
  AiChatRole,
  AiChatStreamEvent,
  AiChatThread,
  AiChatToolCall,
  AiChatToolResult,
  AiChatUsage,
  AiToolLifecycleStatus,
  AiToolRisk
} from "@/services/types";

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

export function mapThread(thread: RawThread): AiChatThread {
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

export function mapMessage(message: RawMessage): AiChatMessage {
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
      status?: string;
      title?: string;
      name?: string;
      id?: string;
      toolCallId?: string;
      risk?: string;
      summary?: string;
      input?: unknown;
      startedAt?: string;
      details?: unknown;
      completedAt?: string;
      body?: string;
      confirmLabel?: string;
      cancelLabel?: string;
      expiresAt?: string;
      accepted?: boolean;
      respondedAt?: string;
      usage?: AiChatUsage;
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
    if (type === "status") {
      return {
        type: "status",
        status: normalizeStatus(event.status) ?? "working",
        title: event.title,
        message: typeof event.message === "string" ? event.message : event.content ?? event.text
      };
    }
    if (type === "tool_call") {
      return { type: "tool_call", toolCall: normalizeToolCall(event) };
    }
    if (type === "tool_result") {
      return { type: "tool_result", result: normalizeToolResult(event) };
    }
    if (type === "confirmation_request") {
      return { type: "confirmation_request", confirmation: normalizeConfirmationRequest(event) };
    }
    if (type === "confirmation_response") {
      return { type: "confirmation_response", response: normalizeConfirmationResponse(event) };
    }
    if (type === "usage" && event.usage) {
      return { type: "usage", usage: event.usage };
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
    if (event.message && typeof event.message !== "string") {
      return { type: "message", message: mapMessage(event.message) };
    }
  } catch {
    return { type: "delta", delta: payload };
  }

  return null;
}

function normalizeStatus(status?: string): AiToolLifecycleStatus | "thinking" | "working" | "completed" | undefined {
  switch (status) {
    case "pending":
    case "running":
    case "succeeded":
    case "failed":
    case "cancelled":
    case "waiting_confirmation":
    case "thinking":
    case "working":
    case "completed":
      return status;
    default:
      return undefined;
  }
}

function normalizeRisk(risk?: string): AiToolRisk | undefined {
  if (risk === "low" || risk === "medium" || risk === "high") {
    return risk;
  }
  return undefined;
}

function normalizeToolCall(event: {
  id?: string;
  name?: string;
  title?: string;
  status?: string;
  risk?: string;
  summary?: string;
  input?: unknown;
  startedAt?: string;
}): AiChatToolCall {
  return {
    id: event.id ?? `toolcall-${Date.now()}`,
    name: event.name ?? "tool",
    title: event.title,
    status: normalizeLifecycleStatus(event.status) ?? "pending",
    risk: normalizeRisk(event.risk),
    summary: event.summary,
    input: event.input,
    startedAt: event.startedAt
  };
}

function normalizeToolResult(event: {
  toolCallId?: string;
  status?: string;
  summary?: string;
  details?: unknown;
  completedAt?: string;
}): AiChatToolResult {
  return {
    toolCallId: event.toolCallId ?? "",
    status: normalizeLifecycleStatus(event.status) ?? "succeeded",
    summary: event.summary,
    details: event.details,
    completedAt: event.completedAt
  };
}

function normalizeLifecycleStatus(status?: string): AiToolLifecycleStatus | undefined {
  switch (status) {
    case "pending":
    case "running":
    case "succeeded":
    case "failed":
    case "cancelled":
    case "waiting_confirmation":
      return status;
    default:
      return undefined;
  }
}

function normalizeConfirmationRequest(event: {
  id?: string;
  toolCallId?: string;
  title?: string;
  body?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  expiresAt?: string;
}): AiChatConfirmationRequest {
  return {
    id: event.id ?? `confirm-${Date.now()}`,
    toolCallId: event.toolCallId,
    title: event.title ?? "Confirm action",
    body: event.body ?? "Confirm this action before Nexus continues.",
    confirmLabel: event.confirmLabel,
    cancelLabel: event.cancelLabel,
    expiresAt: event.expiresAt
  };
}

function normalizeConfirmationResponse(event: {
  id?: string;
  accepted?: boolean;
  respondedAt?: string;
}): AiChatConfirmationResponse {
  return {
    id: event.id ?? "",
    accepted: Boolean(event.accepted),
    respondedAt: event.respondedAt
  };
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
