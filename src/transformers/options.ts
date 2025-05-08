import {
  ApplicationCommandOptionType,
  type LocalizationMap,
  type SlashCommandBuilder,
  type SlashCommandSubcommandBuilder,
} from "discord.js";
import type { Options } from "../option";

type Builder = SlashCommandBuilder | SlashCommandSubcommandBuilder;

function applyCommon<
  O extends {
    setName(name: string): O;
    setDescription(desc: string): O;
    setRequired(req: boolean): O;
    setNameLocalizations?(loc: LocalizationMap): O;
    setDescriptionLocalizations?(loc: LocalizationMap): O;
  },
>(
  option: O,
  {
    name,
    description,
    required,
    nameLocalizations,
    descriptionLocalizations,
  }: Options,
): O {
  option.setName(name).setDescription(description).setRequired(required);

  if (nameLocalizations) {
    option.setNameLocalizations?.(nameLocalizations);
  }
  if (descriptionLocalizations) {
    option.setDescriptionLocalizations?.(descriptionLocalizations);
  }
  return option;
}

export function appendOption(builder: Builder, opt: Options) {
  switch (opt.type) {
    case ApplicationCommandOptionType.String: {
      return builder.addStringOption((o) => {
        applyCommon(o, opt);

        if (opt.extra) {
          const { minLength, maxLength, choices, autocomplete } = opt.extra;

          if (minLength) o.setMinLength(minLength);
          if (maxLength) o.setMaxLength(maxLength);

          if (choices) {
            const apiChoices = choices.map((choice) => ({
              name: choice.name,
              value: choice.value,
              name_localizations: choice.nameLocalizations,
            }));

            o.setChoices(...apiChoices);
          }

          if (autocomplete) o.setAutocomplete(true);
        }

        return o;
      });
    }

    case ApplicationCommandOptionType.Integer: {
      return builder.addIntegerOption((o) => {
        applyCommon(o, opt);

        if (opt.extra) {
          const { minValue, maxValue, choices, autocomplete } = opt.extra;

          if (minValue) o.setMinValue(minValue);
          if (maxValue) o.setMaxValue(maxValue);

          if (choices) {
            const apiChoices = choices.map((choice) => ({
              name: choice.name,
              value: choice.value,
              name_localizations: choice.nameLocalizations,
            }));

            o.setChoices(...apiChoices);
          }

          if (autocomplete) o.setAutocomplete(true);
        }

        return o;
      });
    }

    case ApplicationCommandOptionType.Number: {
      return builder.addNumberOption((o) => {
        applyCommon(o, opt);

        if (opt.extra) {
          const { minValue, maxValue, choices, autocomplete } = opt.extra;

          if (minValue) o.setMinValue(minValue);
          if (maxValue) o.setMaxValue(maxValue);

          if (choices) {
            const apiChoices = choices.map((choice) => ({
              name: choice.name,
              value: choice.value,
              name_localizations: choice.nameLocalizations,
            }));

            o.setChoices(...apiChoices);
          }

          if (autocomplete) o.setAutocomplete(true);
        }

        return o;
      });
    }

    case ApplicationCommandOptionType.Boolean:
      return builder.addBooleanOption((o) => applyCommon(o, opt));

    case ApplicationCommandOptionType.User:
      return builder.addUserOption((o) => applyCommon(o, opt));

    case ApplicationCommandOptionType.Channel:
      return builder.addChannelOption((o) => {
        applyCommon(o, opt);

        if (opt.extra?.channelTypes) {
          o.addChannelTypes(opt.extra.channelTypes);
        }

        return o;
      });

    case ApplicationCommandOptionType.Role:
      return builder.addRoleOption((o) => applyCommon(o, opt));

    case ApplicationCommandOptionType.Mentionable:
      return builder.addMentionableOption((o) => applyCommon(o, opt));

    case ApplicationCommandOptionType.Attachment:
      return builder.addAttachmentOption((o) => applyCommon(o, opt));

    default:
      throw new Error(`Unsupported option type: ${(opt as any).type}`);
  }
}
