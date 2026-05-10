import type { ClientEvents, RestEvents } from "discord.js";
import type { EventHandler, SimpleEvent, Events } from "../event";

export type ClientEventHandlerMap = Map<
  keyof ClientEvents,
  {
    once: EventHandler<keyof ClientEvents>[];
    on: EventHandler<keyof ClientEvents>[];
  }
>;

export type RestEventHandlerMap = Map<
  keyof RestEvents,
  {
    once: EventHandler<keyof RestEvents>[];
    on: EventHandler<keyof RestEvents>[];
  }
>;

export type EventHandlerMap = {
  client: ClientEventHandlerMap;
  rest: RestEventHandlerMap;
};

export const createEventHandlerMap = (
  events: SimpleEvent<keyof Events>[],
): EventHandlerMap => {
  const client: ClientEventHandlerMap = new Map();
  const rest: RestEventHandlerMap = new Map();

  for (const { event, handler, once, emitter } of events) {
    if (emitter === "rest") {
      const record = rest.get(event as keyof RestEvents) || {
        once: [],
        on: [],
      };

      if (once) {
        record.once.push(handler);
      } else {
        record.on.push(handler);
      }

      rest.set(event as keyof RestEvents, record);
    } else {
      const record = client.get(event as keyof ClientEvents) || {
        once: [],
        on: [],
      };

      if (once) {
        record.once.push(handler);
      } else {
        record.on.push(handler);
      }

      client.set(event as keyof ClientEvents, record);
    }
  }

  return { client, rest };
};
