import { Client, type ClientOptions } from "discord.js";
import type { CommandOrCommandGroup } from "./command.js";
import type { SimpleEvent } from "./event.js";
import { bindClientEventHandlers } from "./handlers.js";
import { MetadataStorage } from "./metadata-storage.js";
import {
  createEventHandlerMap,
  flattenCommandTree,
  serializeCommandsForAPI,
} from "./transformers.js";

/**
 * Configuration options for bootstrapping a Discord bot.
 */
export interface BotOptions {
  /**
   * A list of command definitions (including nested groups) that the bot will expose to users.
   *
   * These are typically created using `createCommand` or `group`.
   *
   * @example
   * ```ts
   * const pingCommand = createCommand({
   *   name: "ping",
   *   description: "Replies with Pong!",
   *   handler: async (interaction) => {
   *     await interaction.reply("Pong!");
   *   },
   * });
   *
   * const someGroup = group("healthcheck", "check if bot is running", [pingCommand]);
   * ```
   */
  commands: CommandOrCommandGroup[];

  /**
   * Event handlers to bind to the Discord client.
   *
   * Useful for reacting to bot lifecycle events like `ready`, `messageCreate`, etc.
   *
   * @example
   * ```ts
   * const readyEvent = createEvent({
   *   event: "ready",
   *   handler: async (client) => {
   *     console.log(`Bot logged in as ${client.user.tag}`);
   *   },
   * });
   * ```
   */
  events: SimpleEvent<any>[];

  /**
   * Standard options passed to the Discord.js `Client` constructor.
   *
   * Make sure to include the necessary intents.
   *
   * @see {@link https://discord.js.org/#/docs/discord.js/main/class/ClientOptions}
   */
  clientOptions: ClientOptions;
}

/**
 * Creates and configures a Discord.js client instance using your defined commands and event handlers.
 *
 * This function prepares the client for login but does not connect to Discord — call `client.login()` separately.
 *
 * @example
 * ```ts
 * const client = await createBot({
 *   clientOptions: { intents: [GatewayIntentBits.Guilds] },
 *   commands: [pingCommand],
 *   events: [readyEvent],
 * });
 *
 * await client.login(process.env.DISCORD_TOKEN);
 * ```
 *
 * @param options - The complete setup configuration for the bot.
 * @returns A Discord.js `Client` ready to be logged in.
 */
export async function createBot({
  clientOptions,
  commands,
  events,
}: BotOptions): Promise<Client> {
  const client = new Client(clientOptions);

  const commandMap = flattenCommandTree(commands);
  const slashCommands = serializeCommandsForAPI(commands);
  const eventMap = createEventHandlerMap(events);

  bindClientEventHandlers(client, eventMap);

  MetadataStorage.instance.setSimpleCommandMap(commandMap);
  MetadataStorage.instance.setCommandJsonBodies(slashCommands);

  return client;
}

/**
 * Registers your application's slash commands.
 *
 * Use this after the bot is fully configured and the client is ready.
 * You can register globally or to specific guilds for faster propagation during development.
 *
 * @example
 * ```ts
 * // Register globally (may take up to 1 hour to propagate)
 * await initApplicationCommands(client);
 *
 * // Register instantly to specific test guilds
 * await initApplicationCommands(client, ["123456789012345678"]);
 * ```
 *
 * @param client - An initialized Discord.js client.
 * @param guildIds - Optional array of guild IDs for targeted registration. If omitted, registers globally.
 */
export const initApplicationCommands = async (
  client: Client,
  guildIds?: string[],
) => {
  const restCommands = MetadataStorage.instance.commandJsonBodies;

  if (guildIds && guildIds.length > 0) {
    for (const guildId of guildIds) {
      const guild = client.guilds.cache.get(guildId);
      if (guild) {
        await guild.commands.set(restCommands);
        return;
      }
      console.log(
        `Guild with ID ${guildId} could not be found in the client cache.`,
      );
    }
  } else {
    await client.application?.commands.set(restCommands);
  }
};
