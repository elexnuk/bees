import { SlashCommandBuilder } from "discord.js";
import { keyv as db } from "../../state.js";

export const data = new SlashCommandBuilder()
    .setName("elections")
    .setDescription("Returns list of elections happening today.");

export async function execute(interaction) {

    const elections = await db.get("elections");
    const ballots = await db.get("ballots");

    const first = await db.get(ballots[0]);
    const last = await db.get(ballots[ballots.length - 1]);

    let seatCount = 0;
    for (const ballot of ballots) {
        const ballotData = await db.get(ballot);
        seatCount += ballotData.winner_count;
    }  

    await interaction.reply(`We're tracking ${elections.length} elections today, that's ${ballots.length} ballots for ${seatCount} winners.
First ballot: ${first.post.label} (${first.election.name}). Last Ballot: ${last.post.label} (${last.election.name}).
See the full list on the DemocracyClub website: https://candidates.democracyclub.org.uk/`);
}