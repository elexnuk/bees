import { SlashCommandBuilder } from "discord.js";
import { keyv as db } from "../../state.js";
import { democracyClubResultEmbed } from "../../messages.js";
import { fetchJson } from "../../network.js";
import { getBallotInformation } from "../../democracyclub.js";

export const data = new SlashCommandBuilder()
    .setName("test_dc")
    .setDescription("Tests the Democracy Club embed.");

export async function execute(interaction) {
    let embeds = [];
    const results = await fetchJson("https://candidates.democracyclub.org.uk/api/next/results/?election_date=2024-04-25&last_updated=2024-04-26T09:00:00Z");

    if (results.results.length > 0) {
        
        console.log(`ELECTION TEST: Found ${results.results.length} new results.`);
        
        for (const result of results.results) {
            const ballot_paper_id = result.ballot.ballot_paper_id;
            const ballot_information = await getBallotInformation(ballot_paper_id);
            const election_information = await fetchJson(`https://candidates.democracyclub.org.uk/api/next/elections/${ballot_information.election.election_id}/`);
            let embed = democracyClubResultEmbed(result, ballot_information, election_information);
            embeds.push(embed);
        }
    }

    const guild = interaction.guild.id;
    const channel_list = await db.get("election_channels");
    const channel = channel_list.find(c => c.guild === guild);
    const channel_id = channel.channel;
    const channel_obj = await interaction.client.channels.fetch(channel_id);
    await channel_obj.send({ embeds });

    await interaction.reply({ content: "Test complete.", ephemeral: true });
}