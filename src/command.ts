import type { InteractionContextType, LocalizationMap } from "discord.js";
import type { SubcommandGroup } from "./group";
import type { ContextFromGuards, GuardFn } from "./guard";
import type { ExtractArgs } from "./option";
import type { NotEmptyString } from "./types";

export type AnySimpleCommand = SimpleCommand<any, any, any, any>;

export type CommandOrCommandGroup = AnySimpleCommand | SubcommandGroup;

export type CommandHandler<
  TOptions extends Record<string, any>,
  TGuards extends GuardFn<any, any>[],
  TInteractionContext extends InteractionContextType[],
> = (
  interaction: any,
  args: ExtractArgs<TOptions, TInteractionContext>,
  context: ContextFromGuards<TGuards>,
) => Promise<void>;

export interface SimpleCommand<
  TOptions extends Record<string, any> = any,
  TGuards extends GuardFn<any, any>[] = GuardFn<any, any>[],
  TInteractionContext extends InteractionContextType[] = [],
  TName extends string = string,
  TDesc extends string = string,
> {
  type: "command";

  /**
   * The name of the command. Must be 1–32 characters and lowercase.
   */
  name: NotEmptyString<TName>;

  /**
   * Localized versions of the command name.
   *
   * Keys must be valid `Locale` identifiers (e.g., 'en-US', 'fr', 'ja').
   * Values must be lowercase strings between 1 and 32 characters.
   */
  nameLocalizations?: LocalizationMap;

  /**
   * A short description of what the command does. Maximum 100 characters.
   */
  description: NotEmptyString<TDesc>;

  /**
   * Localized versions of the command description.
   *
   * Keys must be valid `Locale` identifiers (e.g., 'en-US', 'fr', 'ja').
   * Values must be strings up to 100 characters.
   */
  descriptionLocalizations?: LocalizationMap;

  /**
   * Optional input parameters for this command.
   */
  options?: TOptions;

  /**
   * Optional guard functions executed before the command handler.
   */
  guards?: TGuards;

  /**
   * Specifies the interaction contexts in which this command can be registered (e.g., guild-only).
   *
   * This property is applicable only to globally-scoped commands.
   *
   * When set to `InteractionContextType.Guild`, it enables more accurate type inference—
   * such as resolving `ApplicationCommandOptionType.User` to a `GuildMember`.
   *
   * Note: Type inference remains functional regardless of whether this field is set,
   * but certain improvements (like `GuildMember` resolution) depend on this context.
   *
   * @see https://discord.com/developers/docs/resources/application#installation-context
   */
  context?: TInteractionContext;

  /**
   * The function that executes when the command is triggered.
   */
  handler: CommandHandler<TOptions, TGuards, TInteractionContext>;
}

/**
 * Creates a top-level slash command definition.
 *
 * Accepts an optional set of typed options and guard functions.
 *
 * @example
 * ```ts
 * const echo = createCommand({
 *   name: "echo",
 *   description: "Replies with the given message.",
 *   options: {
 *     message: option({
 *       name: "message",
 *       description: "Text to reply with",
 *       type: ApplicationCommandOptionType.String,
 *       required: true,
 *     }),
 *   },
 *   handler: async (interaction, args) => {
 *     await interaction.reply(args.message);
 *   },
 * });
 * ```
 *
 * @example
 * ```ts
 * const adminCommand = createCommand({
 *   name: "secure",
 *   description: "Restricted to admins.",
 *   guards: guards(
 *     async (client, interaction, next) => {
 *       const hasAdmin = interaction.memberPermissions?.has("Administrator");
 *       if (!hasAdmin) {
 *         await interaction.reply({ content: "Access denied.", ephemeral: true });
 *         return;
 *       }
 *       await next();
 *     }
 *   ),
 *   handler: async (interaction) => {
 *     await interaction.reply("Admin access confirmed.");
 *   },
 * });
 * ```
 *
 * @param config - Command metadata including name, description, handler, and optional options/guards.
 * @returns A structured command definition.
 */
export const createCommand = <
  TOptions extends Record<string, any> = any,
  TGuards extends GuardFn<any, any>[] = [],
  TInteractionContext extends InteractionContextType[] = [],
  TName extends string = string,
  TDesc extends string = string,
>(
  config: Omit<
    SimpleCommand<TOptions, TGuards, TInteractionContext, TName, TDesc>,
    "type"
  >,
): SimpleCommand<TOptions, TGuards, TInteractionContext, TName, TDesc> => ({
  type: "command",
  ...config,
});
