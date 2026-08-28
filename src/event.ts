import type { Client, ClientEvents, RestEvents } from "discord.js";
import { RESTEvents } from "discord.js";

/**
 * Every event name a handler can be registered for: the gateway events emitted
 * by `Client`, plus the events emitted by `Client#rest`.
 */
export type DiscordEvents = ClientEvents & RestEvents;

/**
 * `DiscordEvents` is only sound while the two event maps have disjoint keys —
 * an overlapping name would make `DiscordEvents[K]` an intersection of two
 * argument tuples, and would make `isRestEvent` route a gateway event to the
 * REST emitter, where it would never fire.
 *
 * discord.js has moved names between the two before (`rateLimited` was a client
 * event in v13), so assert the invariant at compile time rather than
 * discovering it as a silently dead listener.
 */
type AssertNever<T extends never> = T;
export type NoEventNameOverlap = AssertNever<
  keyof ClientEvents & keyof RestEvents
>;

const REST_EVENT_NAMES: ReadonlySet<string> = new Set(
  Object.values(RESTEvents),
);

/**
 * Narrows an event name to the ones emitted by `Client#rest` rather than by
 * `Client` itself, so each handler can be bound to the right emitter.
 */
export const isRestEvent = (
  event: keyof DiscordEvents,
): event is keyof RestEvents => REST_EVENT_NAMES.has(event);

export type EventHandler<TEvent extends keyof DiscordEvents> = (
  client: Client,
  ...args: DiscordEvents[TEvent]
) => Promise<void>;

/**
 * Defines a single Discord event handler.
 *
 * Supports both `on` (repeat) and `once` (one-time) behaviors, for gateway
 * events emitted by `Client` and REST events emitted by `Client#rest`.
 *
 * @template TEvent - The name of the Discord.js event. (will be inherited from event name)
 */
export interface SimpleEvent<TEvent extends keyof DiscordEvents> {
  /**
   * If true, the handler will be invoked only once.
   */
  once?: boolean;

  /**
   * The name of the Discord.js event to listen for.
   *
   * Accepts both gateway event names (`"ready"`, `"messageCreate"`, …) and REST
   * event names (`"response"`, `"rateLimited"`, `"restDebug"`, …).
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
 * The event name alone decides which emitter the handler is bound to: REST
 * event names are wired to `client.rest`, everything else to `client`.
 *
 * @example Gateway event
 * ```ts
 * const onReady = createEvent({
 *   event: "ready",
 *   handler: async (client) => {
 *     console.log(`Logged in as ${client.user.tag}`);
 *   },
 * });
 * ```
 *
 * @example REST event
 * ```ts
 * const onResponse = createEvent({
 *   event: "response",
 *   handler: async (_client, request, response) => {
 *     console.log(`${request.method} ${request.path} ${response.status}`);
 *   },
 * });
 * ```
 *
 * @param config - The event definition, including the name and handler.
 * @returns A typed event object.
 */
export const createEvent = <TEvent extends keyof DiscordEvents>(
  config: SimpleEvent<TEvent>,
): SimpleEvent<TEvent> => {
  return config;
};
