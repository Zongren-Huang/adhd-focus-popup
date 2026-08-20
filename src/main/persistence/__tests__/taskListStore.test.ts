import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { loadTaskList, saveTaskList } from "../taskListStore";

describe("taskListStore", () => {
  let dir: string | undefined;

  afterEach(() => {
    if (dir) {
      fs.rmSync(dir, { recursive: true, force: true });
      dir = undefined;
    }
  });

  it("returns an empty list when no file exists yet", () => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "taskliststore-"));
    expect(loadTaskList(dir)).toEqual([]);
  });

  it("round-trips a saved Task List", () => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "taskliststore-"));
    const tasks = [{ id: "1", description: "A", status: "pending" as const }];
    saveTaskList(dir, tasks);
    expect(loadTaskList(dir)).toEqual(tasks);
  });

  it("creates the userData directory if it doesn't exist", () => {
    const base = fs.mkdtempSync(path.join(os.tmpdir(), "taskliststore-"));
    dir = path.join(base, "nested");
    saveTaskList(dir, []);
    expect(fs.existsSync(path.join(dir, "tasks.json"))).toBe(true);
  });

  it("falls back to an empty list on corrupt JSON instead of throwing", () => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "taskliststore-"));
    fs.writeFileSync(path.join(dir, "tasks.json"), "{not json", "utf-8");
    expect(loadTaskList(dir)).toEqual([]);
  });
});
