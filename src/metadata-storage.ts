import type { RESTPostAPIChatInputApplicationCommandsJSONBody } from "discord.js";
import type { AnySimpleCommand } from "./command.js";

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
