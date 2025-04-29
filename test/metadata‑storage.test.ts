import { beforeEach, describe, expect, test } from "bun:test";
import type { RESTPostAPIChatInputApplicationCommandsJSONBody } from "discord.js";
import type { SimpleCommand } from "../src/command";
import { MetadataStorage } from "../src/metadata-storage";

describe("MetadataStorage", () => {
  beforeEach(() => {
    // @ts-ignore
    MetadataStorage._instance = undefined;
  });

  const makeCommands = (...names: string[]): Map<string, SimpleCommand> =>
    new Map(
      names.map((name) => [
        name,
        {
          type: "command",
          name,
          description: `${name}-desc`,
          handler: async () => {},
        },
      ]),
    );

  const makeJsonBodies = (
    ...names: string[]
  ): RESTPostAPIChatInputApplicationCommandsJSONBody[] =>
    names.map((name) => ({ name, description: `${name}-desc` }));

  describe("singleton behaviour", () => {
    test("creates a fresh instance on first access and reuses it thereafter", () => {
      const first = MetadataStorage.instance;
      const second = MetadataStorage.instance;

      expect(first).toBeInstanceOf(MetadataStorage);
      expect(second).toBeInstanceOf(MetadataStorage);
      expect(first).toBe(second);
    });
  });

  describe("initial state", () => {
    test("starts with an empty simpleCommandMap", () => {
      const instance = MetadataStorage.instance;
      expect(instance.simpleCommandMap).toBeInstanceOf(Map);
      expect(instance.simpleCommandMap.size).toBe(0);
    });

    test("starts with an empty commandJsonBodies array", () => {
      const instance = MetadataStorage.instance;
      expect(instance.commandJsonBodies).toBeInstanceOf(Array);
      expect(instance.commandJsonBodies.length).toBe(0);
    });
  });

  describe("simpleCommandMap", () => {
    let instance: MetadataStorage;

    beforeEach(() => {
      instance = MetadataStorage.instance;
    });

    test("setSimpleCommandMap replaces the map and preserves reference", () => {
      const oneMap = makeCommands("one");
      instance.setSimpleCommandMap(oneMap);
      expect(instance.simpleCommandMap).toBe(oneMap);
      expect(instance.simpleCommandMap.size).toBe(1);
      expect(instance.simpleCommandMap.has("one")).toBe(true);

      const twoMap = makeCommands("two");
      instance.setSimpleCommandMap(twoMap);
      expect(instance.simpleCommandMap).toBe(twoMap);
      expect(instance.simpleCommandMap.size).toBe(1);
      expect(instance.simpleCommandMap.has("two")).toBe(true);
    });

    test("mutating the exposed simpleCommandMap reflects internally", () => {
      const map = new Map<string, SimpleCommand>();
      instance.setSimpleCommandMap(map);

      const exposed = instance.simpleCommandMap;
      exposed.set("xyz", {
        type: "command",
        name: "xyz",
        description: "xyz-desc",
        handler: async () => {},
      });
      expect(instance.simpleCommandMap.has("xyz")).toBe(true);
    });
  });

  describe("commandJsonBodies", () => {
    let instance: MetadataStorage;

    beforeEach(() => {
      instance = MetadataStorage.instance;
    });

    test("replaces the array and preserves reference", () => {
      const arrA = makeJsonBodies("cmdA");
      instance.setCommandJsonBodies(arrA);
      expect(instance.commandJsonBodies).toBe(arrA);
      expect(instance.commandJsonBodies.length).toBe(1);
      expect(instance.commandJsonBodies[0].name).toBe("cmdA");

      const arrBC = makeJsonBodies("cmdB", "cmdC");
      instance.setCommandJsonBodies(arrBC);
      expect(instance.commandJsonBodies).toBe(arrBC);
      expect(instance.commandJsonBodies.length).toBe(2);
      expect(instance.commandJsonBodies[1].name).toBe("cmdC");
    });

    test("mutating the exposed commandJsonBodies reflects internally", () => {
      const arr: RESTPostAPIChatInputApplicationCommandsJSONBody[] = [];
      instance.setCommandJsonBodies(arr);

      // mutate via the exposed reference
      const exposed = instance.commandJsonBodies;
      exposed.push({ name: "newCmd", description: "new-desc" });
      expect(instance.commandJsonBodies.length).toBe(1);
      expect(instance.commandJsonBodies[0].name).toBe("newCmd");
    });
  });
});
