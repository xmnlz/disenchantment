import { describe, expect, mock, test } from "bun:test";
import type { ClientEvents } from "discord.js";
import { createEvent } from "../src/event";
import type { EventHandler, SimpleEvent } from "../src/event";

describe("createEvent()", () => {
  const makeHandler = <N extends keyof ClientEvents>() =>
    mock<EventHandler<N>>().mockResolvedValue(undefined);

  test("returns the exact same object reference", () => {
    const handler = makeHandler<"ready">();
    const config: SimpleEvent<"ready"> = { event: "ready", handler };
    const result = createEvent(config);
    expect(result).toBe(config);
  });

  test("when `once` is omitted, `once` stays undefined", () => {
    const handler = makeHandler<"messageCreate">();
    const config: SimpleEvent<"messageCreate"> = {
      event: "messageCreate",
      handler,
    };
    const result = createEvent(config);
    expect(result.event).toBe("messageCreate");
    expect(result.handler).toBe(handler);
    expect(result.once).toBeUndefined();
  });

  test("when `once: true` is provided, it is preserved", () => {
    const handler = makeHandler<"interactionCreate">();
    const config: SimpleEvent<"interactionCreate"> = {
      event: "interactionCreate",
      handler,
      once: true,
    };
    const result = createEvent(config);
    expect(result.event).toBe("interactionCreate");
    expect(result.handler).toBe(handler);
    expect(result.once).toBe(true);
  });

  test("when `once: false` is provided, it is preserved", () => {
    const handler = makeHandler<"guildCreate">();
    const config: SimpleEvent<"guildCreate"> = {
      event: "guildCreate",
      handler,
      once: false,
    };
    const result = createEvent(config);
    expect(result.event).toBe("guildCreate");
    expect(result.handler).toBe(handler);
    expect(result.once).toBe(false);
  });
});
