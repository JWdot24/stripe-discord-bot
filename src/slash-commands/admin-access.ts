import { SlashCommandRunFunction } from "../handlers/commands";
import fetch from 'node-fetch';
import { errorEmbed, successEmbed } from "../util";
import { DiscordCustomer, Postgres } from "../database";
import { ApplicationCommandOptionType, CommandInteractionOptionResolver, GuildMember, PermissionsBitField } from "discord.js";
import { findActiveSubscriptions, findSubscriptionsFromCustomerId, getCustomerPayments, getLifetimePaymentDate, resolveCustomerIdFromEmail } from "../integrations/stripe";

export const commands = [
    {
        name: "admin-access",
        description: "Give admin access to a user",
        options: [
            {
                name: "enable",
                description: "Enable access for the user",
                type: ApplicationCommandOptionType.Subcommand,
                options: [
                    {
                        name: "user",
                        description: "The user you want to give access to",
                        type: ApplicationCommandOptionType.User,
                        required: true
                    }
                ]
            },
            {
                name: "disable",
                description: "Disable access for the user",
                type: ApplicationCommandOptionType.Subcommand,
                options: [
                    {
                        name: "user",
                        description: "The user you want to remove access from",
                        type: ApplicationCommandOptionType.User,
                        required: true
                    }
                ]
            }
        ]
    }
];

export const run: SlashCommandRunFunction = async (interaction) => {

    try {
        // Defer the reply early to avoid timeout
        await interaction.deferReply();

        // Check if the user has the necessary permissions
        if (!interaction.memberPermissions?.has(PermissionsBitField.Flags.Administrator)) {
            return void interaction.followUp(errorEmbed("This command needs privileged access and can only be used by administrators."));
        }

        const subCommand = (interaction.options as CommandInteractionOptionResolver).getSubcommand()!;
        const user = (interaction.options as CommandInteractionOptionResolver).getUser("user")!;

        // Check the user in the database
        const userCustomer = await Postgres.getRepository(DiscordCustomer).findOne({
            where: {
                discordUserId: user.id
            }
        });

        // Update or insert user info in the database
        if (userCustomer) {
            await Postgres.getRepository(DiscordCustomer).update(userCustomer.id, {
                adminAccessEnabled: subCommand === "enable"
            });
        } else {
            await Postgres.getRepository(DiscordCustomer).insert({
                discordUserId: user.id,
                adminAccessEnabled: subCommand === "enable"
            });
        }

        const member = interaction.guild?.members.cache.get(user.id);

        // Add or remove admin role based on the subcommand
        if (subCommand === "enable") {
            if (member) await member.roles.add(process.env.ADMIN_ROLE_ID!);
        } else {
            if (member) await member.roles.remove(process.env.ADMIN_ROLE_ID!);
        }

        // Send success message
        return void interaction.followUp(successEmbed(`Successfully ${subCommand === "enable" ? "enabled" : "disabled"} access for ${user.tag}.`));

    } catch (error) {
        console.error('Error in admin-access command:', error);
        // If something goes wrong, send a failure message
        return void interaction.followUp(errorEmbed("There was an error while processing the request."));
    }
}