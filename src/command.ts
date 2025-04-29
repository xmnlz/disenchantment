import type { ContextFromGuards, GuardFn } from "./guard";
import type { ExtractArgs } from "./option";
import type { NotEmptyString } from "./types";

export type AnySimpleCommand = SimpleCommand<any, any, any, any>;

export type CommandOrCommandGroup = AnySimpleCommand | SubcommandGroup;

export type CommandHandler<
  TOptions extends Record<string, any>,
  TGuards extends GuardFn<any, any>[],
> = (
  interaction: any,
  args: ExtractArgs<TOptions>,
  context: ContextFromGuards<TGuards>,
) => Promise<void>;

export interface SimpleCommand<
  TOptions extends Record<string, any> = any,
  TGuards extends GuardFn<any, any>[] = GuardFn<any, any>[],
  TName extends string = string,
  TDesc extends string = string,
> {
  type: "command";

  /**
   * The name of the command. Must be 1–32 characters and lowercase.
   */
  name: NotEmptyString<TName>;

  /**
   * A short description of what the command does. Maximum 100 characters.
   */
  description: NotEmptyString<TDesc>;

  /**
   * Optional input parameters for this command.
   */
  options?: TOptions;

  /**
   * Optional guard functions executed before the command handler.
   */
  guards?: TGuards;

  /**
   * The function that executes when the command is triggered.
   */
  handler: CommandHandler<TOptions, TGuards>;
}

/**
 * Represents a group of related subcommands, organized under a common prefix.
 */
export interface SubcommandGroup<
  TName extends string = string,
  TDesc extends string = string,
> {
  type: "group";

  /**
   * The name of the group. Must be 1–32 characters and lowercase.
   */
  name: NotEmptyString<TName>;

  /**
   * A short description of the group’s purpose. Maximum 100 characters.
   */
  description: NotEmptyString<TDesc>;

  /**
   * A list of subcommands or nested groups.
   */
  commands: CommandOrCommandGroup[];
}
/**
 * Creates a top-level slash command definition.
 *
 * Accepts an optional set of typed options and guard functions. The resulting command
 * is displayed in Discord and executed when invoked by users.
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
  TName extends string = string,
  TDesc extends string = string,
>(
  config: Omit<SimpleCommand<TOptions, TGuards, TName, TDesc>, "type">,
): SimpleCommand<TOptions, TGuards, TName, TDesc> => ({
  type: "command",
  ...config,
});
