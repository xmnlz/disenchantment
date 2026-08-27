import type { Client, ClientEvents, RestEvents } from "discord.js";

export type Events = ClientEvents & RestEvents;

export type EventHandler<TEvent extends keyof Events> = (
  client: Client,
  ...args: Events[TEvent]
) => Promise<void>;

/**
 * Defines a single Discord client event handler.
 *
 * Supports both `on` (repeat) and `once` (one-time) behaviors.
 *
 * @template TEvent - The name of the Discord.js event. (will be inherited from event name)
 */
export interface SimpleEvent<TEvent extends keyof Events> {
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
 * @example Client event:
 * ```ts
 * const onReady = createEvent({
 *   event: "ready",
 *   handler: async (client) => {
 *     console.log(`Logged in as ${client.user.tag}`);
 *   },
 * });
 * ```
 *
 * @example REST event:
 * ```ts
 * const onResponse = createEvent({
 *   event: "response",
 *   handler: async (_client, req, res) => {
 *     console.log(`${req.method} ${req.path} ${res.status}`);
 *   },
 * });
 * ```
 *
 * @param event - The name of the event to listen for.
 * @param handler - The asynchronous handler function to run when the event is emitted.
 * @param once - If true, the handler will be invoked only once.
 * @returns A typed event object.
 */
export const createEvent = <TEvent extends keyof Events>(
  config: SimpleEvent<TEvent>,
): SimpleEvent<TEvent> => {
  return config;
};
