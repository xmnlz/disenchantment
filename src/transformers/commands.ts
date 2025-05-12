import {
  type RESTPostAPIChatInputApplicationCommandsJSONBody,
  SlashCommandBuilder,
  SlashCommandSubcommandBuilder,
  type SlashCommandSubcommandGroupBuilder,
} from "discord.js";
import type { AnySimpleCommand, CommandOrCommandGroup } from "../command";
import type { SubcommandGroup } from "../group";
import type { Options } from "../option";
import { applyOption } from "./options";

export function flattenCommandTree(
  commands: CommandOrCommandGroup[],
): Map<string, AnySimpleCommand> {
  const map = new Map<string, AnySimpleCommand>();

  function walk(nodes: CommandOrCommandGroup[], path: string[] = []) {
    for (const node of nodes) {
      const fullPath = [...path, node.name];

      const key = fullPath.join(" ");

      if (node.type === "command") {
        if (map.has(key)) {
          throw new Error(`Duplicate command definition detected: ${key}`);
        }
        map.set(key, node);
      } else {
        walk(node.commands, fullPath);
      }
    }
  }

  walk(commands);
  return map;
}

export const serializeCommandsForAPI = (
  items: CommandOrCommandGroup[],
): RESTPostAPIChatInputApplicationCommandsJSONBody[] => {
  return items.map((item) =>
    item.type === "command" ? buildCommand(item) : buildGroup(item),
  );
};

const buildCommand = (cmd: AnySimpleCommand) => {
  const builder = new SlashCommandBuilder()
    .setName(cmd.name)
    .setDescription(cmd.description);

  applyCommandMetadate(builder, cmd);

  return builder.toJSON();
};

const buildGroup = (group: SubcommandGroup) => {
  const builder = new SlashCommandBuilder()
    .setName(group.name)
    .setDescription(group.description);

  applyCommandMetadate(builder, group);

  for (const sub of group.commands) {
    if (sub.type === "command") {
      builder.addSubcommand((sb) => attachSub(sb, sub));
    } else {
      builder.addSubcommandGroup((gb) => attachGroup(gb, sub));
    }
  }

  return builder.toJSON();
};

const attachSub = (
  builder: SlashCommandSubcommandBuilder,
  cmd: CommandOrCommandGroup,
) => {
  builder.setName(cmd.name).setDescription(cmd.description);

  applyCommandMetadate(builder, cmd);

  return builder;
};

const attachGroup = (
  builder: SlashCommandSubcommandGroupBuilder,
  group: SubcommandGroup,
) => {
  builder.setName(group.name).setDescription(group.description);

  applyCommandMetadate(builder, group);

  for (const nested of group.commands) {
    builder.addSubcommand((sb) => attachSub(sb, nested));
  }

  return builder;
};

const applyCommandMetadate = (
  builder:
    | SlashCommandBuilder
    | SlashCommandSubcommandBuilder
    | SlashCommandSubcommandGroupBuilder,
  node: CommandOrCommandGroup,
) => {
  const nameLoc =
    node.type === "group"
      ? node.options?.nameLocalizations
      : node.nameLocalizations;

  const descLoc =
    node.type === "group"
      ? node.options?.descriptionLocalizations
      : node.descriptionLocalizations;

  if (nameLoc) builder.setNameLocalizations(nameLoc);
  if (descLoc) builder.setDescriptionLocalizations(descLoc);

  if (
    node.type === "command" &&
    builder instanceof SlashCommandBuilder &&
    "context" in node &&
    node.context
  ) {
    builder.setContexts(node.context);
  }

  if (
    node.type === "command" &&
    (builder instanceof SlashCommandBuilder ||
      builder instanceof SlashCommandSubcommandBuilder) &&
    node.options
  ) {
    for (const opt of Object.values(node.options)) {
      applyOption(builder, opt as Options);
    }
  }
};
