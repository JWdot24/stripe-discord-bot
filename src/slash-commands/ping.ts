import { Client, Intents } from 'discord.js';
import { SlashCommandRunFunction } from "../handlers/commands";

export const commands = [
    {
        name: "ping",
        description: "Check the bot's latency"
    }
];

export const run: SlashCommandRunFunction = async (interaction) => {
    await interaction.reply(`🏓 Pong! My latency is currently \`${interaction.client.ws.ping}ms\`.`);
};

const client = new Client({
    intents: [Intents.FLAGS.GUILDS],  // Ensure you have the GUILDS intent
});

client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
});

client.login('YOUR_BOT_TOKEN');  // Login with your bot token