import { RESTEvents, type ClientEvents, type RestEvents } from "discord.js";
import type { EventHandler, SimpleEvent, Events } from "../event";

export type EventHandlerMap = Map<
  keyof ClientEvents | keyof RestEvents,
  {
    once: EventHandler<keyof ClientEvents | keyof RestEvents>[];
    on: EventHandler<keyof ClientEvents | keyof RestEvents>[];
  }
>;

export const isRestEvent = (
  event: keyof ClientEvents | keyof RestEvents,
): event is keyof RestEvents => {
  return Object.values(RESTEvents).some(
    (re) => re === (event as keyof RestEvents),
  );
};

export const createEventHandlerMap = (
  events: SimpleEvent<keyof Events>[],
): EventHandlerMap => {
  const map: EventHandlerMap = new Map();

  for (const { event, handler, once } of events) {
    if (isRestEvent(event)) {
      const record = map.get(event) || {
        once: [],
        on: [],
      };

      if (once) {
        record.once.push(handler);
      } else {
        record.on.push(handler);
      }

      map.set(event, record);
    } else {
      const record = map.get(event) || {
        once: [],
        on: [],
      };

      if (once) {
        record.once.push(handler);
      } else {
        record.on.push(handler);
      }

      map.set(event, record);
    }
  }

  return map;
};
