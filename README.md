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

**Disenchantment** is a tiny, opinionated library that layers a functional, data-driven DSL on top of [discord.js v14](https://discord.js.org). It lets you declare your bot’s slash commands, subcommands, options, guards, and events purely with TypeScript objects—no decorators, no “magic,” no ceremony. Everything is composable, fully typed, and ready to register with a single call.

## ⚙️ Features

- **Object-based Slash Commands**  
  Define commands & nested subcommands with plain TypeScript objects.  
- **Type-Safe Options**  
  Leverage built-in helpers to declare option types, descriptions, defaults, and validations.  
- **Middleware-Style Guards**  
  Attach guard functions to commands for permissions, cooldowns, rate limits, or custom logic.  
- **Concise Event Maps**  
  Wire up any Discord.js event `ready`, `messageCreate`, `guildMemberAdd`, etc. in one place.  
- **Auto-Registration**  
  Serialize and deploy your slash commands to the Discord API with a single async call.  
- **One-Call Bootstrap**  
  Spin up your entire bot-client, commands, events, registration-in one `createBot({ … })` invocation.

## 🚧 Roadmap (Not Yet Implemented)

1. ⚙️ **Autocomplete**  
   We plan to add first-class support for Discord’s autocomplete right now you’ll need to handle it yourself.

2. 🔄 **Partial Command Updates**  
   Smartly patch only changed commands instead of full re-deploys.

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
import { GatewayIntentBits, ApplicationCommandOptionType } from "discord.js";
import {
  createBot,
  createCommand,
  createEvent,
  group,
  option,
  guards,
  handleCommandInteraction,
  initApplicationCommands,
  type GuardFn,
} from "disenchantment";

// Define a simple ping command with localization
const pingCommand = createCommand({
  name: "ping",
  description: "Replies with Pong!",
  nameLocalizations: {
    // Add localized names
    fr: "salut",
    de: "ping",
  },
  descriptionLocalizations: {
    // Add localized descriptions
    fr: "Répond avec Pong !",
    de: "Antwortet mit Pong!",
  },
  handler: async (interaction) => {
    await interaction.reply("Pong!");
  },
});

// Define a command with options, including localization for options
const addCommand = createCommand({
  name: "add",
  description: "Add two numbers",
  options: {
    x: option({
      name: "x",
      description: "First number",
      type: ApplicationCommandOptionType.Number,
      required: true,
      nameLocalizations: {
        // Localize option name
        fr: "premier-nombre",
        de: "erste-zahl",
      },
      descriptionLocalizations: {
        // Localize option description
        fr: "Le premier nombre",
        de: "Die erste Zahl",
      },
    }),
    y: option({
      name: "y",
      description: "Second number",
      type: ApplicationCommandOptionType.Number,
      required: true,
      nameLocalizations: {
        // Localize option name
        fr: "deuxieme-nombre",
        de: "zweite-zahl",
      },
      descriptionLocalizations: {
        // Localize option description
        fr: "Le deuxième nombre",
        de: "Die zweite Zahl",
      },
    }),
  },
  handler: async (interaction, { x, y }) => {
    await interaction.reply(`Result: ${x + y}`);
  },
});

// Define a guard function (e.g., for admin-only commands)
const adminOnlyGuard: GuardFn = (client, interaction, next, context) => {
  // Replace 'YOUR_ADMIN_USER_ID' with the actual admin user ID or implement proper permission checking
  if (interaction.user.id === "YOUR_ADMIN_USER_ID") {
    next(); // Proceed to the command handler
  } else {
    interaction.reply({
      content: "You don't have permission to use this command.",
      ephemeral: true,
    });
    // Do not call next() to halt the command execution
  }
};

// Define an admin-only command using the guard, with localization
const secretCommand = createCommand({
  name: "secret",
  description: "An admin-only secret command",
  nameLocalizations: {
    // Add localized names
    fr: "secret",
    de: "geheim",
  },
  descriptionLocalizations: {
    // Add localized descriptions
    fr: "Une commande secrète réservée aux administrateurs",
    de: "Ein nur für Administratoren zugänglicher Geheim-Befehl",
  },
  guards: guards(adminOnlyGuard), // Apply the guard
  handler: async (interaction) => {
    await interaction.reply("You've accessed the secret command!");
  },
});

// Group related commands, including localization for the group
const mathGroup = group("math", "Mathematical operations", [addCommand], {
  // Add localized names and descriptions for the group
  nameLocalizations: {
    fr: "maths",
    de: "mathematik",
  },
  descriptionLocalizations: {
    fr: "Opérations mathématiques",
    de: "Mathematische Operationen",
  },
});

// Define an event handler for interactions
const interactionCreateEvent = createEvent({
  event: "interactionCreate",
  handler: async (_client, interaction) => {
    if (!interaction.isChatInputCommand()) return; // Only handle chat input commands
    await handleCommandInteraction(interaction); // Process the command
  },
});

// Define an event handler for the bot being ready
const readyEvent = createEvent({
  event: "ready",
  handler: async (client) => {
    await client.guilds.fetch(); // Fetch guilds if needed

    // Initialize application commands - replace 'YOUR_GUILD_ID' with your guild ID for testing
    // For global commands, omit the guild ID array: await initApplicationCommands(client);
    await initApplicationCommands(client, ["YOUR_GUILD_ID"]);

    console.log(`Logged in as ${client.user?.tag}`);
  },
});

// Bootstrap the bot
(async () => {
  const client = await createBot({
    clientOptions: {
      intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages], // Specify required intents
    },
    commands: [pingCommand, mathGroup, secretCommand], // Include all your commands and groups
    events: [readyEvent, interactionCreateEvent], // Include all your event handlers
  });

  // Login to Discord - ensure BOT_TOKEN is set in your environment variables
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

