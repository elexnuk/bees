import { ChannelType, PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import { keyv as db, keyv } from "../../state.js";

export const data = new SlashCommandBuilder()
    .setName("get_election_channel")
    .setDescription("Which channel will election results be posted to?");

export async function execute(interaction) {

    let guild = interaction.guild.id;
    const election_channels = await db.get("election_channels");
    for (let c of election_channels) {
        if (c.guild === guild) {
            await interaction.reply({ content: `Election Channel in this guild is: <#${c.channel}>` });
            return;
        }
    }

    await interaction.reply({ content: "Couldn't find an election channel for this guild." });
}