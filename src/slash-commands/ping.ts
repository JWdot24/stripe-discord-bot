// bot.js
import { Client, Intents } from 'discord.js';

const client = new Client({
    intents: [Intents.FLAGS.GUILDS],  // Ensure you have the GUILDS intent
});

client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
});

client.on('interactionCreate', async (interaction) => {
    if (!interaction.isCommand()) return;

    const { commandName } = interaction;

    if (commandName === 'ping') {
        // Reply to the /ping command with the bot's latency
        await interaction.reply(`🏓 Pong! My latency is currently \`${client.ws.ping}ms\`.`);
    }
});

client.login('YOUR_BOT_TOKEN');  // Login with your bot token

