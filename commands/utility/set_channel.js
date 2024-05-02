import { ChannelType, PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import { keyv as db, keyv } from "../../state.js";

export const data = new SlashCommandBuilder()
    .setName("election_channel")
    .addChannelOption(option => 
        option.setName("channel")
            .addChannelTypes(ChannelType.GuildAnnouncement)
            .setDescription("The channel to publish election results to.")
            .setRequired(true)
    )
    .setDescription("Sets the channel to publish election results to.");

export async function execute(interaction) {

    let permissions = interaction.memberPermissions;
    if (!permissions.has(PermissionFlagsBits.ManageChannels)) {
        await interaction.reply({ content: "You do not have permission to set the election channel.", ephemeral: true });
        return;
    }

    const channel = interaction.options.getChannel("channel");
    const guild = interaction.guild;

    let channels = await db.get("election_channels") || [];

    for (let c of channels) {
        if (c.guild === guild.id) {
            c.channel = channel.id;
            console.log(`Updated Guild ${guild.id} Channel ${channel.id} in election channels.`);
            await db.set("election_channels", channels);
            await interaction.reply({ content: "Channel has been updated :)", ephemeral: true });
            return;
        }
    }

    channels.push({ guild: guild.id, channel: channel.id });
    console.log(`Added Guild ${guild.id} Channel ${channel.id} to election channels.`);
    await db.set("election_channels", channels);
    await interaction.reply({ content: "Channel has been set :)", ephemeral: true });
}