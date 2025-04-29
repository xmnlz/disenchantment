import type { Client, CommandInteraction } from "discord.js";

/**
 * A middleware‐style function that runs before your command handler.
 *
 * Guards let you enforce permissions, populate shared context, or abort execution
 * by omitting a call to `next()`. Each guard receives the client, the interaction,
 * a `next()` callback to hand off control, and a mutable `context` object.
 *
 * **Always bundle your guards with `guards(...)`** to preserve tuple typing and
 * ensure `ContextFromGuards<…>` correctly infers the combined context type.
 *
 * @template InteractionType
 *   The type of interaction you’re protecting (defaults to Discord’s `CommandInteraction`).
 * @template Ctx
 *   The shape of the context object that accumulates across your guard chain.
 *
 * @param client
 *   Your Discord.js `Client` instance.
 * @param interaction
 *   The incoming interaction (e.g. slash command invocation).
 * @param next
 *   Invoke to continue to the next guard, or to the final command handler if no guards remain.
 *   Calling `next()` more than once in the same guard will throw an error.
 * @param context
 *   A shared object that all guards—and ultimately your handler—can read from and write to.
 *
 * @returns
 *   `void` or `Promise<void>`. If a guard never calls `next()`, the chain stops and
 *   your handler is never invoked.
 *
 * @example
 * ```ts
 * // A guard that checks for admin permissions
 * const adminGuard: GuardFn = async (client, interaction, next) => {
 *   if (!interaction.memberPermissions?.has("Administrator")) {
 *     await interaction.reply("You must be an admin to run this command.");
 *     return; // halt chain
 *   }
 *   await next(); // proceed
 * };
 * ```
 */
export type GuardFn<
  InteractionType = CommandInteraction,
  Ctx extends Record<string, any> = Record<string, any>,
> = (
  client: Client,
  interaction: InteractionType,
  next: NextFn,
  context: Ctx,
) => Promise<void> | void;

export type NextFn = () => Promise<void>;

/**
 * Group one or more guard functions into a single array for your command definition.
 *
 * Guards are lightweight middleware that run before your command handler.
 * By wrapping them with `guards(...)`, you keep your typing simple and
 * can pass them directly into your `createCommand` call.
 *
 * @param guards
 *   One or more guard functions to execute in order. Each guard should call
 *   `await next()` when it wants to hand off control to the next guard
 *   (or ultimately your handler). If a guard never calls `next()`, the chain stops.
 *
 * @example
 * ```ts
 * import { createCommand, guards } from 'your-bot-lib';
 *
 * // A simple logging guard
 * const logGuard: GuardFn = async (client, interaction, next) => {
 *   console.log(`User ${interaction.user.tag} ran ${interaction.commandName}`);
 *   await next();
 * };
 *
 * // A permission check guard
 * const adminOnly: GuardFn = async (_, interaction, next) => {
 *   if (!interaction.memberPermissions?.has('Administrator')) {
 *     await interaction.reply('You need admin rights to use this.');
 *     return; // stop here
 *   }
 *   await next();
 * };
 *
 * // Bundle them together
 * const myGuards = guards(logGuard, adminOnly);
 *
 * // Use in your command
 * export const secret = createCommand({
 *   name: 'secret',
 *   description: 'An admin-only command with logging',
 *   guards: myGuards,
 *   handler: async (interaction) => {
 *     await interaction.reply('Shh… this is a secret.');
 *   },
 * });
 * ```
 */
export const guards = <TGuards extends GuardFn<any, any>[]>(
  ...guards: TGuards
): TGuards => guards;

export type ContextFromGuards<TGuards extends GuardFn<any, any>[]> =
  TGuards extends [
    GuardFn<any, infer FirstCtx>,
    ...infer Rest extends GuardFn<any, any>[],
  ]
    ? FirstCtx & ContextFromGuards<Rest>
    : // biome-ignore lint/complexity/noBannedTypes: for empty object to fallback
      {}; // Base case: No guards left, return an empty object type

export const composeGuards = <
  InteractionType,
  TGuards extends GuardFn<any, any>[],
>(
  guardList: TGuards,
): GuardFn<InteractionType, ContextFromGuards<TGuards>> => {
  return async (client, interaction, finalNext, context) => {
    let lastCalledIndex = -1;

    const dispatch = async (currentIndex: number): Promise<void> => {
      if (currentIndex <= lastCalledIndex) {
        // Report the guard index that called next() more than once:
        const guardIndex = currentIndex - 1;
        throw new Error(
          `next() called multiple times in guard at index ${guardIndex}`,
        );
      }

      lastCalledIndex = currentIndex;
      const guard = guardList[currentIndex];

      if (guard) {
        await guard(
          client,
          interaction,
          () => dispatch(currentIndex + 1),
          context,
        );
      } else {
        await finalNext();
      }
    };

    await dispatch(0);
  };
};
