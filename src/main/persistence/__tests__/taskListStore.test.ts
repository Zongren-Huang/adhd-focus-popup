import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { loadTaskListState, saveTaskListState } from "../taskListStore";

describe("taskListStore", () => {
  let dir: string | undefined;

  afterEach(() => {
    if (dir) {
      fs.rmSync(dir, { recursive: true, force: true });
      dir = undefined;
    }
  });

  it("returns an empty list and null lastActiveDate when no file exists yet", () => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "taskliststore-"));
    expect(loadTaskListState(dir)).toEqual({ tasks: [], lastActiveDate: null });
  });

  it("round-trips a saved Task List and lastActiveDate", () => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "taskliststore-"));
    const state = {
      tasks: [{ id: "1", description: "A", status: "pending" as const }],
      lastActiveDate: "2026-08-19",
    };
    saveTaskListState(dir, state);
    expect(loadTaskListState(dir)).toEqual(state);
  });

  it("creates the userData directory if it doesn't exist", () => {
    const base = fs.mkdtempSync(path.join(os.tmpdir(), "taskliststore-"));
    dir = path.join(base, "nested");
    saveTaskListState(dir, { tasks: [], lastActiveDate: null });
    expect(fs.existsSync(path.join(dir, "tasks.json"))).toBe(true);
  });

  it("falls back to an empty list and null lastActiveDate on corrupt JSON instead of throwing", () => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "taskliststore-"));
    fs.writeFileSync(path.join(dir, "tasks.json"), "{not json", "utf-8");
    expect(loadTaskListState(dir)).toEqual({ tasks: [], lastActiveDate: null });
  });

  it("defaults lastActiveDate to null when reading a legacy file without that field", () => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "taskliststore-"));
    fs.writeFileSync(path.join(dir, "tasks.json"), JSON.stringify({ version: 1, tasks: [] }), "utf-8");
    expect(loadTaskListState(dir)).toEqual({ tasks: [], lastActiveDate: null });
  });
});
