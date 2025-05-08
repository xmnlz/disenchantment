import type { LocalizationMap } from "discord.js";
import type { CommandOrCommandGroup } from "./command.js";
import type { NotEmptyString } from "./types.js";

/**
 * Represents a group of related subcommands, organized under a common prefix.
 */
export interface SubcommandGroup<
  TName extends string = string,
  TDesc extends string = string,
> {
  type: "group";

  /**
   * The name of the command. Must be 1–32 characters and lowercase.
   */
  name: NotEmptyString<TName>;

  /**
   * Optional localization settings for the subcommand group.
   *
   * Allows specifying localized versions of the group's name and description
   * using a `LocalizationMap`, where keys are locale codes (e.g., 'en-US', 'fr', 'ja')
   * and values follow Discord's formatting rules:
   *
   * - `nameLocalizations`: Lowercase strings between 1 and 32 characters.
   * - `descriptionLocalizations`: Strings up to 100 characters.
   */
  options?: {
    /**
     * Localized versions of the command name.
     *
     * Keys must be valid `Locale` identifiers (e.g., 'en-US', 'fr', 'ja').
     * Values must be lowercase strings between 1 and 32 characters.
     */
    nameLocalizations?: LocalizationMap;
    /**
     * Localized versions of the command description.
     *
     * Keys must be valid `Locale` identifiers (e.g., 'en-US', 'fr', 'ja').
     * Values must be strings up to 100 characters.
     */
    descriptionLocalizations?: LocalizationMap;
  };

  /**
   * A short description of what the command does. Maximum 100 characters.
   */
  description: NotEmptyString<TDesc>;

  /**
   * A list of subcommands or nested groups.
   */
  commands: CommandOrCommandGroup[];
}

/**
 * Creates a subcommand group to organize related commands.
 *
 * The group appears as a parent command in Discord, with each subcommand accessible under it.
 *
 * @example
 * ```ts
 * const userAdminGroup = group("user", "User management tools", [
 *   createCommand({ name: "ban", description: "Ban a user", handler: ... }),
 *   createCommand({ name: "kick", description: "Kick a user", handler: ... }),
 * ]);
 * ```
 *
 * @example
 * ```ts
 * const nestedsubCommandGroup = group("admin", "General admin commands", [userAdminGroup]);
 * ```
 *
 * @param name - Group name (1–32 characters, lowercase).
 * @param description - Group description (max 100 characters).
 * @param commands - Array of subcommands or nested groups.
 * @returns A subcommand group definition or group of subcommands.
 */
export const group = <
  TName extends string,
  TDesc extends string,
  TCommands extends CommandOrCommandGroup[],
>(
  name: NotEmptyString<TName>,
  description: NotEmptyString<TDesc>,
  commands: TCommands,
  options?: {
    nameLocalizations?: LocalizationMap;
    descriptionLocalizations?: LocalizationMap;
  },
): SubcommandGroup => ({
  type: "group",
  name,
  description,
  commands,
  options,
});
