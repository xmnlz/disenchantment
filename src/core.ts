import { Client, type ClientOptions } from "discord.js";
import type { CommandOrCommandGroup } from "./command.js";
import type { SimpleEvent } from "./event.js";
import { bindEventHandlers } from "./handlers.js";
import { MetadataStorage } from "./metadata-storage.js";
import {
  flattenCommandTree,
  serializeCommandsForAPI,
} from "./transformers/commands.js";
import { createEventHandlerMap } from "./transformers/events.js";

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
   * Covers gateway events like `ready` and `messageCreate`, and REST events
   * like `response` and `rateLimited`, which are bound to `client.rest`.
   *
   * Typed as `SimpleEvent<any>[]` so that handlers for different events can sit
   * in one array. Each handler keeps the types `createEvent` gave it, so define
   * them with `createEvent` rather than as bare object literals.
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
 * Binding events is all this does for you at runtime. It does **not** route
 * interactions to your command handlers — for that, call
 * `handleCommandInteraction` from an `interactionCreate` event. Nor does it
 * register commands with Discord; see {@link initApplicationCommands}.
 *
 * @example
 * ```ts
 * const client = await createBot({
 *   clientOptions: { intents: [GatewayIntentBits.Guilds] },
 *   commands: [pingCommand],
 *   events: [readyEvent, interactionCreateEvent],
 * });
 *
 * await client.login(process.env.DISCORD_TOKEN);
 * ```
 *
 * @param options - The complete setup configuration for the bot.
 * @returns A Discord.js `Client` ready to be logged in.
 * @throws If two commands resolve to the same invocation path.
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

  bindEventHandlers(client, eventMap);

  MetadataStorage.instance.setSimpleCommandMap(commandMap);
  MetadataStorage.instance.setCommandJsonBodies(slashCommands);

  return client;
}

/**
 * Publishes your application's slash commands to Discord.
 *
 * Defining commands does not register them; this is the call that sends them.
 * Run it once the client is ready. Registering globally can take up to an hour
 * to propagate, so during development prefer a guild, where commands appear
 * immediately.
 *
 * Registration **replaces** the whole command list for the scope it targets, so
 * commands deleted from your code disappear from Discord on the next run.
 * Guild and global commands are separate lists: registering to a guild leaves
 * global commands in place, which is why a command can appear twice while you
 * are developing.
 *
 * @example
 * ```ts
 * // Global — available everywhere, may take up to an hour to propagate.
 * await initApplicationCommands(client);
 * ```
 *
 * @example
 * ```ts
 * // Guild-scoped — appears immediately. The guild must be cached first.
 * await client.guilds.fetch();
 * await initApplicationCommands(client, ["123456789012345678"]);
 * ```
 *
 * @param client - An initialized Discord.js client.
 * @param guildIds - Guild IDs to target. Resolved against `client.guilds.cache`,
 *   so fetch guilds first; IDs missing from the cache are logged and skipped.
 *   Note that registration stops at the first ID found in the cache, so this
 *   registers to a single guild rather than to all of them. Omit to register
 *   globally.
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
