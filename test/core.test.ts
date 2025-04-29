import { beforeEach, describe, expect, mock, test } from "bun:test";
import {
  Client,
  type ClientOptions,
  IntentsBitField,
  type RESTPostAPIChatInputApplicationCommandsJSONBody,
} from "discord.js";
import { createCommand } from "../src/command";
import { createBot, initApplicationCommands } from "../src/core";
import { SimpleEvent, createEvent } from "../src/event";
import { MetadataStorage } from "../src/metadata-storage";

const { Guilds } = IntentsBitField.Flags;

describe("createBot()", () => {
  const clientOptions: ClientOptions = { intents: [Guilds] };

  let cmd: ReturnType<typeof createCommand>;
  let evtOn: SimpleEvent<"ready">;
  let evtOnce: SimpleEvent<"ready">;

  beforeEach(() => {
    MetadataStorage.instance.setSimpleCommandMap(new Map());
    MetadataStorage.instance.setCommandJsonBodies([]);

    cmd = createCommand({
      name: "cmd",
      description: "d",
      handler: mock().mockResolvedValue(undefined),
    });

    evtOn = createEvent({
      event: "ready",
      handler: mock(),
      once: false,
    });

    evtOnce = createEvent({
      event: "ready",
      handler: mock(),
      once: true,
    });
  });

  test("returns a Discord Client instance", async () => {
    const bot = await createBot({
      clientOptions,
      commands: [cmd],
      events: [evtOn],
    });

    expect(bot).toBeInstanceOf(Client);
  });

  test("flattens commands, serializes them, and stores them in MetadataStorage", async () => {
    expect(MetadataStorage.instance.simpleCommandMap.size).toBe(0);
    expect(MetadataStorage.instance.commandJsonBodies).toHaveLength(0);

    await createBot({
      clientOptions,
      commands: [cmd],
      events: [evtOn],
    });

    const map = MetadataStorage.instance.simpleCommandMap;
    expect(map.size).toBe(1);
    expect(map.get("cmd")).toBe(cmd);

    const json = MetadataStorage.instance.commandJsonBodies;
    expect(json).toHaveLength(1);
    expect(
      (json[0] as RESTPostAPIChatInputApplicationCommandsJSONBody).name,
    ).toBe("cmd");
    expect(
      (json[0] as RESTPostAPIChatInputApplicationCommandsJSONBody).description,
    ).toBe("d");
  });
});

describe("initApplicationCommands()", () => {
  const restCommands: RESTPostAPIChatInputApplicationCommandsJSONBody[] = [
    { name: "bar", description: "Bar command", options: [] },
  ];

  beforeEach(() => {
    MetadataStorage.instance.setCommandJsonBodies(restCommands);
  });

  test("registers globally when no guildIds are provided", async () => {
    const setGlobal = mock().mockResolvedValue(undefined);

    const client = {
      application: { commands: { set: setGlobal } },
      guilds: { cache: new Map() },
    } as any;

    await initApplicationCommands(client);
    expect(setGlobal).toHaveBeenCalledTimes(1);
    expect(setGlobal).toHaveBeenCalledWith(restCommands);
  });

  test("registers globally when guildIds is an empty array", async () => {
    const setGlobal = mock().mockResolvedValue(undefined);

    const client = {
      application: { commands: { set: setGlobal } },
      guilds: { cache: new Map() },
    } as any;

    await initApplicationCommands(client, []);
    expect(setGlobal).toHaveBeenCalledTimes(1);
    expect(setGlobal).toHaveBeenCalledWith(restCommands);
  });

  test("registers to the first matching guild", async () => {
    const setGuild = mock().mockResolvedValue(undefined);
    const guild = { commands: { set: setGuild } } as any;

    const client = {
      application: { commands: { set: mock() } },
      guilds: { cache: new Map([["123", guild]]) },
    } as any;

    await initApplicationCommands(client, ["123"]);
    expect(setGuild).toHaveBeenCalledTimes(1);
    expect(setGuild).toHaveBeenCalledWith(restCommands);
  });

  test("skips unknown guild IDs and continues to the next", async () => {
    const setGuild = mock().mockResolvedValue(undefined);
    const guild = { commands: { set: setGuild } } as any;

    const client = {
      application: { commands: { set: mock() } },
      guilds: { cache: new Map([["good", guild]]) },
    } as any;

    const originalLog = console.log;
    const logSpy = mock();
    console.log = logSpy;

    try {
      await initApplicationCommands(client, ["bad", "good"]);

      expect(logSpy).toHaveBeenCalledTimes(1);
      expect(logSpy).toHaveBeenCalledWith(
        "Guild with ID bad could not be found in the client cache.",
      );

      expect(setGuild).toHaveBeenCalledTimes(1);
      expect(setGuild).toHaveBeenCalledWith(restCommands);
    } finally {
      console.log = originalLog;
    }
  });

  test("returns after first successful guild registration", async () => {
    let calls = 0;
    const makeGuild = () =>
      ({
        commands: {
          set: mock().mockImplementation(() => {
            calls++;
            return Promise.resolve();
          }),
        },
      }) as any;

    const client = {
      application: { commands: { set: mock() } },
      guilds: {
        cache: new Map<string, any>([
          ["one", makeGuild()],
          ["two", makeGuild()],
        ]),
      },
    } as any;

    await initApplicationCommands(client, ["one", "two"]);
    expect(calls).toBe(1);
  });
});
