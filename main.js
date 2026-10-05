require("dotenv").config();
const { Client, Collection, GatewayIntentBits, REST, Routes, ActivityType } = require("discord.js");
const fs = require("fs");
const path = require("path");
const { startFlightAutomation } = require("./src/flightAutomation");
const { handleControlPanelAction } = require("./src/flightControlPanel");

const token = process.env.DISCORD_BOT_TOKEN;
const clientId = process.env.DISCORD_CLIENT_ID;
const guildId = process.env.DISCORD_GUILD_ID;

if (!token || !clientId) {
  console.error("Missing DISCORD_BOT_TOKEN or DISCORD_CLIENT_ID in .env");
  process.exit(1);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ],
  presence: {
    activities: [{ name: "Ryanair Ops", type: ActivityType.Watching }]
  }
});

client.commands = new Collection();

const commandDir = path.join(__dirname, "commands");
const commandFiles = fs.readdirSync(commandDir).filter(file => file.endsWith(".js"));
const registeredCommands = [];

for (const file of commandFiles) {
  const command = require(path.join(commandDir, file));
  if (command && command.data && command.data.name) {
    client.commands.set(command.data.name, command);
    registeredCommands.push(command.data.toJSON());
  }
}

client.once("ready", async () => {
  console.log(`Logged in as ${client.user.tag}`);
  startFlightAutomation(client);

  const rest = new REST({ version: "10" }).setToken(token);

  try {
    if (guildId) {
      await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: registeredCommands });
      console.log(`Registered ${registeredCommands.length} guild commands.`);
    } else {
      await rest.put(Routes.applicationCommands(clientId), { body: registeredCommands });
      console.log(`Registered ${registeredCommands.length} global commands.`);
    }
  } catch (error) {
    console.error("Failed to register slash commands:", error);
  }
});

client.on("interactionCreate", async interaction => {
  if (interaction.isChatInputCommand()) {
    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    try {
      await command.execute(interaction);
    } catch (error) {
      console.error(error);
      const payload = { content: "Something went wrong while running that command.", ephemeral: true };
      if (interaction.deferred || interaction.replied) {
        await interaction.followUp(payload).catch(() => {});
      } else {
        await interaction.reply(payload).catch(() => {});
      }
    }
    return;
  }

  if (interaction.isButton()) {
    const handled = await handleControlPanelAction(interaction, client);
    if (handled) return;
  }
});

client.login(token);
