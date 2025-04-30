import type { CommandOrCommandGroup, SubcommandGroup } from "./command.js";
import type { NotEmptyString } from "./types.js";

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
): SubcommandGroup => ({
  type: "group",
  name,
  description,
  commands,
});
