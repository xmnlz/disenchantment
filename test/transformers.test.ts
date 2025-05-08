import { describe, expect, mock, test } from "bun:test";
import { ApplicationCommandOptionType, LocalizationMap } from "discord.js";
import { createCommand } from "../src/command";
import { group } from "../src/group";
import { option } from "../src/option";

import {
  flattenCommandTree,
  serializeCommandsForAPI,
} from "../src/transformers/commands";
import { createEventHandlerMap } from "../src/transformers/events";

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

  test("serializes a standalone command with localizations", () => {
    const nameLocalizations: LocalizationMap = { fr: "parler" };
    const descriptionLocalizations: LocalizationMap = {
      fr: "Commande de conversation",
    };

    const talkCmd = createCommand({
      name: "talk",
      description: "A command for talking",
      handler: mock(),
      nameLocalizations,
      descriptionLocalizations,
    });

    const [json] = serializeCommandsForAPI([talkCmd]);

    expect(json.name).toBe("talk");
    expect(json.description).toBe("A command for talking");
    expect(json.name_localizations).toEqual(nameLocalizations);
    expect(json.description_localizations).toEqual(descriptionLocalizations);
  });

  test("serializes a command with an option that has localizations", () => {
    const optionNameLocalizations: LocalizationMap = { fr: "message" };
    const optionDescriptionLocalizations: LocalizationMap = {
      fr: "Texte à envoyer",
    };

    const sendCmd = createCommand({
      name: "send",
      description: "Send a message",
      handler: mock(),
      options: {
        msg: option({
          name: "message",
          description: "The text to send",
          type: ApplicationCommandOptionType.String,
          required: true,
          nameLocalizations: optionNameLocalizations,
          descriptionLocalizations: optionDescriptionLocalizations,
        }),
      },
    });

    const [json] = serializeCommandsForAPI([sendCmd]);
    const options = json.options ?? [];
    expect(options).toHaveLength(1);

    const optionJson: any = options[0];
    expect(optionJson.name).toBe("message");
    expect(optionJson.description).toBe("The text to send");
    expect(optionJson.name_localizations).toEqual(optionNameLocalizations);
    expect(optionJson.description_localizations).toEqual(
      optionDescriptionLocalizations,
    );
  });

  test("serializes a group with localizations", () => {
    const groupNameLocalizations: LocalizationMap = { fr: "admin" };
    const groupDescriptionLocalizations: LocalizationMap = {
      fr: "Commandes administrateur",
    };

    const adminGroup = group(
      "admin",
      "Admin commands",
      [
        createCommand({
          name: "ban",
          description: "Ban a user",
          handler: mock(),
        }),
      ],
      {
        nameLocalizations: groupNameLocalizations,
        descriptionLocalizations: groupDescriptionLocalizations,
      },
    );

    const [json] = serializeCommandsForAPI([adminGroup]);

    expect(json.name).toBe("admin");
    expect(json.description).toBe("Admin commands");
    expect(json.name_localizations).toEqual(groupNameLocalizations);
    expect(json.description_localizations).toEqual(
      groupDescriptionLocalizations,
    );
  });

  test("serializes nested structures with localizations at different levels", () => {
    const outerGroupNameLocalizations: LocalizationMap = { fr: "utilitaires" };
    const innerGroupNameLocalizations: LocalizationMap = { fr: "nettoyage" };

    const cleanCmdDescriptionLocalizations: LocalizationMap = {
      fr: "Nettoyer le cache",
    };
    const dryRunOptionDescriptionLocalizations: LocalizationMap = {
      fr: "Simulation",
    };

    const cleanCmd = createCommand({
      name: "clean",
      description: "Clean the cache",
      handler: mock(),
      descriptionLocalizations: cleanCmdDescriptionLocalizations,
      options: {
        dryRun: option({
          name: "dry-run",
          description: "Run without making changes",
          type: ApplicationCommandOptionType.Boolean,
          required: false,
          descriptionLocalizations: dryRunOptionDescriptionLocalizations,
        }),
      },
    });

    const maintenanceGroup = group(
      "maintenance",
      "Maintenance tasks",
      [cleanCmd],
      { nameLocalizations: innerGroupNameLocalizations },
    );

    const utilitiesGroup = group(
      "utilities",
      "Utility commands",
      [maintenanceGroup],
      { nameLocalizations: outerGroupNameLocalizations },
    );

    const [json] = serializeCommandsForAPI([utilitiesGroup]);

    const outerGroupJson: any = json;
    expect(outerGroupJson.name).toBe("utilities");
    expect(outerGroupJson.name_localizations).toEqual(
      outerGroupNameLocalizations,
    );

    const innerGroupJson: any = outerGroupJson.options?.[0];
    expect(innerGroupJson.name).toBe("maintenance");
    expect(innerGroupJson.type).toBe(
      ApplicationCommandOptionType.SubcommandGroup,
    );
    expect(innerGroupJson.name_localizations).toEqual(
      innerGroupNameLocalizations,
    );

    const commandJson: any = innerGroupJson.options?.[0];
    expect(commandJson.name).toBe("clean");
    expect(commandJson.type).toBe(ApplicationCommandOptionType.Subcommand);
    expect(commandJson.description_localizations).toEqual(
      cleanCmdDescriptionLocalizations,
    );

    const optionJson: any = commandJson.options?.[0];
    expect(optionJson.name).toBe("dry-run");
    expect(optionJson.description_localizations).toEqual(
      dryRunOptionDescriptionLocalizations,
    );
  });

  test("serializes a command with an option having choices with localizations", () => {
    const choice1NameLocalizations: LocalizationMap = {
      fr: "choix-un",
      "es-ES": "opcion-uno",
    };

    const choice2NameLocalizations: LocalizationMap = {
      fr: "choix-deux",
      "es-ES": "opcion-dos",
    };

    const choices = [
      {
        name: "choice-one",
        value: "one",
        nameLocalizations: choice1NameLocalizations,
      },
      {
        name: "choice-two",
        value: "two",
        nameLocalizations: choice2NameLocalizations,
      },
    ];

    const choiceCommand = createCommand({
      name: "choose",
      description: "Choose an option",
      handler: mock(),
      options: {
        selection: option({
          name: "select",
          description: "Make a selection",
          type: ApplicationCommandOptionType.String,
          required: true,
          extra: { choices },
        }),
      },
    });

    const [json] = serializeCommandsForAPI([choiceCommand]);

    const options = json.options ?? [];
    expect(options).toHaveLength(1);

    const optionJson: any = options[0];

    expect(optionJson.name).toBe("select");
    expect(optionJson.type).toBe(ApplicationCommandOptionType.String);

    expect(optionJson.choices).toHaveLength(2);

    const serializedChoice1 = optionJson.choices.find(
      (c: any) => c.value === "one",
    );
    expect(serializedChoice1).toBeDefined();
    expect(serializedChoice1.name).toBe("choice-one");
    expect(serializedChoice1.name_localizations).toEqual(
      choice1NameLocalizations,
    );

    const serializedChoice2 = optionJson.choices.find(
      (c: any) => c.value === "two",
    );
    expect(serializedChoice2).toBeDefined();
    expect(serializedChoice2.name).toBe("choice-two");
    expect(serializedChoice2.name_localizations).toEqual(
      choice2NameLocalizations,
    );
  });

  test("serializes choices without localizations if none provided", () => {
    const choices = [
      { name: "yes", value: "confirm" },
      { name: "no", value: "deny" },
    ];

    const confirmCommand = createCommand({
      name: "confirm",
      description: "Confirm something",
      handler: mock(),
      options: {
        answer: option({
          name: "response",
          description: "Your response",
          type: ApplicationCommandOptionType.String,
          required: true,
          extra: { choices: choices as any },
        }),
      },
    });

    const [json] = serializeCommandsForAPI([confirmCommand]);
    const options = json.options ?? [];
    const optionJson: any = options[0];

    expect(optionJson.choices).toHaveLength(2);
    expect(optionJson.choices[0].name_localizations).toBeUndefined();
    expect(optionJson.choices[1].name_localizations).toBeUndefined();
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
