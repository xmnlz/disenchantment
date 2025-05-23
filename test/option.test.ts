import { beforeEach, describe, expect, test } from "bun:test";
import {
  ApplicationCommandOptionType,
  ChannelType,
  LocalizationMap,
  SlashCommandBuilder,
  SlashCommandSubcommandBuilder,
} from "discord.js";
import { Options, option } from "../src/option";
import { applyOption } from "../src/transformers/options";

function getSingleOption(
  builder: SlashCommandBuilder | SlashCommandSubcommandBuilder,
): any {
  const json = builder.toJSON();
  if (!json.options || json.options.length !== 1) {
    throw new Error(`Expected exactly one option, got ${json.options?.length}`);
  }
  return json.options[0] as any;
}

describe("option()", () => {
  test("returns the exact object passed into option()", () => {
    const opt = option({
      name: "foo",
      description: "bar",
      type: ApplicationCommandOptionType.String,
      required: true,
    });

    expect(opt).toBe(opt);
    expect(opt).toEqual(opt);
  });
});

describe("appendOption()", () => {
  let cmd: SlashCommandBuilder;
  let subCmd: SlashCommandSubcommandBuilder;

  beforeEach(() => {
    cmd = new SlashCommandBuilder().setName("name").setDescription("desc");
    subCmd = new SlashCommandSubcommandBuilder()
      .setName("sub-name")
      .setDescription("sub-description");
  });

  describe("String options", () => {
    const baseOption: Options = {
      name: "s",
      description: "str",
      type: ApplicationCommandOptionType.String,
      required: true,
    };

    test("appends a required string option to a command", () => {
      applyOption(cmd, baseOption);
      const opt = getSingleOption(cmd);
      expect(opt).toEqual(cmd.options[0]);
    });

    test("applies minLength and maxLength to string option", () => {
      const lengthOption = option({
        ...baseOption,
        required: false,
        extra: { minLength: 5, maxLength: 50 },
      });

      applyOption(cmd, lengthOption);
      const opt = getSingleOption(cmd);

      expect(opt.min_length).toBe(5);
      expect(opt.max_length).toBe(50);
      expect(opt.required).toBe(false);
    });

    test("enables autocomplete on string option", () => {
      const autocompleteOption = option({
        ...baseOption,
        extra: { autocomplete: true },
      });

      applyOption(cmd, autocompleteOption);
      const opt = getSingleOption(cmd);

      expect(opt.autocomplete).toBe(true);
    });

    test("adds string option choices", () => {
      const choices = [
        { name: "A", value: "a" },
        { name: "B", value: "b" },
      ];

      const choiceOption = option({
        ...baseOption,
        extra: { choices },
      });

      applyOption(cmd, choiceOption);
      const opt = getSingleOption(cmd);

      expect(opt.choices).toEqual(choices);
    });

    test("applies all extra string settings together", () => {
      const choices = [{ name: "X", value: "x" }];

      const fullOption = option({
        ...baseOption,
        required: false,
        extra: { choices, minLength: 1, maxLength: 5 },
      });

      applyOption(cmd, fullOption);
      const opt = getSingleOption(cmd);

      expect(opt.min_length).toBe(1);
      expect(opt.max_length).toBe(5);
      expect(opt.choices).toEqual(choices);
      expect(opt.required).toBe(false);
    });
  });

  describe("Integer options", () => {
    const baseOption: Options = {
      name: "i",
      description: "int",
      type: ApplicationCommandOptionType.Integer,
      required: false,
    };

    test("appends a basic integer option", () => {
      applyOption(cmd, option(baseOption));
      const opt = getSingleOption(cmd);
      expect(opt).toEqual(cmd.options[0]);
    });

    test("applies min and max values to integer option", () => {
      const optionWithMinMax = option({
        ...baseOption,
        required: true,
        extra: { minValue: 5, maxValue: 100 },
      });

      applyOption(cmd, optionWithMinMax);
      const opt = getSingleOption(cmd);

      expect(opt.min_value).toBe(5);
      expect(opt.max_value).toBe(100);
      expect(opt.required).toBe(true);
    });

    test("adds choices to integer option", () => {
      const choices = [
        { name: "Ten", value: 10 },
        { name: "Twenty", value: 20 },
      ];

      applyOption(cmd, option({ ...baseOption, extra: { choices } }));
      const opt = getSingleOption(cmd);

      expect(opt.choices).toEqual(choices);
    });
  });

  describe("Number options", () => {
    const baseOption: Options = {
      name: "n",
      description: "num",
      type: ApplicationCommandOptionType.Number,
      required: true,
    };

    test("appends a basic number option", () => {
      applyOption(cmd, option(baseOption));
      const opt = getSingleOption(cmd);
      expect(opt).toEqual(cmd.options[0]);
    });

    test("applies min and max values to number option", () => {
      const optionWithMinMax = option({
        ...baseOption,
        required: false,
        extra: { minValue: 0.5, maxValue: 99.9 },
      });

      applyOption(cmd, optionWithMinMax);
      const opt = getSingleOption(cmd);

      expect(opt.min_value).toBe(0.5);
      expect(opt.max_value).toBe(99.9);
      expect(opt.required).toBe(false);
    });
  });

  describe("Primitive option types", () => {
    const mappings = [
      { type: ApplicationCommandOptionType.Boolean, key: "Boolean" },
      { type: ApplicationCommandOptionType.User, key: "User" },
      { type: ApplicationCommandOptionType.Role, key: "Role" },
      { type: ApplicationCommandOptionType.Mentionable, key: "Mentionable" },
      { type: ApplicationCommandOptionType.Attachment, key: "Attachment" },
    ] as const;

    for (const { type, key } of mappings) {
      test(`appends a basic ${key} option`, () => {
        const mappedOption = option({
          name: key.toLowerCase(),
          description: `${key} desc`,
          type,
          required: true,
        });

        applyOption(cmd, mappedOption);
        const opt = getSingleOption(cmd);

        expect(opt.type).toBe(type);
        expect(opt.name).toBe(key.toLowerCase());
        expect(opt.description).toBe(`${key} desc`);
        expect(opt.required).toBe(true);
      });
    }
  });

  describe("Channel options", () => {
    test("appends a basic channel option with no types", () => {
      const channelOpt = option({
        name: "chan",
        description: "channel desc",
        type: ApplicationCommandOptionType.Channel,
        required: true,
      });

      applyOption(cmd, channelOpt);
      const opt = getSingleOption(cmd);

      expect(opt.type).toBe(ApplicationCommandOptionType.Channel);
      expect(opt.channel_types).toBeUndefined();
    });

    test("appends a channel option with specific channel types", () => {
      const channelOption = option({
        name: "chan",
        description: "channel desc",
        type: ApplicationCommandOptionType.Channel,
        required: false,
        extra: {
          channelTypes: [ChannelType.GuildText, ChannelType.GuildVoice],
        },
      });

      applyOption(cmd, channelOption);
      const opt = getSingleOption(cmd);

      expect(opt.channel_types).toEqual([
        ChannelType.GuildText,
        ChannelType.GuildVoice,
      ]);
      expect(opt.required).toBe(false);
    });

    test("appends a channel option with an empty channelTypes array", () => {
      const emptyChannelOpt = option({
        name: "chan",
        description: "channel desc",
        type: ApplicationCommandOptionType.Channel,
        required: false,
        extra: { channelTypes: [] },
      });

      applyOption(cmd, emptyChannelOpt);
      const opt = getSingleOption(cmd);

      expect(opt.channel_types).toEqual([]);
    });
  });

  test("throws an error for unsupported option types", () => {
    const badOpt = option({
      name: "x",
      description: "y",
      type: 999 as ApplicationCommandOptionType,
      required: true,
    });

    expect(() => applyOption(cmd, badOpt as Options)).toThrow(
      /Unsupported option type/,
    );
  });

  test("appends option to a subcommand builder", () => {
    applyOption(subCmd, {
      name: "sub",
      description: "sub desc",
      type: ApplicationCommandOptionType.Boolean,
      required: false,
    });

    const opt = getSingleOption(subCmd);
    expect(opt.name).toBe("sub");
    expect(opt.type).toBe(ApplicationCommandOptionType.Boolean);
    expect(opt.required).toBe(false);
  });

  test("returns the object with name and description localizations if provided", () => {
    const nameLocalizations: LocalizationMap = { fr: "message" };
    const descriptionLocalizations: LocalizationMap = { fr: "Texte à répéter" };

    const opt = option({
      name: "message",
      description: "Text to echo",
      type: ApplicationCommandOptionType.String,
      required: true,
      nameLocalizations,
      descriptionLocalizations,
    });

    expect(opt.name).toBe("message");
    expect(opt.description).toBe("Text to echo");
    expect(opt.nameLocalizations).toEqual(nameLocalizations);
    expect(opt.descriptionLocalizations).toEqual(descriptionLocalizations);
  });

  test("returns the object without localization maps if none provided", () => {
    const opt = option({
      name: "message",
      description: "Text to echo",
      type: ApplicationCommandOptionType.String,
      required: true,
    });

    expect(opt.nameLocalizations).toBeUndefined();
    expect(opt.descriptionLocalizations).toBeUndefined();
  });
});
