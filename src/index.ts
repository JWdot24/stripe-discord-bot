import './sentry';

import { initialize as initializeDatabase } from './database';
import { loadContextMenus, loadMessageCommands, loadSlashCommands, synchronizeSlashCommands } from './handlers/commands';
import { syncSheets } from './integrations/sheets';

import { Client, GatewayIntentBits, PermissionsBitField, Partials, Options } from 'discord.js';
import { errorEmbed } from './util';
import { loadTasks } from './handlers/tasks';

export const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent
  ],
  partials: [Partials.GuildMember],
  makeCache: Options.cacheWithLimits({
    // Cache every member so we can count them accurately
    GuildMemberManager: Infinity
  })
});

const { slashCommands, slashCommandsData } = loadSlashCommands(client);
const { contextMenus, contextMenusData } = loadContextMenus(client);
const messageCommands = loadMessageCommands(client);
const tasks = loadTasks(client);

synchronizeSlashCommands(client, [...slashCommandsData, ...contextMenusData], {
  debug: true,
  guildId: process.env.GUILD_ID
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isCommand()) return;

  const run = interaction.isContextMenuCommand()
    ? contextMenus.get(interaction.commandName)
    : slashCommands.get(interaction.commandName);

  if (!run) return;
  run(interaction, interaction.commandName);
});

client.on('messageCreate', (message) => {
  if (message.author.bot) return;
  if (!process.env.COMMAND_PREFIX) return;

  if (
    [process.env.STATUS_CHANNEL_ID, process.env.SUBSCRIBE_CHANNEL_ID, process.env.CANCEL_CHANNEL_ID].includes(message.channelId) &&
    !message.member?.permissions.has(PermissionsBitField.Flags.ManageMessages)
  ) {
    return void message.delete();
  }

  const args = message.content.slice(process.env.COMMAND_PREFIX.length).split(/ +/);
  const commandName = args.shift();
  if (!commandName) return;

  const run = messageCommands.get(commandName);
  if (!run) return;
  run(message, commandName);
});

client.on('ready', async () => {
  // 1) Fetch all members so memberCount is correct
  for (const guild of client.guilds.cache.values()) {
    try {
      await guild.members.fetch();
    } catch (err) {
      console.warn(`⚠️ Could not fetch members for guild ${guild.name}:`, err);
    }
  }

  // 2) Sum up each guild’s memberCount
  const totalUsers = client.guilds.cache.reduce((sum, g) => sum + g.memberCount, 0);

  console.log(
    `✅ Logged in as ${client.user!.tag}. ` +
    `Ready to serve ${totalUsers} users in ${client.guilds.cache.size} servers 🚀`
  );

  // Database init: pick up DATABASE_URL (Railway), DB_URL or DB_NAME
  if (process.env.DATABASE_URL || process.env.DB_URL || process.env.DB_NAME) {
    initializeDatabase().then(() => {
      console.log('📦 Database initialized');
      if (process.argv.includes('--sync')) {
        tasks.tasks.first()?.run();
      }
    });
  } else {
    console.log('⚠️ Database not initialized, as no keys were specified 📦');
  }

  // Sheets sync
  if (process.env.SPREADSHEET_ID) {
    syncSheets();
  }
});

client.login(process.env.DISCORD_CLIENT_TOKEN);
