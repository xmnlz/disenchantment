import type { SimpleCommand, SubcommandGroup } from "./command.js";
import type { NotEmptyString } from "./types.js";

export const group = <N extends string, D extends string>(
  name: NotEmptyString<N>,
  description: NotEmptyString<D>,
  commands: (SubcommandGroup | SimpleCommand<any>)[],
): SubcommandGroup => ({
  type: "group",
  name,
  description,
  commands,
});
