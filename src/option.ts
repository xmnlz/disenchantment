import {
  ApplicationCommandOptionType,
  type Attachment,
  type Channel,
  type ChannelType,
  type GuildMember,
  type InteractionContextType,
  type LocalizationMap,
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

interface ChoiceOption<
  TValue extends number | string,
  TName extends string = string,
> {
  name: NotEmptyString<TName>;
  nameLocalizations?: LocalizationMap;
  value: TValue;
}

type StringChoice = ChoiceOption<string>[];
type NumberChoice = ChoiceOption<number>[];

export interface StringOptionExtra {
  autocomplete?: boolean;
  choices?: StringChoice;
  maxLength?: number;
  minLength?: number;
}

export interface IntegerOrNumberOptionExtra {
  autocomplete?: boolean;
  choices?: NumberChoice;
  maxValue?: number;
  minValue?: number;
}

export type AllowedChannel = Exclude<
  ChannelType,
  ChannelType.GroupDM | ChannelType.DM | ChannelType.GuildDirectory
>;

export interface ChannelOptionExtra {
  channelTypes?: AllowedChannel[];
}

type OptionExtra<TOption extends ValidCommandOptions> =
  TOption extends ApplicationCommandOptionType.String
    ? StringOptionExtra
    : TOption extends ApplicationCommandOptionType.Integer
      ? IntegerOrNumberOptionExtra
      : TOption extends ApplicationCommandOptionType.Number
        ? IntegerOrNumberOptionExtra
        : TOption extends ApplicationCommandOptionType.Channel
          ? ChannelOptionExtra
          : never;

export interface OptionInterface<
  TOption extends ValidCommandOptions,
  TName extends string = string,
  TDesc extends string = string,
  TRequire extends boolean = boolean,
> {
  /** Option identifier (1–32 chars, lowercase) */
  name: NotEmptyString<TName>;

  /**
   * Localized versions of the option name.
   *
   * Keys must be valid `Locale` identifiers (e.g., 'en-US', 'fr', 'ja').
   * Values must be lowercase strings between 1 and 32 characters.
   */
  nameLocalizations?: LocalizationMap;

  /** Brief description (max. 100 chars) */
  description: NotEmptyString<TDesc>;

  /**
   * Localized versions of the option description.
   *
   * Keys must be valid `Locale` identifiers (e.g., 'en-US', 'fr', 'ja').
   * Values must be strings up to 100 characters.
   */
  descriptionLocalizations?: LocalizationMap;

  /** Discords `ApplicationCommandOptionType` code */
  type: TOption;

  /** Whether this option must be required by the user */
  required: TRequire;

  /** Type-specific constraints */
  extra?: OptionExtra<TOption>;
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
 * Options are collected in a record on the command; the record's **keys** become
 * the property names on the handler's `args`, while `name` is what Discord shows
 * the user. Keeping the two the same is clearest, but they may differ.
 *
 * `required` has no default and must be given explicitly. It decides whether the
 * argument is typed `T` or `T | undefined`, so leaving it implicit would quietly
 * weaken inference.
 *
 * `extra` is typed per option type — fields that do not apply to the chosen type
 * are a compile error:
 *
 * | Option type | Available `extra` fields |
 * | --- | --- |
 * | `String` | `minLength`, `maxLength`, `choices`, `autocomplete` |
 * | `Integer`, `Number` | `minValue`, `maxValue`, `choices`, `autocomplete` |
 * | `Channel` | `channelTypes` |
 * | all others | none |
 *
 * @example
 * ```ts
 * const messageOption = option({
 *   name: "message",
 *   description: "Text to echo",
 *   type: ApplicationCommandOptionType.String,
 *   required: true,
 *   extra: {
 *     maxLength: 50,
 *   },
 * });
 * ```
 *
 * @example Choices, with a localized label and a stable value:
 * ```ts
 * const mode = option({
 *   name: "mode",
 *   description: "Playback mode",
 *   type: ApplicationCommandOptionType.String,
 *   required: false,
 *   extra: {
 *     choices: [
 *       { name: "Repeat", nameLocalizations: { fr: "répéter" }, value: "repeat" },
 *       { name: "Shuffle", value: "shuffle" },
 *     ],
 *   },
 * });
 * ```
 *
 * @param options - A fully typed option object with name, type, description, requirement flag,
 *                  and any additional constraints (`extra`).
 * @returns The same object, with its types preserved for downstream inference.
 *
 * @see {@link OptionValue} for how each option type maps to a handler argument type.
 */
export const option: Option = (options) => {
  return options;
};

type IncludesGuild<TContext extends InteractionContextType[]> =
  InteractionContextType.Guild extends TContext[number] ? true : false;

type OptionTypeMap<TGuildContext extends boolean> = {
  [ApplicationCommandOptionType.String]: string;
  [ApplicationCommandOptionType.Integer]: number;
  [ApplicationCommandOptionType.Boolean]: boolean;
  [ApplicationCommandOptionType.Number]: number;
  [ApplicationCommandOptionType.Channel]: Channel | VoiceChannel | TextChannel;
  [ApplicationCommandOptionType.Attachment]: Attachment;
  [ApplicationCommandOptionType.Role]: Role;
  [ApplicationCommandOptionType.Mentionable]: TGuildContext extends true
    ? User | Role | GuildMember
    : User | Role;
  [ApplicationCommandOptionType.User]: TGuildContext extends true
    ? GuildMember
    : User | GuildMember;
};

/**
 * Resolves one option type to the value a handler receives for it.
 *
 * A command's `context` sharpens the result: with `InteractionContextType.Guild`
 * a `User` option narrows from `User | GuildMember` to `GuildMember`, and
 * `Mentionable` widens to include `GuildMember`.
 *
 * Types absent from the internal map fall back to `unknown`.
 */
export type OptionValue<
  TOption extends ValidCommandOptions,
  TInteractionContext extends InteractionContextType[],
> = TOption extends keyof OptionTypeMap<IncludesGuild<TInteractionContext>>
  ? OptionTypeMap<IncludesGuild<TInteractionContext>>[TOption]
  : unknown;

/**
 * Maps a command's `options` record to the `args` object its handler receives.
 *
 * Keys are carried over unchanged; each value is resolved through
 * {@link OptionValue}, and options declared `required: false` gain `| undefined`.
 */
export type ExtractArgs<
  TOptions extends Record<string, AnyOption>,
  TInteractionContext extends InteractionContextType[],
> = {
  [K in keyof TOptions]: TOptions[K]["required"] extends true
    ? OptionValue<TOptions[K]["type"], TInteractionContext>
    : OptionValue<TOptions[K]["type"], TInteractionContext> | undefined;
};
