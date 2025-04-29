import { describe, expect, mock, test } from "bun:test";
import { ApplicationCommandOptionType } from "discord.js";
import { createCommand } from "../src/command";
import { group } from "../src/group";
import { option } from "../src/option";
import {
  createEventHandlerMap,
  flattenCommandTree,
  serializeCommandsForAPI,
} from "../src/transformers";

describe("flattenCommandTree()", () => {
  test("returns an empty map when given no commands", () => {
    const map = flattenCommandTree([]);
    expect(map.size).toBe(0);
  });

  test("maps a flat list of commands to their names", () => {
    const a = createCommand({
      name: "a",
      description: "Cmd A",
      handler: mock(),
    });
    const b = createCommand({
      name: "b",
      description: "Cmd B",
      handler: mock(),
    });
    const map = flattenCommandTree([a, b]);

    expect(Array.from(map.keys()).sort()).toEqual(["a", "b"]);
    expect(map.get("a")).toBe(a);
    expect(map.get("b")).toBe(b);
  });

  test("maps nested groups into space-separated keys", () => {
    const c1 = createCommand({
      name: "c1",
      description: "C1",
      handler: mock(),
    });
    const c2 = createCommand({
      name: "c2",
      description: "C2",
      handler: mock(),
    });
    const inner = group("g2", "Inner group", [c2]);
    const outer = group("g1", "Outer group", [c1, inner]);

    const map = flattenCommandTree([outer]);
    expect(map.size).toBe(2);
    expect(map.has("g1 c1")).toBe(true);
    expect(map.has("g1 g2 c2")).toBe(true);
  });

  test("throws when two top-level commands share the same name", () => {
    const x1 = createCommand({ name: "x", description: "X1", handler: mock() });
    const x2 = createCommand({ name: "x", description: "X2", handler: mock() });

    expect(() => flattenCommandTree([x1, x2])).toThrow(
      /Duplicate command definition detected: x/,
    );
  });

  test("throws when duplicate commands appear in nested groups", () => {
    const cmdA = createCommand({
      name: "a",
      description: "A",
      handler: mock(),
    });
    const inner1 = group("grp", "First group", [cmdA]);
    const inner2 = group("grp", "Second group", [cmdA]);
    const outer = group("outer", "Outer group", [inner1, inner2]);

    expect(() => flattenCommandTree([outer])).toThrow(
      /Duplicate command definition detected: outer grp a/,
    );
  });
});

describe("serializeCommandsForAPI()", () => {
  test("serializes a standalone command with no options", () => {
    const foo = createCommand({
      name: "foo",
      description: "Foo cmd",
      handler: mock(),
    });
    const [json] = serializeCommandsForAPI([foo]);

    expect(json.name).toBe("foo");
    expect(json.description).toBe("Foo cmd");

    const opts = json.options ?? [];
    expect(Array.isArray(opts)).toBe(true);
    expect(opts).toHaveLength(0);
  });

  test("serializes a command with a single string option", () => {
    const foo = createCommand({
      name: "foo",
      description: "Foo with opts",
      handler: mock(),
      options: {
        bar: option({
          name: "bar",
          description: "Bar desc",
          type: ApplicationCommandOptionType.String,
          required: true,
          extra: {
            minLength: 2,
            maxLength: 5,
            choices: [{ name: "One", value: "one" }],
            autocomplete: false,
          },
        }),
      },
    });

    const [json] = serializeCommandsForAPI([foo]);
    const opts = json.options ?? [];
    expect(opts).toHaveLength(1);

    const opt: any = opts[0];
    expect(opt.name).toBe("bar");
    expect(opt.description).toBe("Bar desc");
    expect(opt.type).toBe(ApplicationCommandOptionType.String);
    expect(opt.required).toBe(true);
    expect(opt.min_length).toBe(2);
    expect(opt.max_length).toBe(5);
    expect(opt.choices).toEqual([{ name: "One", value: "one" }]);
  });

  test("serializes subcommands under a top-level group", () => {
    const sub = createCommand({
      name: "sub",
      description: "Sub cmd",
      handler: mock(),
      options: {
        num: option({
          name: "num",
          description: "A number",
          type: ApplicationCommandOptionType.Integer,
          required: false,
        }),
      },
    });
    const grp = group("grp", "Group desc", [sub]);

    const [json] = serializeCommandsForAPI([grp]);
    expect(json.name).toBe("grp");

    const topOpts = json.options ?? [];
    expect(topOpts).toHaveLength(1);

    const subOpt: any = topOpts[0];
    expect(subOpt.type).toBe(ApplicationCommandOptionType.Subcommand);
    expect(subOpt.name).toBe("sub");
    expect(Array.isArray(subOpt.options)).toBe(true);
    expect(subOpt.options).toHaveLength(1);

    const numOpt = subOpt.options[0];
    expect(numOpt.name).toBe("num");
    expect(numOpt.type).toBe(ApplicationCommandOptionType.Integer);
    expect(numOpt.required).toBe(false);
  });

  test("serializes mixed subcommands and subcommand groups at top level", () => {
    const leaf = createCommand({
      name: "leaf",
      description: "Leaf",
      handler: mock(),
    });
    const nested = group("inner", "Inner grp", [leaf]);
    const groupCmd = group("parent", "Parent grp", [leaf, nested]);

    const [json] = serializeCommandsForAPI([groupCmd]);
    const topOpts = json.options ?? [];
    expect(topOpts).toHaveLength(2);

    const types = topOpts.map((o) => (o as any).type).sort();
    expect(types).toEqual([
      ApplicationCommandOptionType.Subcommand,
      ApplicationCommandOptionType.SubcommandGroup,
    ]);
  });

  test("serializes deeply nested subcommand groups and commands", () => {
    const leaf = createCommand({
      name: "leaf",
      description: "Leaf",
      handler: mock(),
    });
    const lvl2 = group("lvl2", "Level 2", [leaf]);
    const lvl1 = group("lvl1", "Level 1", [lvl2]);

    const [json] = serializeCommandsForAPI([lvl1]);
    const lvl2Opt: any = (json.options ?? []).find(
      (o: any) => o.name === "lvl2",
    );
    expect(lvl2Opt).toBeDefined();
    expect(lvl2Opt.type).toBe(ApplicationCommandOptionType.SubcommandGroup);

    const innerOpts = lvl2Opt.options ?? [];
    expect(innerOpts).toHaveLength(1);
    expect(innerOpts[0].name).toBe("leaf");
    expect(innerOpts[0].type).toBe(ApplicationCommandOptionType.Subcommand);
  });
});

describe("createEventHandlerMap()", () => {
  const handlerA = async () => {};
  const handlerB = async () => {};

  test("returns an empty map for no events", () => {
    const map = createEventHandlerMap([]);
    expect(map.size).toBe(0);
  });

  test("collects 'on' handlers by default", () => {
    const map = createEventHandlerMap([
      { event: "ready", handler: handlerA },
      { event: "ready", handler: handlerB },
    ]);
    const rec = map.get("ready")!;
    expect(rec.on).toEqual([handlerA, handlerB]);
    expect(rec.once).toEqual([]);
  });

  test("collects 'once' handlers when flagged", () => {
    const map = createEventHandlerMap([
      { event: "ready", handler: handlerA, once: true },
      { event: "ready", handler: handlerB, once: true },
    ]);
    const rec = map.get("ready")!;
    expect(rec.once).toEqual([handlerA, handlerB]);
    expect(rec.on).toEqual([]);
  });

  test("aggregates mixed 'on' and 'once' handlers for the same event", () => {
    const map = createEventHandlerMap([
      { event: "ready", handler: handlerA },
      { event: "ready", handler: handlerB, once: true },
      { event: "ready", handler: handlerB },
      { event: "ready", handler: handlerA, once: true },
    ]);
    const rec = map.get("ready")!;
    expect(rec.on).toEqual([handlerA, handlerB]);
    expect(rec.once).toEqual([handlerB, handlerA]);
  });
});
