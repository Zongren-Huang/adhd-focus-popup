import { describe, expect, it } from "vitest";
import { PLACEHOLDER_TASK_TEXT } from "../constants";

describe("constants", () => {
  it("exposes non-empty placeholder task text for the walking skeleton", () => {
    expect(PLACEHOLDER_TASK_TEXT.length).toBeGreaterThan(0);
  });
});
