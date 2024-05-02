import { keyv as db } from "./state.js";
import { EmbedBuilder, Colors } from "discord.js";

/**
 * Parsing a BBC scoreboard of the party/cllr numbers
 * @param {*} scoreboardData the data to parse
 * @returns this updates the scoreboard in the kv store, we also bump the last updated time
 */
async function handleScoreboard(scoreboardData) {
    const heading = scoreboardData.heading;
    const status = scoreboardData.status.message;
    const statusType = scoreboardData.status.type;

    const previousStatus = await db.get(`Scoreboard-Status`);
    if (!previousStatus) {
        await db.set(`Scoreboard-Status`, { heading, status, statusType });
    } else if (previousStatus.status !== status || previousStatus.heading !== heading || previousStatus.statusType !== statusType) {
        await db.set(`Scoreboard-Status`, { heading, status, statusType });
        await db.set(`Scoreboard-LastUpdated`, new Date().toISOString());
    }

    let scoreboardKeys = [];

    const groups = scoreboardData.groups[0].scorecards;
    for (const group of groups) {
        const groupTitle = group.title;
        const colour = group.colour;
        const data = group.dataColumns;
        const dataFormatted = group.dataColumnsFormatted;
        
        scoreboardKeys.push(groupTitle);

        const currentData = {
            party: groupTitle,
            colour: colour,
            //      Councils     Change     Councillors    Change
            data: [ data[0][0], data[0][1], data[1][0], data[1][1] ],
            dataFormatted: [ dataFormatted[0][0], dataFormatted[0][1], dataFormatted[1][0], dataFormatted[1][1] ]
        };

        const previousData = await db.get(`Scoreboard-${groupTitle}`);
        if (!previousData) {
            await db.set(`Scoreboard-${groupTitle}`, currentData);
            continue;
        }

        // There's been a change: update the database
        if (currentData.data[0] !== previousData.data[0] || currentData.data[1] !== previousData.data[1] || currentData.data[2] !== previousData.data[2] || currentData.data[3] !== previousData.data[3]) {
            await db.set(`Scoreboard-${groupTitle}`, currentData);
            await db.set(`Scoreboard-LastUpdated`, new Date().toISOString());
            continue;
        }
    }

    await db.set(`Scoreboard-Keys`, scoreboardKeys);
}

async function createScoreboardSummary() {
    const scoreboardKeys = await db.get(`Scoreboard-Keys`) || [];
    const scoreboardData = [];
    for (const key of scoreboardKeys) {
        const data = await db.get(`Scoreboard-${key}`);
        scoreboardData.push(data);
    }
    // Sort scoreboard data by councillor count
    scoreboardData.sort((a, b) => b.data[2] - a.data[2]);
    const lastUpdated = await db.get(`Scoreboard-LastUpdated`) || "never";
    const status = await db.get(`Scoreboard-Status`) || { heading: "No data", status: "No data", statusType: "No data" };
    let scoreboardSummary = `${status.status} (${status.statusType})\n\nLast updated: ${new Date(lastUpdated).toLocaleTimeString("en-GB")}\n\n`;

    for (const data of scoreboardData) {
        if (scoreboardSummary.length > 1900) {  break; }
        scoreboardSummary += `${data.party}: ${data.dataFormatted[0]} (${data.dataFormatted[1]}); ${data.dataFormatted[2]} (${data.dataFormatted[3]})\n`;
    }

    const winningColour = scoreboardData[0].colour || Colors.Aqua;

    return new EmbedBuilder()
        .setAuthor({
            name: "BBC News",
            url: "https://www.bbc.co.uk/news/election/2024/england/results"
        })
        .setTitle(`BBC News Election Scoreboard Update - ${status.heading}`)
        .setDescription(scoreboardSummary)
        .setColor(winningColour);
}

export { handleScoreboard, createScoreboardSummary };