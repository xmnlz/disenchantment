import { beforeEach, describe, expect, test } from "bun:test";
import {
  ApplicationCommandOptionType,
  Channel,
  ChatInputCommandInteraction,
  Client,
  GuildMember,
  Role,
  User,
} from "discord.js";
import { createCommand } from "../src/command";
import { GuardFn } from "../src/guard";
import {
  bindClientEventHandlers,
  buildCommandKey,
  extractCommandOptions,
  handleCommandInteraction,
} from "../src/handlers";
import { MetadataStorage } from "../src/metadata-storage";
import { option } from "../src/option";
import { flattenCommandTree } from "../src/transformers/commands";

class FakeOptions {
  constructor(private values: Record<string, any>) {}
  getString(name: string) {
    return this.values[name];
  }
  getInteger(name: string) {
    return this.values[name];
  }
  getNumber(name: string) {
    return this.values[name];
  }
  getMember(name: string) {
    return this.values[name];
  }
  getBoolean(name: string) {
    return this.values[name];
  }
  getUser(name: string) {
    return this.values[name];
  }
  getChannel(name: string) {
    return this.values[name];
  }
  getRole(name: string) {
    return this.values[name];
  }
  getMentionable(name: string) {
    return this.values[name];
  }
  getAttachment(name: string) {
    return this.values[name];
  }
  getSubcommand(_name: string, _required?: boolean) {
    return this.values.__sub || null;
  }
  getSubcommandGroup(_name: string, _required?: boolean) {
    return this.values.__grp || null;
  }
}

function createFakeInteraction(
  values: Record<string, any> = {},
): ChatInputCommandInteraction {
  return {
    commandName: "cmd",
    options: new FakeOptions(values),
    client: { tag: "fake-client" },
  } as unknown as ChatInputCommandInteraction;
}

beforeEach(() => {
  MetadataStorage.instance.setSimpleCommandMap(new Map());
});

describe("extractCommandOptions()", () => {
  test("extracts primitive option values", () => {
    const interaction = createFakeInteraction({
      a: "hello",
      b: 5,
      c: 2.7,
      d: true,
    });
    const opts = {
      a: option({
        name: "a",
        description: "s",
        type: ApplicationCommandOptionType.String,
        required: true,
      }),
      b: option({
        name: "b",
        description: "i",
        type: ApplicationCommandOptionType.Integer,
        required: true,
      }),
      c: option({
        name: "c",
        description: "n",
        type: ApplicationCommandOptionType.Number,
        required: true,
      }),
      d: option({
        name: "d",
        description: "b",
        type: ApplicationCommandOptionType.Boolean,
        required: true,
      }),
    };

    const result = extractCommandOptions(interaction, opts);
    expect(result).toEqual({ a: "hello", b: 5, c: 2.7, d: true });
  });

  test("extracts complex option values", () => {
    const dummy = { id: "X" };
    const interaction = createFakeInteraction({
      user: dummy,
      channel: dummy,
      role: dummy,
      mentionable: dummy,
      attachment: dummy,
    });
    const opts = {
      user: option({
        name: "user",
        description: "u",
        type: ApplicationCommandOptionType.User,
        required: true,
      }),
      channel: option({
        name: "channel",
        description: "c",
        type: ApplicationCommandOptionType.Channel,
        required: true,
      }),
      role: option({
        name: "role",
        description: "r",
        type: ApplicationCommandOptionType.Role,
        required: true,
      }),
      mentionable: option({
        name: "mentionable",
        description: "m",
        type: ApplicationCommandOptionType.Mentionable,
        required: true,
      }),
      attachment: option({
        name: "attachment",
        description: "a",
        type: ApplicationCommandOptionType.Attachment,
        required: true,
      }),
    };

    const result = extractCommandOptions(interaction, opts);
    expect(result).toEqual({
      user: dummy as User,
      channel: dummy as Channel,
      role: dummy as Role,
      mentionable: dummy as User | Role | GuildMember,
      attachment: dummy,
    });
  });

  test("throws for unsupported option type", () => {
    const interaction = createFakeInteraction();
    const badOpts = {
      bad: { name: "bad", description: "x", type: 999 as any, required: true },
    };

    expect(() => extractCommandOptions(interaction, badOpts)).toThrow(
      "Unsupported option type: 999",
    );
  });
});

describe("buildCommandKey()", () => {
  test("returns command name only", () => {
    expect(buildCommandKey(createFakeInteraction())).toBe("cmd");
  });

  test("includes subcommand", () => {
    const interaction = createFakeInteraction({ __sub: "s1" });
    expect(buildCommandKey(interaction)).toBe("cmd s1");
  });

  test("includes group and subcommand", () => {
    const interaction = createFakeInteraction({ __grp: "g1", __sub: "s1" });
    expect(buildCommandKey(interaction)).toBe("cmd g1 s1");
  });
});

describe("handleCommandInteraction()", () => {
  test("does nothing if no command is registered", async () => {
    expect(
      handleCommandInteraction(createFakeInteraction()),
    ).resolves.toBeUndefined();
  });

  test("invokes handler without options", async () => {
    let ran = false;
    const cmd = createCommand({
      name: "cmd",
      description: "d",
      handler: async () => {
        ran = true;
      },
      guards: [],
    });

    MetadataStorage.instance.setSimpleCommandMap(new Map([["cmd", cmd]]));
    await handleCommandInteraction(createFakeInteraction());
    expect(ran).toBe(true);
  });

  test("executes guards and handler with options and context", async () => {
    const calls: string[] = [];
    type GuardCtx = { x: number; y: number };

    const guard1: GuardFn<typeof createFakeInteraction, GuardCtx> = async (
      _c,
      _i,
      next,
      ctx,
    ) => {
      calls.push("G1-before");
      ctx.x = 1;
      await next();
      calls.push("G1-after");
    };
    const guard2: GuardFn<typeof createFakeInteraction, GuardCtx> = async (
      _c,
      _i,
      next,
      ctx,
    ) => {
      calls.push("G2-before");
      ctx.y = 2;
      await next();
      calls.push("G2-after");
    };

    let finalCtx: any = {};
    const handler = async (_i: any, opts: any, ctx: any) => {
      calls.push("H");
      finalCtx = { ...opts, ...ctx };
    };

    const cmd = createCommand({
      name: "cmd",
      description: "d",
      options: {
        foo: option({
          name: "foo",
          description: "f",
          type: ApplicationCommandOptionType.String,
          required: true,
        }),
      },
      guards: [guard1, guard2],
      handler,
    });

    const commandMap = flattenCommandTree([cmd]);
    MetadataStorage.instance.setSimpleCommandMap(commandMap);

    await handleCommandInteraction(createFakeInteraction({ foo: "bar" }));
    expect(calls).toEqual([
      "G1-before",
      "G2-before",
      "H",
      "G2-after",
      "G1-after",
    ]);
    expect(finalCtx).toEqual({ foo: "bar", x: 1, y: 2 });
  });
});

describe("bindClientEventHandlers()", () => {
  test("registers on and once handlers", () => {
    const recorded: string[] = [];
    const eventMap = new Map<string, { on: Function[]; once: Function[] }>([
      [
        "E",
        {
          on: [(_c: Client, v: number) => recorded.push(`on:${v + 1}`)],
          once: [(_c: Client, v: number) => recorded.push(`once:${v + 2}`)],
        },
      ],
    ]);

    const onCalls: Array<{ evt: string; fn: Function }> = [];
    const onceCalls: Array<{ evt: string; fn: Function }> = [];
    const fakeClient = {
      on: (evt: string, fn: Function) => onCalls.push({ evt, fn }),
      once: (evt: string, fn: Function) => onceCalls.push({ evt, fn }),
    } as unknown as Client;

    bindClientEventHandlers(fakeClient, eventMap as any);
    expect(onCalls).toHaveLength(1);
    expect(onceCalls).toHaveLength(1);
    expect(onCalls[0].evt).toBe("E");
    expect(onceCalls[0].evt).toBe("E");

    onCalls[0].fn(10);
    onceCalls[0].fn(20);
    expect(recorded).toEqual(["on:11", "once:22"]);
  });

  test("skips events with no handlers", () => {
    let onCount = 0;
    let onceCount = 0;
    const fakeClient = {
      on: () => {
        onCount++;
      },
      once: () => {
        onceCount++;
      },
    } as unknown as Client;

    bindClientEventHandlers(
      fakeClient,
      new Map([["threadDelete", { on: [], once: [] }]]),
    );
    expect(onCount).toBe(0);
    expect(onceCount).toBe(0);
  });
});
