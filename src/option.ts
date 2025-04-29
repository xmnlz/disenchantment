import {
  ApplicationCommandOptionType,
  type Channel,
  type ChannelType,
  type GuildMember,
  type Role,
  type TextChannel,
  type User,
  type VoiceChannel,
} from "discord.js";
import type { NotEmptyString } from "./types";

export type ValidCommandOptions = Exclude<
  ApplicationCommandOptionType,
  | ApplicationCommandOptionType.Subcommand
  | ApplicationCommandOptionType.SubcommandGroup
>;

export type AnyOption = OptionInterface<ValidCommandOptions, any, any, any>;

export type Options =
  | OptionInterface<ApplicationCommandOptionType.String>
  | OptionInterface<ApplicationCommandOptionType.Integer>
  | OptionInterface<ApplicationCommandOptionType.Number>
  | OptionInterface<ApplicationCommandOptionType.Boolean>
  | OptionInterface<ApplicationCommandOptionType.User>
  | OptionInterface<ApplicationCommandOptionType.Channel>
  | OptionInterface<ApplicationCommandOptionType.Role>
  | OptionInterface<ApplicationCommandOptionType.Mentionable>
  | OptionInterface<ApplicationCommandOptionType.Attachment>;

interface ChoiceOption<T extends number | string, N extends string = string> {
  name: NotEmptyString<N>;
  value: T;
}

type StringChoice = ChoiceOption<string>[];
type NumberChoice = ChoiceOption<number>[];

interface StringOptionExtra {
  autocomplete?: boolean;
  choices?: StringChoice;
  maxLength?: number;
  minLength?: number;
}

interface IntegerOptionExtra {
  autocomplete?: boolean;
  choices?: NumberChoice;
  maxValue?: number;
  minValue?: number;
}

interface NumberOptionExtra {
  autocomplete?: boolean;
  choices?: NumberChoice;
  maxValue?: number;
  minValue?: number;
}

export interface ChannelOptionExtra {
  channelTypes?: Exclude<
    ChannelType,
    ChannelType.GroupDM | ChannelType.DM | ChannelType.GuildDirectory
  >[];
}

type OptionExtra<T extends ValidCommandOptions> =
  T extends ApplicationCommandOptionType.String
    ? StringOptionExtra
    : T extends ApplicationCommandOptionType.Integer
      ? IntegerOptionExtra
      : T extends ApplicationCommandOptionType.Number
        ? NumberOptionExtra
        : T extends ApplicationCommandOptionType.Channel
          ? ChannelOptionExtra
          : never;

export interface OptionInterface<
  T extends ValidCommandOptions,
  N extends string = string,
  D extends string = string,
  R extends boolean = boolean,
> {
  name: NotEmptyString<N>;
  description: NotEmptyString<D>;
  type: T;
  required: R;
  extra?: OptionExtra<T>;
}

type Option = <
  TCommandOptions extends ValidCommandOptions,
  TName extends string,
  TDesc extends string,
  TRequire extends boolean,
>(
  options: OptionInterface<TCommandOptions, TName, TDesc, TRequire>,
) => OptionInterface<TCommandOptions, TName, TDesc, TRequire>;

/**
 * Creates a typed option for use inside a command definition.
 *
 * @example
 * ```ts
 * const messageOption = option({
 *   name: "message",
 *   description: "Text to echo",
 *   type: ApplicationCommandOptionType.String,
 *   required: true,
 *   extra: {
 *     maxLength: 200,
 *   },
 * });
 * ```
 *
 * @param options - A fully typed option object with name, type, description, and constraints.
 * @returns The same object, with inferred types.
 */
export const option: Option = (options) => {
  return options;
};

type OptionTypeMap = {
  [ApplicationCommandOptionType.String]: string;
  [ApplicationCommandOptionType.Integer]: number;
  [ApplicationCommandOptionType.Boolean]: boolean;
  [ApplicationCommandOptionType.User]: User;
  [ApplicationCommandOptionType.Channel]: Channel | VoiceChannel | TextChannel;
  [ApplicationCommandOptionType.Role]: Role;
  [ApplicationCommandOptionType.Mentionable]: User | Role | GuildMember;
  [ApplicationCommandOptionType.Number]: number;
};

export type OptionValue<T extends ValidCommandOptions> =
  T extends keyof OptionTypeMap ? OptionTypeMap[T] : unknown;

export type ExtractArgs<T extends Record<string, OptionInterface<any>> = any> =
  {
    [K in keyof T]: T[K]["required"] extends true
      ? OptionValue<T[K]["type"]>
      : OptionValue<T[K]["type"]> | undefined;
  };
