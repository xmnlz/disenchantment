import {
  ApplicationCommandOptionType,
  type ChatInputCommandInteraction,
  type Client,
  type ClientEvents,
  type InteractionContextType,
  type RestEvents,
} from "discord.js";
import { isRestEvent } from "./event.js";
import { composeGuards } from "./guard.js";
import { MetadataStorage } from "./metadata-storage.js";
import type {
  AnyOption,
  ExtractArgs,
  OptionValue,
  ValidCommandOptions,
} from "./option.js";
import type { EventHandlerMap } from "./transformers/events.js";

const optionExtractors: Record<
  ValidCommandOptions,
  (
    interaction: ChatInputCommandInteraction,
    name: string,
    required: boolean,
  ) => unknown
> = {
  [ApplicationCommandOptionType.String]: (interaction, name, required) =>
    interaction.options.getString(name, required),
  [ApplicationCommandOptionType.Integer]: (interaction, name, required) =>
    interaction.options.getInteger(name, required),
  [ApplicationCommandOptionType.Number]: (interaction, name, required) =>
    interaction.options.getNumber(name, required),
  [ApplicationCommandOptionType.Boolean]: (interaction, name, required) =>
    interaction.options.getBoolean(name, required),
  [ApplicationCommandOptionType.User]: (interaction, name, required) =>
    interaction.options.getMember(name) ??
    interaction.options.getUser(name, required),
  [ApplicationCommandOptionType.Channel]: (interaction, name, required) =>
    interaction.options.getChannel(name, required),
  [ApplicationCommandOptionType.Role]: (interaction, name, required) =>
    interaction.options.getRole(name, required),
  [ApplicationCommandOptionType.Mentionable]: (interaction, name, required) =>
    interaction.options.getMentionable(name, required),
  [ApplicationCommandOptionType.Attachment]: (interaction, name, required) =>
    interaction.options.getAttachment(name, required),
};

/**
 * Reads every declared option off an interaction and returns them keyed by the
 * property names used in the command's `options` record, not by their Discord
 * option names.
 *
 * @param interaction - The interaction to read option values from.
 * @param options - The command's `options` record.
 * @returns The resolved arguments, typed from the option definitions.
 * @throws If an option declares a type with no known extractor.
 */
export const extractCommandOptions = <
  TOption extends Record<string, AnyOption>,
  TInteractionContext extends InteractionContextType[],
>(
  interaction: ChatInputCommandInteraction,
  options: TOption,
): ExtractArgs<TOption, TInteractionContext> => {
  const args: Record<string, unknown> = {};

  for (const [key, opt] of Object.entries(options)) {
    const extractor = (optionExtractors as any)[opt.type];

    if (!extractor) {
      throw new Error(`Unsupported option type: ${opt.type}`);
    }

    args[key] = extractor(interaction, opt.name, opt.required) as OptionValue<
      TOption[typeof key]["type"],
      TInteractionContext
    >;
  }

  return args as ExtractArgs<TOption, TInteractionContext>;
};

/**
 * Builds the lookup key for an interaction by joining its command, subcommand
 * group, and subcommand names with spaces — for example `"admin user ban"`.
 *
 * This mirrors how `flattenCommandTree` keys the command map, so the two must
 * stay in step.
 *
 * @param interaction - The interaction to derive a key from.
 * @returns The space-joined invocation path.
 */
export const buildCommandKey = (
  interaction: ChatInputCommandInteraction,
): string =>
  [
    interaction.commandName,
    interaction.options.getSubcommandGroup(false),
    interaction.options.getSubcommand(false),
  ]
    .filter(Boolean)
    .join(" ");

/**
 * Dispatches an incoming interaction to the command it names, running that
 * command's guards before its handler.
 *
 * Nothing calls this for you. `createBot` binds your events, but the step from
 * "an interaction arrived" to "the right handler runs" is yours to wire, which
 * keeps you free to filter, log, or short-circuit first:
 *
 * @example
 * ```ts
 * const interactions = createEvent({
 *   event: "interactionCreate",
 *   handler: async (_client, interaction) => {
 *     if (!interaction.isChatInputCommand()) return;
 *     await handleCommandInteraction(interaction);
 *   },
 * });
 * ```
 *
 * Interactions that match no registered command are ignored silently, so an
 * unresponsive command usually means it was never registered rather than that
 * dispatch failed.
 *
 * @param interaction - A chat input interaction to dispatch.
 */
export const handleCommandInteraction = async (
  interaction: ChatInputCommandInteraction,
): Promise<void> => {
  const commandKey = buildCommandKey(interaction);

  const command = MetadataStorage.instance.simpleCommandMap.get(commandKey);
  if (!command) return;

  const composedGuards = composeGuards(command.guards || []);

  const context: Record<string, unknown> = {};

  await composedGuards(
    interaction.client,
    interaction,
    async () => {
      const options = extractCommandOptions(interaction, command.options || {});
      await command.handler(interaction, options, context);
    },
    context,
  );
};

/**
 * Surfaces a rejected handler on the client's `error` event instead of letting
 * it become an opaque unhandled rejection. When nothing is listening for
 * `error`, discord.js rethrows, preserving the previous crash behaviour.
 *
 * `Promise.resolve` guards the untyped edge: handlers are declared async, but
 * plain JS consumers can still hand us a synchronous function.
 */
const settleHandler = (client: Client, result: Promise<void>): void => {
  void Promise.resolve(result).catch((error: unknown) => {
    client.emit(
      "error",
      error instanceof Error ? error : new Error(String(error)),
    );
  });
};

/**
 * Attaches every handler in the map to the emitter its event belongs to, using
 * `on` or `once` as declared.
 *
 * Called for you by `createBot`; you should not need it directly.
 *
 * @param client - The client to bind against.
 * @param eventMap - Handlers grouped by event name.
 */
export const bindEventHandlers = (
  client: Client,
  eventMap: EventHandlerMap,
): void => {
  for (const [eventName, { on, once }] of eventMap) {
    // The event name alone decides the emitter: REST events are emitted by
    // `client.rest`, gateway events by `client` itself. The branch also narrows
    // `eventName` so each emitter sees only the names it accepts.
    if (isRestEvent(eventName)) {
      for (const handler of on) {
        client.rest.on(eventName, (...args: RestEvents[typeof eventName]) =>
          settleHandler(client, handler(client, ...args)),
        );
      }

      for (const handler of once) {
        client.rest.once(eventName, (...args: RestEvents[typeof eventName]) =>
          settleHandler(client, handler(client, ...args)),
        );
      }
    } else {
      for (const handler of on) {
        client.on(eventName, (...args: ClientEvents[typeof eventName]) =>
          settleHandler(client, handler(client, ...args)),
        );
      }

      for (const handler of once) {
        client.once(eventName, (...args: ClientEvents[typeof eventName]) =>
          settleHandler(client, handler(client, ...args)),
        );
      }
    }
  }
};
