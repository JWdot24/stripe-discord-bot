
import { SlashCommandRunFunction } from "../handlers/commands";

export const commands = [
    {
        name: "ping",
        description: "Check the bot's latency"
    }
];

export const run: SlashCommandRunFunction = async (interaction) => {
    await interaction.reply(`🏓 Pong! Latency is ${interaction.client.ws.ping}ms.`);
};
