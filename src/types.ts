/**
 * Rejects the empty string at compile time.
 *
 * Discord requires every command, group, and option to carry a non-empty name
 * and description. Resolving to a message rather than to `never` means the
 * error TypeScript prints says what is wrong:
 *
 * ```ts
 * createCommand({ name: "", description: "…", handler });
 * //              ^ Type '""' is not assignable to type
 * //                '"Error: String cannot be empty"'
 * ```
 *
 * Only literal empty strings are caught. A `string` of unknown value passes,
 * since it may well be non-empty; Discord rejects it at registration time.
 */
export type NotEmptyString<T extends string> = T extends ""
  ? "Error: String cannot be empty"
  : T;
