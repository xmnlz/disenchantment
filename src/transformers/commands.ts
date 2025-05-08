import {
  type LocalizationMap,
  type RESTPostAPIChatInputApplicationCommandsJSONBody,
  SlashCommandBuilder,
  type SlashCommandSubcommandBuilder,
  type SlashCommandSubcommandGroupBuilder,
} from "discord.js";
import type { AnySimpleCommand, CommandOrCommandGroup } from "../command";
import type { SubcommandGroup } from "../group";
import type { Options } from "../option";
import { appendOption } from "./options";

export const flattenCommandTree = (
  commands: readonly CommandOrCommandGroup[],
): Map<string, AnySimpleCommand> => {
  const map = new Map<string, AnySimpleCommand>();

  const walk = (
    list: readonly CommandOrCommandGroup[],
    prefix: string[] = [],
  ) => {
    for (const node of list) {
      const path = [...prefix, node.name];
      const key = path.join(" ");

      if (node.type === "command") {
        const existing = map.get(key);

        if (existing) {
          throw new Error(`Duplicate command definition detected: ${key}`);
        }

        map.set(key, node);
      } else {
        walk(node.commands, path);
      }
    }
  };

  walk(commands);
  return map;
};

export const serializeCommandsForAPI = (
  commands: CommandOrCommandGroup[],
): RESTPostAPIChatInputApplicationCommandsJSONBody[] => {
  return commands.map((cmd) =>
    cmd.type === "command" ? buildRootCommand(cmd) : buildGroupedCommand(cmd),
  );
};

const applyLocalizations = (
  builder:
    | SlashCommandBuilder
    | SlashCommandSubcommandGroupBuilder
    | SlashCommandSubcommandBuilder,

  nameLocalizations?: LocalizationMap,
  descriptionLocalizations?: LocalizationMap,
) => {
  if (nameLocalizations) builder.setNameLocalizations(nameLocalizations);
  if (descriptionLocalizations)
    builder.setDescriptionLocalizations(descriptionLocalizations);
};

const buildRootCommand = (cmd: AnySimpleCommand) => {
  const builder = new SlashCommandBuilder()
    .setName(cmd.name)
    .setDescription(cmd.description);

  applyLocalizations(
    builder,
    cmd.nameLocalizations,
    cmd.descriptionLocalizations,
  );

  if (cmd.options) {
    for (const opt of Object.values(cmd.options)) {
      appendOption(builder, opt as Options);
    }
  }

  return builder.toJSON();
};

const buildGroupedCommand = (group: SubcommandGroup) => {
  const builder = new SlashCommandBuilder()
    .setName(group.name)
    .setDescription(group.description);

  applyLocalizations(
    builder,
    group.options?.nameLocalizations,
    group.options?.descriptionLocalizations,
  );

  for (const sub of group.commands) {
    if (sub.type === "command") {
      builder.addSubcommand((subBuilder) => buildSubCommand(subBuilder, sub));
    } else if (sub.type === "group") {
      builder.addSubcommandGroup((groupBuilder) =>
        buildSubCommandGroup(groupBuilder, sub),
      );
    }
  }

  return builder.toJSON();
};

const buildSubCommand = (
  subBuilder: SlashCommandSubcommandBuilder,
  cmd: AnySimpleCommand,
) => {
  subBuilder.setName(cmd.name).setDescription(cmd.description);

  applyLocalizations(
    subBuilder,
    cmd.nameLocalizations,
    cmd.descriptionLocalizations,
  );

  if (cmd.options) {
    for (const opt of Object.values(cmd.options)) {
      appendOption(subBuilder, opt as Options);
    }
  }

  return subBuilder;
};

const buildSubCommandGroup = (
  groupBuilder: SlashCommandSubcommandGroupBuilder,
  group: SubcommandGroup,
) => {
  groupBuilder.setName(group.name).setDescription(group.description);

  applyLocalizations(
    groupBuilder,
    group.options?.nameLocalizations,
    group.options?.descriptionLocalizations,
  );

  for (const nested of group.commands) {
    if (nested.type === "command") {
      groupBuilder.addSubcommand((subBuilder) =>
        buildSubCommand(subBuilder, nested),
      );
    }
  }

  return groupBuilder;
};
