import type { DiscordEvents, EventHandler, SimpleEvent } from "../event.js";

export type EventHandlerMap = Map<
  keyof DiscordEvents,
  {
    once: EventHandler<keyof DiscordEvents>[];
    on: EventHandler<keyof DiscordEvents>[];
  }
>;

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
