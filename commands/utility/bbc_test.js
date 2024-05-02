import { SlashCommandBuilder, PermissionFlagsBits } from "discord.js";
import { keyv as db } from "../../state.js";
import { democracyClubResultEmbed } from "../../messages.js";
import { fetchJson } from "../../network.js";
import { bbcCronJob } from "../../bbc.js";

export const data = new SlashCommandBuilder()
    .setName("test_bbc")
    .setDescription("Tests the BBC functions.");

export async function execute(interaction) {

    let permissions = interaction.memberPermissions;
    if (!permissions.has(PermissionFlagsBits.ManageChannels)) {
        await interaction.reply({ content: "You do not have permission to send a test.", ephemeral: true });
        return;
    }

    interaction.reply({ content: "Test Sent.", ephemeral: true });
    
    await bbcCronJob(async (msg) => {
        const channel_list = await db.get("election_channels");
        for (const channel of channel_list) {
            try {
                const channel_obj = await interaction.client.channels.fetch(channel.channel);
            //      await channel_obj.send(msg);
                console.log(msg);
        } catch (err) {
                console.error(`Failed to send message to channel ${channel.channel}: ${err}`);
            }
        }
    }, "https://static.files.bbci.co.uk/elections/data/news/election/2024");
    
    await bbcCronJob(async (msg) => {
        const channel_list = await db.get("election_channels");
        for (const channel of channel_list) {
            try {
                const channel_obj = await interaction.client.channels.fetch(channel.channel);
                //await channel_obj.send(msg);
                console.log(msg);
            } catch (err) {
                console.error(`Failed to send message to channel ${channel.channel}: ${err}`);
            }
        }
    }, "https://static.files.bbci.co.uk/elections/data/news/election/2021");

    
}