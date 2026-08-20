import { describe, expect, it } from "vitest";
import { addTask, deleteTask, getCurrentTask, markTaskDone, reorderTasks, type TaskList } from "../taskList";

let nextId = 0;
const testId = () => `task-${nextId++}`;

describe("addTask", () => {
  it("appends a new pending task at the end of the list", () => {
    const list = addTask(addTask([], "First", testId), "Second", testId);
    expect(list.map((task) => task.description)).toEqual(["First", "Second"]);
    expect(list.every((task) => task.status === "pending")).toBe(true);
  });

  it("trims whitespace from the description", () => {
    const list = addTask([], "  Buy milk  ", testId);
    expect(list[0].description).toBe("Buy milk");
  });

  it("throws on an empty or whitespace-only description", () => {
    expect(() => addTask([], "", testId)).toThrow();
    expect(() => addTask([], "   ", testId)).toThrow();
  });

  it("does not mutate the input list", () => {
    const original: TaskList = [];
    addTask(original, "A", testId);
    expect(original).toEqual([]);
  });
});

describe("deleteTask", () => {
  it("removes the task with the matching id", () => {
    const list = addTask(addTask([], "A", testId), "B", testId);
    const result = deleteTask(list, list[0].id);
    expect(result.map((task) => task.description)).toEqual(["B"]);
  });

  it("leaves the list unchanged when the id is not found", () => {
    const list = addTask([], "A", testId);
    expect(deleteTask(list, "unknown")).toEqual(list);
  });
});

describe("markTaskDone", () => {
  it("transitions the matching task's status to done, others untouched", () => {
    const list = addTask(addTask([], "A", testId), "B", testId);
    const result = markTaskDone(list, list[0].id);
    expect(result[0].status).toBe("done");
    expect(result[1].status).toBe("pending");
  });

  it("keeps the done task in the list at its original position", () => {
    const list = addTask(addTask([], "A", testId), "B", testId);
    const result = markTaskDone(list, list[0].id);
    expect(result.map((task) => task.description)).toEqual(["A", "B"]);
  });

  it("is a no-op when the id is not found", () => {
    const list = addTask([], "A", testId);
    expect(markTaskDone(list, "unknown")).toEqual(list);
  });
});

describe("reorderTasks", () => {
  it("reorders tasks per the given id permutation", () => {
    const list = addTask(addTask(addTask([], "A", testId), "B", testId), "C", testId);
    const [a, b, c] = list;
    const result = reorderTasks(list, [c.id, a.id, b.id]);
    expect(result.map((task) => task.description)).toEqual(["C", "A", "B"]);
  });

  it("throws if orderedIds is missing an id", () => {
    const list = addTask(addTask([], "A", testId), "B", testId);
    expect(() => reorderTasks(list, [list[0].id])).toThrow();
  });

  it("throws if orderedIds has a duplicate or unknown id", () => {
    const list = addTask(addTask([], "A", testId), "B", testId);
    expect(() => reorderTasks(list, [list[0].id, list[0].id])).toThrow();
    expect(() => reorderTasks(list, [list[0].id, "unknown"])).toThrow();
  });
});

describe("getCurrentTask", () => {
  it("returns undefined for an empty list", () => {
    expect(getCurrentTask([])).toBeUndefined();
  });

  it("returns the first pending task by position", () => {
    const list = addTask(addTask([], "A", testId), "B", testId);
    expect(getCurrentTask(list)?.description).toBe("A");
  });

  it("skips done tasks to find the next pending task", () => {
    const list = addTask(addTask([], "A", testId), "B", testId);
    const result = markTaskDone(list, list[0].id);
    expect(getCurrentTask(result)?.description).toBe("B");
  });

  it("returns undefined when every task is done", () => {
    const list = addTask([], "A", testId);
    const result = markTaskDone(list, list[0].id);
    expect(getCurrentTask(result)).toBeUndefined();
  });
});

describe("composition (acceptance-criteria scenarios)", () => {
  it("marking the current task done promotes the next-priority pending task", () => {
    let list = addTask(addTask(addTask([], "A", testId), "B", testId), "C", testId);
    list = markTaskDone(list, getCurrentTask(list)!.id);
    expect(getCurrentTask(list)?.description).toBe("B");
  });

  it("reordering can change which task is current", () => {
    const list = addTask(addTask([], "A", testId), "B", testId);
    const [a, b] = list;
    const result = reorderTasks(list, [b.id, a.id]);
    expect(getCurrentTask(result)?.description).toBe("B");
  });

  it("adding the first task to an empty list makes it current", () => {
    const list = addTask([], "A", testId);
    expect(getCurrentTask(list)?.description).toBe("A");
  });
});
