/**
 * Public entry point for `disenchantment`.
 *
 * A typical bot uses these in roughly this order:
 *
 * 1. `createCommand`, `option`, `group`, `guards` — declare what the bot does.
 * 2. `createEvent` — declare how it reacts, to gateway and REST events alike.
 * 3. `createBot` — build a configured discord.js `Client`.
 * 4. `handleCommandInteraction` — dispatch interactions from `interactionCreate`.
 * 5. `initApplicationCommands` — publish the commands to Discord.
 *
 * Every helper returns plain data, so definitions are inert until `createBot`
 * collects them. See the README for a full guide.
 *
 * @module
 */

export { createBot, initApplicationCommands } from "./core.js";

export { createCommand } from "./command.js";
export { createEvent } from "./event.js";

export { group } from "./group.js";
export { guards } from "./guard.js";
export type { GuardFn } from "./guard.js";

export { option } from "./option.js";

export { handleCommandInteraction } from "./handlers.js";
