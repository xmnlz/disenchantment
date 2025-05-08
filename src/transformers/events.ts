import type { ClientEvents } from "discord.js";
import type { EventHandler, SimpleEvent } from "../event";

export type EventHanlderMap = Map<
  keyof ClientEvents,
  {
    once: EventHandler<keyof ClientEvents>[];
    on: EventHandler<keyof ClientEvents>[];
  }
>;

export const createEventHandlerMap = (
  events: SimpleEvent<keyof ClientEvents>[],
): EventHanlderMap => {
  const map: EventHanlderMap = new Map();

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
