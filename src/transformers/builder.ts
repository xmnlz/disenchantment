import {
  ApplicationCommandOptionType,
  type ApplicationCommandOptionData,
  type RESTPostAPIChatInputApplicationCommandsJSONBody,
} from "discord.js";
import type { AnySimpleCommand, CommandOrCommandGroup } from "../command.js";
import type {
  Options,
  OptionInterface,
  ChannelOptionExtra,
  StringOptionExtra,
  IntegerOrNumberOptionExtra,
} from "../option.js";
import type { SubcommandGroup } from "../group.js";

type JSONOpt = RESTPostAPIChatInputApplicationCommandsJSONBody["options"];

/** Serialize a single OptionInterface<T> → JSONOpt */
export function optionToJson(
  opt: OptionInterface<any>,
): ApplicationCommandOptionData {
  const {
    name,
    description,
    type,
    required,
    nameLocalizations,
    descriptionLocalizations,
  } = opt;

  const base: Partial<ApplicationCommandOptionData> = {
    name,
    description,
    type,
    required,
    nameLocalizations,
    descriptionLocalizations,
  };

  if (opt.extra) {
    switch (type) {
      case ApplicationCommandOptionType.String: {
        const extra = opt.extra as StringOptionExtra;

        if (extra.minLength) base.minLength = extra.minLength;
        if (extra.maxLength) base.maxLength = extra.maxLength;
        if (extra.choices) base.choices = extra.choices;
        if (extra.autocomplete && !extra.choices?.length)
          base.autocomplete = true;
        break;
      }

      case ApplicationCommandOptionType.Integer:
      case ApplicationCommandOptionType.Number: {
        const extra = opt.extra as IntegerOrNumberOptionExtra;
        if (extra.minValue != null) base.minValue = extra.minValue;
        if (extra.maxValue != null) base.maxValue = extra.maxValue;
        if (extra.choices) base.choices = extra.choices;
        if (extra.autocomplete && !extra.choices?.length)
          base.autocomplete = true;
        break;
      }

      case ApplicationCommandOptionType.Channel: {
        const extra = opt.extra as ChannelOptionExtra;
        if (extra.channelTypes) base.channelTypes = extra.channelTypes;
        break;
      }
    }
  }

  return base as ApplicationCommandOptionData;
}

function buildSubcommand(cmd: AnySimpleCommand): JSONOpt {
  const sub: any = {
    type: ApplicationCommandOptionType.Subcommand,
    name: cmd.name,
    description: cmd.description,
    options: [],
  };

  if (cmd.options) {
    for (const opt of Object.values(cmd.options) as Options[]) {
      sub.options.push(optionToJson(opt));
    }
  }

  return sub;
}

/** Build a subcommandGroup JSON block */
function buildSubcommandGroup(group: SubcommandGroup): JSONOpt {
  const grp: any = {
    type: ApplicationCommandOptionType.SubcommandGroup,
    name: group.name,
    description: group.description,
    options: [],
  };

  for (const child of group.commands) {
    if (child.type === "command") {
      grp.options.push(buildSubcommand(child));
    } else {
      grp.options.push(buildSubcommandGroup(child));
    }
  }

  return grp;
}

export function buildCommandJson(
  root: CommandOrCommandGroup,
): RESTPostAPIChatInputApplicationCommandsJSONBody {
  const body: RESTPostAPIChatInputApplicationCommandsJSONBody = {
    name: root.name,
    description: root.description,
    options: [],
  };

  // leaf command?
  if (root.type === "command") {
    if (root.options) {
      for (const opt of Object.values(root.options) as Options[]) {
        body.options!.push(optionToJson(opt));
      }
    }
  } else {
    // group: each child is subcommand or nested group
    for (const child of root.commands) {
      if (child.type === "command") {
        body.options!.push(buildSubcommand(child));
      } else {
        body.options!.push(buildSubcommandGroup(child));
      }
    }
  }

  return body;
}

/** Batch‐serialize an array */
export function buildAllJson(
  cmds: CommandOrCommandGroup[],
): RESTPostAPIChatInputApplicationCommandsJSONBody[] {
  return cmds.map(buildCommandJson);
}
