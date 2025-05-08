import { describe, expect, it, mock, test } from "bun:test";
import { type SimpleCommand, createCommand } from "../src/command";
import type { GuardFn } from "../src/guard";
import { LocalizationMap } from "discord.js";

describe("createCommand()", () => {
  test("should create a command object with type 'command'", () => {
    const handler = mock().mockResolvedValue(undefined);

    const nameLocalizations: LocalizationMap = {
      fr: "bonjour",
      "es-ES": "hola",
    };

    const descriptionLocalizations: LocalizationMap = {
      fr: "Dit bonjour !",
      "es-ES": "Dice hola!",
    };

    const config = {
      name: "cmd",
      description: "d",
      nameLocalizations,
      descriptionLocalizations,
      handler,
    };

    const command = createCommand(config);

    expect(command.type).toBe("command");
    expect(command.name).toBe("cmd");
    expect(command.description).toBe("d");
    expect(command.handler).toBe(handler);
    expect(command.options).toBeUndefined();
    expect(command.guards).toBeUndefined();
  });

  test("should include options and guards if provided", () => {
    const handler = mock().mockResolvedValue(undefined);

    const options = {
      opt1: { name: "opt1", description: "d", type: 1, required: true },
    };

    const guard1: GuardFn = mock();

    const config = {
      name: "test-options",
      description: "Command with options and guards",
      options: options as any,
      guards: [guard1],
      handler,
    };

    const command: SimpleCommand<typeof options, {}, string, string> =
      createCommand(config);

    expect(command.type).toBe("command");
    expect(command.name).toBe("test-options");
    expect(command.description).toBe("Command with options and guards");
    expect(command.handler).toBe(handler);
    expect(command.options).toEqual(options);
    expect(command.guards).toEqual([guard1]);
  });

  test("should enforce NotEmptyString for name and description via TypeScript", () => {
    createCommand({
      // @ts-expect-error - Name cannot be empty
      name: "",
      description: "Valid desc",
      handler: mock(),
    });
    createCommand({
      name: "valid-name",
      // @ts-expect-error - Description cannot be empty
      description: "",
      handler: mock(),
    });
    expect(true).toBe(true);
  });
});
