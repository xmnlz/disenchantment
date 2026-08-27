import type { RESTPostAPIChatInputApplicationCommandsJSONBody } from "discord.js";
import type { AnySimpleCommand } from "./command.js";

/**
 * Process-wide store for the command data built by `createBot`.
 *
 * It holds two views of the same commands: the flattened map that
 * `handleCommandInteraction` looks up at dispatch time, and the serialized
 * bodies that `initApplicationCommands` sends to Discord. Keeping them here is
 * what lets those two functions take only an interaction or a client.
 *
 * Being a singleton, a second `createBot` call replaces the first one's
 * commands rather than adding to them, so one process serves one bot.
 */
export class MetadataStorage {
  private static _instance: MetadataStorage;
  private _simpleCommandMap: Map<string, AnySimpleCommand> = new Map();
  private _commandJsonBodies: RESTPostAPIChatInputApplicationCommandsJSONBody[] =
    [];

  static get instance(): MetadataStorage {
    if (!MetadataStorage._instance) {
      MetadataStorage._instance = new MetadataStorage();
    }
    return MetadataStorage._instance;
  }

  get commandJsonBodies() {
    return this._commandJsonBodies;
  }

  get simpleCommandMap() {
    return this._simpleCommandMap;
  }

  setCommandJsonBodies(
    commands: RESTPostAPIChatInputApplicationCommandsJSONBody[],
  ) {
    this._commandJsonBodies = commands;
  }

  setSimpleCommandMap(map: Map<string, AnySimpleCommand>) {
    this._simpleCommandMap = map;
  }
}
