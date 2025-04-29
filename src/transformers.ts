import type {
  AnySimpleCommand,
  CommandOrCommandGroup,
  SubcommandGroup,
} from "./command.js";
import type { EventHandler, SimpleEvent } from "./event.js";
import type { Options } from "./option.js";

import {
  ApplicationCommandOptionType,
  type ClientEvents,
  type RESTPostAPIChatInputApplicationCommandsJSONBody,
  SlashCommandBuilder,
  type SlashCommandSubcommandBuilder,
  type SlashCommandSubcommandGroupBuilder,
} from "discord.js";

export const flattenCommandTree = (
  commands: readonly CommandOrCommandGroup[],
): Map<string, AnySimpleCommand> => {
  const commandMap = new Map<string, AnySimpleCommand>();

  const traverse = (
    commands: readonly CommandOrCommandGroup[],
    prefix: string[] = [],
  ) => {
    for (const cmd of commands) {
      const currentPath = [...prefix, cmd.name];
      const key = currentPath.join(" ");

      if (cmd.type === "command") {
        if (commandMap.get(key)) {
          throw new Error(`Duplicate command definition detected: ${key}`);
        }

        commandMap.set(key, cmd);
      } else if (cmd.type === "group") {
        traverse(cmd.commands, currentPath);
      }
    }
  };

  traverse(commands);

  return commandMap;
};

export const serializeCommandsForAPI = (
  commands: CommandOrCommandGroup[],
): RESTPostAPIChatInputApplicationCommandsJSONBody[] => {
  const restCommandsBody: RESTPostAPIChatInputApplicationCommandsJSONBody[] =
    [];

  const serializeSimpleCommand = (
    cmd: AnySimpleCommand,
    builder?: SlashCommandBuilder | SlashCommandSubcommandGroupBuilder,
  ) => {
    if (builder) {
      builder.addSubcommand((subCmdBuilder) => {
        subCmdBuilder.setName(cmd.name).setDescription(cmd.description);
        if (cmd.options) {
          for (const option of Object.values(cmd.options)) {
            appendOption(subCmdBuilder, option as Options);
          }
        }
        return subCmdBuilder;
      });
    } else {
      const cmdBuilder = new SlashCommandBuilder()
        .setName(cmd.name)
        .setDescription(cmd.description);
      if (cmd.options) {
        for (const option of Object.values(cmd.options)) {
          appendOption(cmdBuilder, option as Options);
        }
      }
      restCommandsBody.push(cmdBuilder.toJSON());
    }
  };

  const serializeCommandGroup = (
    groupCmd: SubcommandGroup,
    builder?: SlashCommandBuilder | SlashCommandSubcommandGroupBuilder,
  ) => {
    if (builder && builder instanceof SlashCommandBuilder) {
      builder.addSubcommandGroup((subGroupBuilder) => {
        subGroupBuilder
          .setName(groupCmd.name)
          .setDescription(groupCmd.description);
        traverse(groupCmd.commands, subGroupBuilder);
        return subGroupBuilder;
      });
    } else {
      const groupBuilder = new SlashCommandBuilder()
        .setName(groupCmd.name)
        .setDescription(groupCmd.description);
      traverse(groupCmd.commands, groupBuilder);
      restCommandsBody.push(groupBuilder.toJSON());
    }
  };

  const traverse = (
    cmds: (AnySimpleCommand | SubcommandGroup)[],
    builder?: SlashCommandBuilder | SlashCommandSubcommandGroupBuilder,
  ) => {
    for (const cmd of cmds) {
      if (cmd.type === "command") {
        serializeSimpleCommand(cmd, builder);
      } else if (cmd.type === "group") {
        serializeCommandGroup(cmd, builder);
      }
    }
  };

  traverse(commands);
  return restCommandsBody;
};

/**
 * TODO: Reimplemnt SlahsCommandBuilder into my own wrapper to create my own json, to make it more convinient
 */
export function appendOption(
  builder: SlashCommandBuilder | SlashCommandSubcommandBuilder,
  opt: Options,
) {
  switch (opt.type) {
    case ApplicationCommandOptionType.String:
      return builder.addStringOption((option) => {
        option
          .setName(opt.name)
          .setDescription(opt.description)
          .setRequired(opt.required);

        // if (minLength && maxLength && minLength > maxLength) {
        //   throw new Error(
        //     maxLength can't be bigger then minLenght, ${minLength} !> ${maxLength},
        //   );
        // }

        if (opt.extra) {
          const { maxLength, minLength, autocomplete, choices } = opt.extra;

          if (maxLength) option.setMaxLength(maxLength);
          if (minLength) option.setMinLength(minLength);

          if (choices) option.setChoices(...choices);
          if (autocomplete) option.setAutocomplete(true);
        }

        return option;
      });
    case ApplicationCommandOptionType.Integer:
      return builder.addIntegerOption((option) => {
        option
          .setName(opt.name)
          .setDescription(opt.description)
          .setRequired(opt.required);

        if (opt.extra) {
          const { maxValue, minValue, autocomplete, choices } = opt.extra;

          if (minValue) option.setMinValue(minValue);
          if (maxValue) option.setMaxValue(maxValue);
          if (autocomplete) option.setAutocomplete(autocomplete);

          if (choices) option.setChoices(...choices);
          if (autocomplete) option.setAutocomplete(true);
        }

        return option;
      });

    case ApplicationCommandOptionType.Number:
      return builder.addNumberOption((option) => {
        option
          .setName(opt.name)
          .setDescription(opt.description)
          .setRequired(opt.required);

        if (opt.extra) {
          const { minValue, maxValue, autocomplete, choices } = opt.extra;
          if (minValue) option.setMinValue(minValue);
          if (maxValue) option.setMaxValue(maxValue);
          if (autocomplete) option.setAutocomplete(autocomplete);

          if (choices) option.setChoices(...choices);
          if (autocomplete) option.setAutocomplete(true);
        }

        return option;
      });
    case ApplicationCommandOptionType.Boolean:
      return builder.addBooleanOption((option) =>
        option
          .setName(opt.name)
          .setDescription(opt.description)
          .setRequired(opt.required),
      );
    case ApplicationCommandOptionType.User:
      return builder.addUserOption((option) =>
        option
          .setName(opt.name)
          .setDescription(opt.description)
          .setRequired(opt.required),
      );
    case ApplicationCommandOptionType.Channel:
      return builder.addChannelOption((option) => {
        option
          .setName(opt.name)
          .setDescription(opt.description)
          .setRequired(opt.required);
        if (opt.extra) {
          const { channelTypes } = opt.extra;

          if (channelTypes) {
            option.addChannelTypes(channelTypes);
          }
        }

        return option;
      });
    case ApplicationCommandOptionType.Role:
      return builder.addRoleOption((option) =>
        option
          .setName(opt.name)
          .setDescription(opt.description)
          .setRequired(opt.required),
      );
    case ApplicationCommandOptionType.Mentionable:
      return builder.addMentionableOption((option) =>
        option
          .setName(opt.name)
          .setDescription(opt.description)
          .setRequired(opt.required),
      );
    case ApplicationCommandOptionType.Attachment:
      return builder.addAttachmentOption((option) =>
        option
          .setName(opt.name)
          .setDescription(opt.description)
          .setRequired(opt.required),
      );
    default:
      throw new Error(`Unsupported option type: ${opt}`);
  }
}

export type EventHanlderMap = Map<
  keyof ClientEvents,
  {
    once: EventHandler<keyof ClientEvents>[];
    on: EventHandler<keyof ClientEvents>[];
  }
>;

export const createEventHandlerMap = (
  events: SimpleEvent<keyof ClientEvents>[],
): EventHanlderMap => {
  const map: EventHanlderMap = new Map();

  for (const { event, handler, once } of events) {
    const record = map.get(event) || { once: [], on: [] };

    if (once) {
      record.once.push(handler);
    } else {
      record.on.push(handler);
    }

    map.set(event, record);
  }

  return map;
};
