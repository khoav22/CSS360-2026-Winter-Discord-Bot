import "dotenv/config";
import { Client, GatewayIntentBits, Partials, Collection } from "discord.js";
import path from "node:path";

import loadEvents from "./helpers/loadEvents.js";
import loadCommands from "./helpers/loadCommands.js";
import { initDb } from "./helpers/db.js";

const TOKEN = process.env.DISCORD_TOKEN || process.env.TOKEN;

const { Guilds, GuildMembers, GuildMessages, MessageContent, GuildVoiceStates } =
  GatewayIntentBits;
const { User, Message, GuildMember, ThreadMember } = Partials;

const client = new Client({
  intents: [
    Guilds,
    GuildMembers,
    GuildMessages,
    MessageContent,
    GuildVoiceStates,
  ],
  partials: [User, Message, GuildMember, ThreadMember],
});

client.events = new Collection();
client.commands = new Collection();

loadEvents(client, path.join(__dirname, "events"));
loadCommands(client, path.join(__dirname, "commands"));

// Connect to the shared MySQL database (and make sure its tables exist)
// before logging in, so scores/stats are ready as soon as the bot is up.
initDb()
  .then(() => client.login(TOKEN))
  .catch((err) => {
    console.error("[app] Failed to connect to the shared MySQL database:", err);
    process.exit(1);
  });
