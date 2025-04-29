import type { Client, ClientEvents } from "discord.js";

export type EventHandler<TEvent extends keyof ClientEvents> = (
  client: Client,
  ...args: ClientEvents[TEvent]
) => Promise<void>;

/**
 * Defines a single Discord client event handler.
 *
 * Supports both `on` (repeat) and `once` (one-time) behaviors.
 *
 * @template TEvent - The name of the Discord.js event.
 */
export interface SimpleEvent<TEvent extends keyof ClientEvents> {
  /**
   * If true, the handler will be invoked only once.
   */
  once?: boolean;

  /**
   * The name of the Discord.js event to listen for.
   */
  event: TEvent;

  /**
   * The asynchronous handler function to run when the event is emitted.
   */
  handler: EventHandler<TEvent>;
}

/**
 * Creates a typed event listener for use with your bot configuration.
 *
 * @example
 * ```ts
 * const onReady = createEvent({
 *   event: "ready",
 *   handler: async (client) => {
 *     console.log(`Logged in as ${client.user.tag}`);
 *   },
 * });
 * ```
 *
 * @param config - The event definition, including the name and handler.
 * @returns A typed event object.
 */
export const createEvent = <TEvent extends keyof ClientEvents>(
  config: SimpleEvent<TEvent>,
): SimpleEvent<TEvent> => {
  return config;
};
