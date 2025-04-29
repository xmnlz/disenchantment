import { describe, expect, test } from "bun:test";
import * as lib from "../src/index";

describe("index exports", () => {
  test("exports all core APIs", () => {
    expect(typeof lib.createBot).toBe("function");
    expect(typeof lib.createCommand).toBe("function");
    expect(typeof lib.createEvent).toBe("function");
    expect(typeof lib.guards).toBe("function");
    expect(typeof lib.option).toBe("function");
    expect(typeof lib.group).toBe("function");
    expect(typeof lib.initApplicationCommands).toBe("function");
    expect(typeof lib.handleCommandInteraction).toBe("function");
  });
});
