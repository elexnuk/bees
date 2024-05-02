import { Colors, Embed, EmbedBuilder } from "discord.js";
import { readJSONFileSync } from "./network.js";

const party_colours = readJSONFileSync("./static/party_hex.min.json");
const party_lookup = readJSONFileSync("./static/ec_to_bbc_parties.min.json");

// function to round a number to 2dp
function round2dp(num) {
    return Math.round(num * 100) / 100;
}

function democracyClubResultEmbed(result, ballot, election) {
    let candidates = result.candidate_results;
    // sort candidates by num_ballots
    candidates.sort((a, b) => b.num_ballots - a.num_ballots);
    let colour = "#DDDDDD";
    let description = "";
    let first = true;
    for (const candidate of candidates) {
        if (candidate.elected) {
            if (!first) {
                description += ", ";
            } else {
                colour = party_colours[party_lookup[candidate.party.legacy_slug]?.parcode || "NOC"]?.colour || "#DDDDDD";
            }
            description += `**${candidate.party.name}**`;
            first = false;
        } else {
            continue;
        }
        description += " elected.\n";
    }

    let total_votes = 0;
    let top_party_votes = new Map();

    for (const candidate of candidates) {
        let current_top_votes = 0;
        const party = party_lookup[candidate.party.legacy_slug]?.parcode || candidate.party.name;
        if (top_party_votes.has(party)) {
            current_top_votes = top_party_votes.get(party);
        }

        if (candidate.num_ballots > current_top_votes) {
            top_party_votes.set(party, candidate.num_ballots);
            total_votes += candidate.num_ballots;
        }        
    }

    // sort the map into descending order of votes
    const party_results = [...top_party_votes.entries()].sort((a, b) => b[1] - a[1]);

    let party_results_string = "";
    for (const [party, votes] of party_results) {
        party_results_string += `${party}: ${round2dp(100 * votes / total_votes)}%\n`;
    }

    description += party_results_string;

    return new EmbedBuilder()
        .setAuthor({ 
            name: "Democracy Club", 
            iconURL: "https://candidates.democracyclub.org.uk/static/img/apple-touch-icon.png", 
            url: `https://whocanivotefor.co.uk/elections/${result.ballot.ballot_paper_id}`
        })
        .setURL(`https://whocanivotefor.co.uk/elections/${result.ballot.ballot_paper_id}`)
        .setTitle(`New Result in ${ballot.post.label} (${election.name})`)
        .setDescription(description)
        .setColor(colour);
}

function scoreboardEmbed(scoreboard) {
    let i = 0;
    let description = scoreboard.status.message + "\n";
    for (const card of (scoreboard.groups[0].scorecards || [])) {
        if (i++ > 6) break;

        description += `${card.title}: ${card.dataColumnsFormatted[0][0]} (${card.dataColumnsFormatted[0][1]}); ${card.dataColumnsFormatted[1][0]} (${card.dataColumnsFormatted[1][1]})\n`;
    }

    return new EmbedBuilder()
        .setAuthor({
            name: "BBC News",
            url: "https://www.bbc.co.uk/news/election/2024/england/results"
        })
        .setTitle(scoreboard.heading)
        .setDescription(description)
        .setColor(Colors.Aqua);
}

export { democracyClubResultEmbed, scoreboardEmbed }; 