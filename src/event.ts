import type { Client, ClientEvents, RestEvents } from "discord.js";
import type { Emitter } from "./types";

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
  /**
   * The emitter to listen on. Defaults to `"client"`.
   * Use `"rest"` for REST events such as `response`, `rateLimited`, etc.
   */
  emitter?: Emitter;
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
export const createEvent = <TEvent extends keyof Events>(
  config: SimpleEvent<TEvent>,
): SimpleEvent<TEvent> => {
  return config;
};
