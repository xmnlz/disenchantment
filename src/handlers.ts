import {
  ApplicationCommandOptionType,
  type ChatInputCommandInteraction,
  type Client,
  type ClientEvents,
  type InteractionContextType,
} from "discord.js";
import { composeGuards } from "./guard.js";
import { MetadataStorage } from "./metadata-storage.js";
import type {
  AnyOption,
  ExtractArgs,
  OptionValue,
  ValidCommandOptions,
} from "./option.js";
import type { EventHanlderMap } from "./transformers/events.js";

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

export const bindClientEventHandlers = (
  client: Client,
  eventMap: EventHanlderMap,
): void => {
  for (const [eventName, { on, once }] of eventMap) {
    for (const handler of on) {
      client.on(
        eventName,
        async (...args: ClientEvents[typeof eventName]) =>
          await handler(client, ...args),
      );
    }

    for (const handler of once) {
      client.once(
        eventName,
        async (...args: ClientEvents[typeof eventName]) =>
          await handler(client, ...args),
      );
    }
  }
};
