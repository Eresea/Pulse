import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { shouldDismissActionSheet } from "@/components/ui/action-sheet-gesture";

describe("shouldDismissActionSheet", () => {
  it("dismisses when a drag projects beyond the close threshold", () => {
    assert.equal(shouldDismissActionSheet({ translateY: 40, velocityY: 500 }), true);
  });

  it("dismisses fast downward flicks before they cross the threshold", () => {
    assert.equal(shouldDismissActionSheet({ translateY: 10, velocityY: 700 }), true);
  });

  it("keeps the sheet open for short slow drags", () => {
    assert.equal(shouldDismissActionSheet({ translateY: 20, velocityY: 100 }), false);
  });
});
