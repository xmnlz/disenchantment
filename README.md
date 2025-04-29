<div align="center">
  <h1><code>disenchantment</code></h1>
  <p>
    <strong>
      A small, simple, fully type-safe TypeScript library for defining and handling Discord slash commands and events, batteries included.
    </strong>
  </p>
</div>

## 📖 Introduction

**Disenchantment** is a tiny, opinionated library that layers a functional, data-driven DSL on top of [discord.js v14](https://discord.js.org). It lets you declare your bot’s slash commands, subcommands, options, guards, and events purely with TypeScript objects—no decorators, no “magic,” no ceremony. Everything is composable, fully typed, and ready to register with a single call.

## ⚙️ Features

- **Object-based Slash Commands**  
  Define commands & nested subcommands with plain TypeScript objects.  
- **Type-Safe Options**  
  Leverage built-in helpers to declare option types, descriptions, defaults, and validations.  
- **Middleware-Style Guards**  
  Attach guard functions to commands for permissions, cooldowns, rate limits, or custom logic.  
- **Concise Event Maps**  
  Wire up any Discord.js event—`ready`, `messageCreate`, `guildMemberAdd`, etc.—in one place.  
- **Auto-Registration**  
  Serialize and deploy your slash commands to the Discord API with a single async call.  
- **One-Call Bootstrap**  
  Spin up your entire bot—client, commands, events, registration—in one `createBot({ … })` invocation.

## 🚀 Installation

```bash
# npm
npm install disenchantment discord.js

# yarn
yarn add disenchantment discord.js

# pnpm
pnpm add disenchantment discord.js
```

_Discord.js v14 is a peer dependency._

## 🏁 Quick Start

```ts
import { Client, GatewayIntentBits } from "discord.js";
import {
  createBot,
  createCommand,
  createEvent,
  group,
  option,
  guards,
  handleCommandInteraction,
  type GuardFn
} from "disenchantment";

const ping = createCommand({
  name: "ping",
  description: "Replies with Pong!",
  handler: async (interaction) => {
    await interaction.reply("Pong!");
  },
});

const add = createCommand({
  name: "add",
  description: "Add two numbers",
  options: {
    x: option({ name: "x", description: "First number", type: ApplicationCommandOptionType.Number, required: true }),
    y: option({ name: "y", description: "Second number", type: ApplicationCommandOptionType.Number, required: true }),
  },
  handler: async (interaction, { x, y }) => {
    await interaction.reply(`Result: ${x + y}`);
  },
});

const adminOnly: GuardFn = (client, interaction, next, context) => {
  if (interaction.user.id === 'admin_id') next();
}

const secret = createCommand({
  name: "secret",
  description: "Admin-only command",
  guards: guards(adminOnly),
  handler: async (interaction) => {
    await interaction.reply("You’re an admin!");
  },
});

const mathGroup = group("math", "Math operations", [add]);

const interactionCreateEvent = createEvent({
  event: "interactionCreate",
  handler: async (client, interaction) => {
    if (!interaction.isChatInputCommand()) return;
    await handleCommandInteraction(interaction);
  },
});

const readyEvent = createEvent({
  event: "ready",
  handler: async (client) => {
    await client.guilds.fetch();

    await initApplicationCommands(client, ["1040400907545874434"]);

    console.log(`Logged in as ${client.user?.tag}`);
  },
});


(async () => {
  const client = await createBot({
    clientOptions: {
      intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
    },
    commands: [ping, mathGroup, secret],
    events: [readyEvent, interactionCreateEvent],
  });

  await client.login(process.env.BOT_TOKEN);
})();
```

## ✍️ Contributing

1. Fork the repo & create a feature branch.  
2. Write clear, focused commits—one logical change per commit.  
3. Open a pull request with a description of what you’ve changed and why.  
4. Ensure all existing tests pass and add tests for new features.

## 📜 License

Distributed under the **MIT** License. See [`LICENSE`](./LICENSE) for details.
