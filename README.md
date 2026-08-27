<div align="center">
  <h1><code>disenchantment</code></h1>
  <p>
    <strong>
      A small, simple, fully type-safe TypeScript library for defining and handling Discord slash commands and events, batteries included.
    </strong>
  </p>
  <p>
    <em>Inspired by <a href="https://github.com/discordx-ts/discordx">discordx</a></em>
  </p>

  <p>
    <a href="https://github.com/xmnlz/disenchantment/actions/workflows/ci.yml">
      <img src="https://img.shields.io/github/actions/workflow/status/xmnlz/disenchantment/ci.yml?branch=main" alt="CI Status" />
    </a>
    <a href="./LICENSE">
      <img src="https://img.shields.io/github/license/xmnlz/disenchantment" alt="License" />
    </a>
    <a href="https://www.npmjs.com/package/disenchantment">
      <img src="https://img.shields.io/npm/v/disenchantment" alt="npm version" />
    </a>
    <a href="https://jsr.io/@disenchantment/disenchantment">
      <img src="https://jsr.io/badges/@disenchantment/disenchantment" alt="JSR" />
    </a>
    <a href="https://github.com/xmnlz/disenchantment/commits/main">
      <img src="https://img.shields.io/github/last-commit/xmnlz/disenchantment" alt="Last Commit" />
    </a>
  </p>
</div>

## 📖 Introduction

**Disenchantment** is a tiny, opinionated library that layers a functional, data-driven DSL on top of [discord.js v14](https://discord.js.org). It lets you declare your bot's slash commands, subcommands, options, guards, and events purely with TypeScript objects—no decorators, no "magic," no ceremony. Everything is composable, fully typed, and ready to register with a single call.

It is a thin layer, not a framework. You still create a real `Client`, you still call `client.login()`, and every discord.js API remains available to you.

## 📑 Table of Contents

- [Features](#️-features)
- [Installation](#-installation)
- [Quick Start](#-quick-start)
- [Guide](#-guide)
  - [Commands](#commands)
  - [Options](#options)
  - [Subcommands & Groups](#subcommands--groups)
  - [Guards](#guards)
  - [Events](#events)
  - [Registering Commands](#registering-commands)
- [Type Inference](#-type-inference)
- [API Reference](#-api-reference)
- [Gotchas](#-gotchas)
- [Roadmap](#-roadmap-not-yet-implemented)
- [Contributing](#️-contributing)
- [License](#-license)

## ⚙️ Features

- **Object-based Slash Commands**  
  Define commands & nested subcommands with plain TypeScript objects.  
- **Type-Safe Options**  
  Leverage built-in helpers to declare option types, descriptions, defaults, and validations.  
- **Middleware-Style Guards**  
  Attach guard functions to commands for permissions, cooldowns, rate limits, or custom logic.  
- **Concise Event Maps**  
  Wire up any Discord.js gateway event `ready`, `messageCreate`, `guildMemberAdd`, or REST event `response`, `rateLimited`, etc. in one place.  
- **Auto-Registration**  
  Serialize and deploy your slash commands to the Discord API with a single async call.  
- **One-Call Bootstrap**  
  Spin up your entire bot-client, commands, events, registration-in one `createBot({ … })` invocation.

## 🚀 Installation

```bash
# npm
npm install disenchantment discord.js

# yarn
yarn add disenchantment discord.js

# pnpm
pnpm add disenchantment discord.js
```

_Discord.js v14 is a peer dependency and must be installed alongside the library._

Requires Node.js 18 or newer. The package ships both ESM and CommonJS builds.

## 🏁 Quick Start

```ts
import { GatewayIntentBits, type ChatInputCommandInteraction } from "discord.js";
import {
  createBot,
  createCommand,
  createEvent,
  handleCommandInteraction,
  initApplicationCommands,
} from "disenchantment";

const ping = createCommand({
  name: "ping",
  description: "Replies with Pong!",
  handler: async (interaction: ChatInputCommandInteraction) => {
    await interaction.reply("Pong!");
  },
});

const ready = createEvent({
  event: "ready",
  handler: async (client) => {
    await initApplicationCommands(client);
    console.log(`Logged in as ${client.user?.tag}`);
  },
});

// Nothing routes interactions to your handlers automatically.
// This event is what connects the two — see "Gotchas" below.
const interactions = createEvent({
  event: "interactionCreate",
  handler: async (_client, interaction) => {
    if (!interaction.isChatInputCommand()) return;
    await handleCommandInteraction(interaction);
  },
});

const client = await createBot({
  clientOptions: { intents: [GatewayIntentBits.Guilds] },
  commands: [ping],
  events: [ready, interactions],
});

await client.login(process.env.BOT_TOKEN);
```

`createBot` builds and configures the client but does **not** connect. You call `client.login()` yourself, which keeps the token and connection lifecycle in your hands.

## 📚 Guide

### Commands

`createCommand` returns a plain object describing one slash command. Nothing is registered or executed at definition time.

```ts
const echo = createCommand({
  name: "echo",
  description: "Repeats your message",
  handler: async (interaction: ChatInputCommandInteraction) => {
    await interaction.reply("Hello!");
  },
});
```

| Field | Required | Description |
| --- | --- | --- |
| `name` | ✅ | 1–32 characters, lowercase. |
| `description` | ✅ | Up to 100 characters. |
| `handler` | ✅ | `async (interaction, args, context) => void`. |
| `options` | | Record of `option()` definitions. See [Options](#options). |
| `guards` | | Result of `guards(...)`. See [Guards](#guards). |
| `context` | | `InteractionContextType[]`. See [Type Inference](#-type-inference). |
| `nameLocalizations` | | `LocalizationMap` of translated names. |
| `descriptionLocalizations` | | `LocalizationMap` of translated descriptions. |

Empty names and descriptions are rejected at compile time, not at runtime:

```ts
createCommand({ name: "", description: "…", handler });
//              ^ Type '""' is not assignable to type '"Error: String cannot be empty"'
```

#### Typing the interaction

The `interaction` parameter is intentionally `any`, so you annotate it with whichever discord.js interaction type you expect. Without an annotation you get no autocomplete on it:

```ts
handler: async (interaction: ChatInputCommandInteraction) => { … }
```

The second (`args`) and third (`context`) parameters *are* fully inferred from your `options` and `guards` — you should not annotate those.

#### Localization

```ts
const ping = createCommand({
  name: "ping",
  description: "Replies with Pong!",
  nameLocalizations: { fr: "salut", de: "ping" },
  descriptionLocalizations: {
    fr: "Répond avec Pong !",
    de: "Antwortet mit Pong!",
  },
  handler: async (interaction: ChatInputCommandInteraction) => {
    await interaction.reply("Pong!");
  },
});
```

Localized names follow the same rules as `name` (lowercase, 1–32 characters); localized descriptions are capped at 100 characters. Discord enforces both.

### Options

`option()` declares one input parameter. Options are passed as a **record**, and the record's keys become the property names on the handler's `args` object — they do not have to match `name`, though keeping them aligned is clearer.

```ts
import { ApplicationCommandOptionType } from "discord.js";

const add = createCommand({
  name: "add",
  description: "Add two numbers",
  options: {
    x: option({
      name: "x",
      description: "First number",
      type: ApplicationCommandOptionType.Number,
      required: true,
    }),
    y: option({
      name: "y",
      description: "Second number",
      type: ApplicationCommandOptionType.Number,
      required: true,
    }),
  },
  handler: async (interaction: ChatInputCommandInteraction, { x, y }) => {
    await interaction.reply(`Result: ${x + y}`);
  },
});
```

`required` is **mandatory** — there is no default. This is deliberate: the flag drives whether the argument is typed as `T` or `T | undefined`, so leaving it implicit would silently weaken inference.

```ts
options: {
  name: option({ …, required: true }),   // args.name: string
  note: option({ …, required: false }),  // args.note: string | undefined
}
```

#### Option types

| `ApplicationCommandOptionType` | `args` type | With `context: [Guild]` |
| --- | --- | --- |
| `String` | `string` | `string` |
| `Integer` | `number` | `number` |
| `Number` | `number` | `number` |
| `Boolean` | `boolean` | `boolean` |
| `User` | `User \| GuildMember` | `GuildMember` |
| `Role` | `Role` | `Role` |
| `Mentionable` | `User \| Role` | `User \| Role \| GuildMember` |
| `Channel` | `Channel \| TextChannel \| VoiceChannel` | unchanged |
| `Attachment` | `unknown` — see [Gotchas](#-gotchas) | `unknown` |

`Subcommand` and `SubcommandGroup` are not valid option types; use [`group()`](#subcommands--groups) instead. The type system rejects them.

#### Type-specific constraints (`extra`)

The `extra` object is typed per option type — fields that do not apply to the chosen type are a compile error.

| Option type | Available `extra` fields |
| --- | --- |
| `String` | `minLength`, `maxLength`, `choices`, `autocomplete` |
| `Integer`, `Number` | `minValue`, `maxValue`, `choices`, `autocomplete` |
| `Channel` | `channelTypes` |
| all others | none |

```ts
const message = option({
  name: "message",
  description: "Text to echo",
  type: ApplicationCommandOptionType.String,
  required: true,
  extra: {
    minLength: 1,
    maxLength: 200,
    choices: [
      { name: "Greeting", value: "hello" },
      { name: "Farewell", value: "goodbye" },
    ],
  },
});
```

Choices accept `nameLocalizations` for translating the label shown in the Discord client while keeping `value` stable.

> **Note:** `autocomplete` sets the flag on the registered command, but the library does not yet dispatch autocomplete interactions for you — see [Roadmap](#-roadmap-not-yet-implemented).

### Subcommands & Groups

`group()` nests commands under a shared parent.

```ts
const math = group("math", "Mathematical operations", [add, subtract], {
  nameLocalizations: { fr: "maths", de: "mathematik" },
  descriptionLocalizations: {
    fr: "Opérations mathématiques",
    de: "Mathematische Operationen",
  },
});
// Invoked as: /math add
```

Groups may be nested one level further, matching Discord's own limit of two levels of nesting:

```ts
const admin = group("admin", "Administration", [
  group("user", "User management", [ban, kick]),
]);
// Invoked as: /admin user ban
```

Note that `group()` takes localizations as a fourth positional `options` argument, unlike `createCommand`, which takes them as top-level fields.

Command paths must be unique. Two commands resolving to the same invocation path throw at `createBot` time rather than failing silently at runtime:

```
Error: Duplicate command definition detected: math add
```

### Guards

Guards are middleware that run before a handler. Each receives the client, the interaction, a `next()` callback, and a mutable `context` object shared across the whole chain.

```ts
import { guards, type GuardFn } from "disenchantment";

const logGuard: GuardFn = async (_client, interaction, next) => {
  console.log(`${interaction.user.tag} ran ${interaction.commandName}`);
  await next();
};

const adminOnly: GuardFn = async (_client, interaction, next) => {
  if (!interaction.memberPermissions?.has("Administrator")) {
    await interaction.reply({ content: "Access denied.", ephemeral: true });
    return; // no next() — the chain stops and the handler never runs
  }
  await next();
};

const secret = createCommand({
  name: "secret",
  description: "An admin-only command",
  guards: guards(logGuard, adminOnly),
  handler: async (interaction: ChatInputCommandInteraction) => {
    await interaction.reply("You've accessed the secret command!");
  },
});
```

Guards run in the order listed. Because `await next()` returns after everything downstream completes, you can wrap the rest of the chain — useful for timing, cleanup, or error handling:

```ts
const timing: GuardFn = async (_client, _interaction, next) => {
  const started = Date.now();
  await next();
  console.log(`took ${Date.now() - started}ms`);
};
```

**Always wrap guards with `guards(...)`.** It preserves the tuple type, which is what lets the context type be inferred. A plain array widens to `GuardFn[]` and you lose the inferred context.

#### Sharing typed context

Type a guard's context parameter and it flows into the handler. Multiple guards' contexts are intersected:

```ts
const withUser: GuardFn<ChatInputCommandInteraction, { userId: string }> =
  async (_client, interaction, next, context) => {
    context.userId = interaction.user.id;
    await next();
  };

const withLocale: GuardFn<ChatInputCommandInteraction, { locale: string }> =
  async (_client, interaction, next, context) => {
    context.locale = interaction.locale;
    await next();
  };

const whoami = createCommand({
  name: "whoami",
  description: "Shows your resolved context",
  guards: guards(withUser, withLocale),
  handler: async (interaction: ChatInputCommandInteraction, _args, context) => {
    // context: { userId: string } & { locale: string }
    await interaction.reply(`${context.userId} (${context.locale})`);
  },
});
```

Calling `next()` twice inside one guard is a bug, and the library says so rather than double-running the chain:

```
Error: next() called multiple times in guard at index 0
```

### Events

`createEvent` registers a handler for a discord.js event. Handlers always receive the `client` first, followed by that event's own arguments.

```ts
const ready = createEvent({
  event: "ready",
  handler: async (client) => {
    console.log(`Logged in as ${client.user?.tag}`);
  },
});
```

Set `once: true` to run a handler a single time:

```ts
const firstMessage = createEvent({
  event: "messageCreate",
  once: true,
  handler: async (_client, message) => {
    console.log(`First message seen: ${message.content}`);
  },
});
```

Registering several handlers for the same event is fine — they all run, in definition order.

#### REST events

Events emitted by `client.rest` work exactly the same way. The event name alone decides which emitter the handler is bound to, so there is no extra field to set:

```ts
const onResponse = createEvent({
  event: "response",
  handler: async (_client, request, response) => {
    console.log(`${request.method} ${request.path} ${response.status}`);
  },
});

const onRateLimit = createEvent({
  event: "rateLimited",
  handler: async (_client, info) => {
    console.warn(`Rate limited on ${info.route} for ${info.timeToReset}ms`);
  },
});
```

Available REST events: `response`, `rateLimited`, `restDebug`, `invalidRequestWarning`, `handlerSweep`, `hashSweep`. Their argument types are inferred just like gateway events.

#### Error handling

If a handler's promise rejects, the error is emitted on the client's `error` event rather than surfacing as an unhandled rejection:

```ts
const onError = createEvent({
  event: "error",
  handler: async (_client, error) => {
    console.error("Handler failed:", error);
  },
});
```

If nothing is listening for `error`, discord.js rethrows and the process fails as it otherwise would — so adding a listener can only ever give you more information, never less.

### Registering Commands

Defining commands does not publish them. `initApplicationCommands` pushes the serialized command list to Discord, and is normally called once the client is ready.

```ts
const ready = createEvent({
  event: "ready",
  handler: async (client) => {
    // Global — available everywhere, but can take up to an hour to propagate.
    await initApplicationCommands(client);
  },
});
```

For development, register to a single guild instead; guild commands appear immediately.

```ts
const ready = createEvent({
  event: "ready",
  handler: async (client) => {
    await client.guilds.fetch(); // populate the cache first
    await initApplicationCommands(client, ["YOUR_GUILD_ID"]);
  },
});
```

Guild lookup reads `client.guilds.cache`, so the guild must be cached — hence the `client.guilds.fetch()` call. An uncached ID is reported on the console and skipped.

> **Note:** registration replaces the full command list for the chosen scope. Commands you remove from your code disappear from Discord on the next run.

## 🔍 Type Inference

Setting `context` on a command both restricts where Discord offers it *and* sharpens the types of resolved options.

```ts
import { InteractionContextType } from "discord.js";

const kick = createCommand({
  name: "kick",
  description: "Kick a member",
  context: [InteractionContextType.Guild],
  options: {
    target: option({
      name: "target",
      description: "Member to kick",
      type: ApplicationCommandOptionType.User,
      required: true,
    }),
  },
  handler: async (interaction: ChatInputCommandInteraction, { target }) => {
    // target: GuildMember — not User | GuildMember
    await target.kick();
  },
});
```

Without `context`, a `User` option is typed `User | GuildMember`, because outside a guild there is no member to resolve. Adding `InteractionContextType.Guild` narrows it to `GuildMember`, and widens `Mentionable` to include `GuildMember`.

Inference works whether or not you set `context`; the flag only unlocks the narrower guild-aware types. See the [option type table](#option-types) for the full mapping.

## 📦 API Reference

| Export | Kind | Purpose |
| --- | --- | --- |
| `createBot(options)` | `async` function | Builds a configured `Client`. Does not log in. |
| `initApplicationCommands(client, guildIds?)` | `async` function | Publishes commands globally or to a guild. |
| `createCommand(config)` | function | Defines a slash command. |
| `group(name, description, commands, options?)` | function | Nests commands under a parent. |
| `option(config)` | function | Defines a typed command option. |
| `guards(...fns)` | function | Bundles guards, preserving tuple typing. |
| `createEvent(config)` | function | Defines a gateway or REST event handler. |
| `handleCommandInteraction(interaction)` | `async` function | Dispatches an interaction to its command. |
| `GuardFn<Interaction, Ctx>` | type | Signature for a guard function. |

`createBot` accepts `{ commands, events, clientOptions }`, where `clientOptions` is passed straight to the discord.js `Client` constructor.

## ⚠️ Gotchas

**Interactions are not routed for you.** `createBot` binds your events, but nothing connects an incoming interaction to a command handler until you call `handleCommandInteraction` from an `interactionCreate` event. Omitting it is the most common reason commands register but never respond.

**`Attachment` options are typed `unknown`.** Every other option type resolves to a concrete discord.js type, but `Attachment` is currently missing from the internal type map. The value is still delivered correctly at runtime — you just need to narrow it yourself:

```ts
handler: async (interaction: ChatInputCommandInteraction, { file }) => {
  const attachment = file as Attachment;
  await interaction.reply(attachment.url);
}
```

**`initApplicationCommands` registers to one guild.** When you pass multiple guild IDs, only the first one found in the cache receives the commands. Call it once per guild if you need several.

**Zero is ignored in `extra` bounds.** `minLength`, `maxLength`, `minValue`, and `maxValue` are applied with a truthiness check, so a value of `0` is silently dropped. Use `1` where you can, or omit the bound.

**Guild commands and global commands are separate lists.** Registering to a guild does not clear global commands, so a command can appear twice during development. Register to one scope at a time.

## 🚧 Roadmap (Not Yet Implemented)

1. ⚙️ **Autocomplete**  
   We plan to add first-class support for Discord’s autocomplete right now you’ll need to handle it yourself.

2. 🔄 **Partial Command Updates**  
   Smartly patch only changed commands instead of full re-deploys.

## ✍️ Contributing

1. Fork the repo & create a feature branch.  
2. Write clear, focused commits—one logical change per commit.  
3. Open a pull request with a description of what you’ve changed and why.  
4. Ensure all existing tests pass and add tests for new features.

Before opening a pull request:

```bash
bun install
bun lint    # biome check + tsc --noEmit
bun test
bun bundle
```

## 📜 License

Distributed under the **MIT** License. See [`LICENSE`](./LICENSE) for details.

