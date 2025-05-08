import { describe, expect, it, test } from "bun:test";
import { createCommand } from "../src/command";
import { group } from "../src/group";
import { LocalizationMap } from "discord.js";

describe("group()", () => {
  test("creates a subcommand group with simple commands", () => {
    const cmd1 = createCommand({
      name: "foo",
      description: "foo",
      handler: async () => {},
    });

    const cmd2 = createCommand({
      name: "bar",
      description: "bar",
      handler: async () => {},
    });

    const result = group("tools", "Tooling commands", [cmd1, cmd2]);

    expect(result).toEqual({
      type: "group",
      name: "tools",
      description: "Tooling commands",
      commands: [cmd1, cmd2],
    });
  });

  test("creates a subcommand group with nested groups and commands", () => {
    const leafCommand = createCommand({
      name: "nested-cmd",
      description: "Nested command",
      handler: async () => {},
    });

    const nestedGroup = group("nested", "Nested group", [leafCommand]);
    const topCommand = createCommand({
      name: "top-cmd",
      description: "Top level command",
      handler: async () => {},
    });

    const result = group("top", "Top group", [nestedGroup, topCommand]);

    expect(result.type).toBe("group");
    expect(result.name).toBe("top");
    expect(result.description).toBe("Top group");
    expect(result.commands.length).toBe(2);
    expect(result.commands[0]).toBe(nestedGroup);
    expect(result.commands[1]).toBe(topCommand);
  });

  test("enforces NotEmptyString constraints (TypeScript-only test)", () => {
    const validCommand = createCommand({
      name: "valid",
      description: "Valid",
      handler: async () => {},
    });

    // @ts-expect-error name must not be empty
    group("", "Valid description", [validCommand]);

    // @ts-expect-error description must not be empty
    group("valid-name", "", [validCommand]);

    expect(true).toBe(true);
  });

  test("creates a subcommand group with localization options", () => {
    const cmd1 = createCommand({
      name: "foo",
      description: "foo",
      handler: async () => {},
    });

    const nameLocalizations: LocalizationMap = { fr: "outils" };
    const descriptionLocalizations: LocalizationMap = {
      fr: "Commandes d'outils",
    };

    const result = group("tools", "Tooling commands", [cmd1], {
      nameLocalizations,
      descriptionLocalizations,
    });

    expect(result.name).toBe("tools");
    expect(result.description).toBe("Tooling commands");
    expect(result.commands.length).toBe(1);
    expect(result.options?.nameLocalizations).toEqual(nameLocalizations);
    expect(result.options?.descriptionLocalizations).toEqual(
      descriptionLocalizations,
    );
  });

  test("creates a subcommand group without localization options if none provided", () => {
    const cmd1 = createCommand({
      name: "foo",
      description: "foo",
      handler: async () => {},
    });

    const result = group("tools", "Tooling commands", [cmd1]);

    expect(result.name).toBe("tools");
    expect(result.description).toBe("Tooling commands");
    expect(result.commands.length).toBe(1);
    expect(result.options).toBeUndefined();
  });
});
