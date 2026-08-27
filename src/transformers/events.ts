import type { DiscordEvents, EventHandler, SimpleEvent } from "../event.js";

/**
 * Handlers for one event, split by whether they were declared `once`.
 *
 * Keyed by event name across both emitters; `isRestEvent` decides which one a
 * given key belongs to at bind time.
 */
export type EventHandlerMap = Map<
  keyof DiscordEvents,
  {
    once: EventHandler<keyof DiscordEvents>[];
    on: EventHandler<keyof DiscordEvents>[];
  }
>;

/**
 * Groups event definitions by name so each event is bound once per emitter.
 *
 * Several handlers may share an event name; they are kept in definition order
 * and all run.
 *
 * @param events - Event definitions, typically from `createEvent`.
 * @returns Handlers grouped by event name.
 */
export const createEventHandlerMap = (
  events: SimpleEvent<keyof DiscordEvents>[],
): EventHandlerMap => {
  const map: EventHandlerMap = new Map();

  for (const { event, handler, once } of events) {
    const record = map.get(event) || { once: [], on: [] };

    if (once) {
      record.once.push(handler);
    } else {
      record.on.push(handler);
    }

    map.set(event, record);
  }

  return map;
};
