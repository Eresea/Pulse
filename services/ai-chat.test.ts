import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseAiStreamPayload } from "@/services/ai-stream-parser";
import { normalizeAiThreadTitle } from "@/services/ai-thread-title";

describe("parseAiStreamPayload", () => {
  it("parses existing delta payloads", () => {
    assert.deepEqual(parseAiStreamPayload(JSON.stringify({ type: "delta", delta: "Hello" })), {
      type: "delta",
      delta: "Hello"
    });
  });

  it("parses Nexus status events", () => {
    assert.deepEqual(parseAiStreamPayload(JSON.stringify({ type: "status", status: "running", title: "Planning", message: "Checking context" }), "status"), {
      type: "status",
      status: "running",
      title: "Planning",
      message: "Checking context"
    });
  });

  it("parses Nexus tool call lifecycle events", () => {
    assert.deepEqual(
      parseAiStreamPayload(
        JSON.stringify({
          type: "tool_call",
          id: "toolcall_123",
          name: "nexus.search",
          title: "Search Nexus",
          status: "running",
          risk: "low",
          summary: "Searching for matching records",
          input: { query: "roots" },
          startedAt: "2026-05-21T00:00:00Z"
        }),
        "tool_call"
      ),
      {
        type: "tool_call",
        toolCall: {
          id: "toolcall_123",
          name: "nexus.search",
          title: "Search Nexus",
          status: "running",
          risk: "low",
          summary: "Searching for matching records",
          input: { query: "roots" },
          startedAt: "2026-05-21T00:00:00Z"
        }
      }
    );
  });

  it("parses Nexus tool result events", () => {
    assert.deepEqual(
      parseAiStreamPayload(
        JSON.stringify({
          type: "tool_result",
          toolCallId: "toolcall_123",
          status: "succeeded",
          summary: "Found 3 records",
          details: { count: 3 },
          completedAt: "2026-05-21T00:00:10Z"
        }),
        "tool_result"
      ),
      {
        type: "tool_result",
        result: {
          toolCallId: "toolcall_123",
          status: "succeeded",
          summary: "Found 3 records",
          details: { count: 3 },
          completedAt: "2026-05-21T00:00:10Z"
        }
      }
    );
  });

  it("parses Nexus confirmation requests", () => {
    assert.deepEqual(
      parseAiStreamPayload(
        JSON.stringify({
          type: "confirmation_request",
          id: "confirm_123",
          toolCallId: "toolcall_123",
          title: "Confirm action",
          body: "Run the action?",
          confirmLabel: "Run action",
          cancelLabel: "Cancel",
          expiresAt: "2026-05-21T00:05:00Z"
        }),
        "confirmation_request"
      ),
      {
        type: "confirmation_request",
        confirmation: {
          id: "confirm_123",
          toolCallId: "toolcall_123",
          title: "Confirm action",
          body: "Run the action?",
          confirmLabel: "Run action",
          cancelLabel: "Cancel",
          expiresAt: "2026-05-21T00:05:00Z"
        }
      }
    );
  });

  it("parses durable Nexus file and reference events", () => {
    assert.deepEqual(
      parseAiStreamPayload(JSON.stringify({ type: "file", file: { id: "file_1", name: "notes.txt", mimeType: "text/plain", size: 12 } }), "file"),
      {
        type: "file",
        file: { id: "file_1", name: "notes.txt", mimeType: "text/plain", size: 12 }
      }
    );
    assert.deepEqual(
      parseAiStreamPayload(JSON.stringify({ type: "reference", reference: { id: "ref_1", type: "url", title: "Spec", url: "https://example.com/spec" } }), "reference"),
      {
        type: "reference",
        reference: { id: "ref_1", type: "url", title: "Spec", url: "https://example.com/spec" }
      }
    );
  });
});

describe("normalizeAiThreadTitle", () => {
  it("trims repeated whitespace and caps titles at 120 characters", () => {
    assert.equal(normalizeAiThreadTitle(`  ${"A".repeat(130)}   title  `), "A".repeat(120));
  });
});
