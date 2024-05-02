import { keyv as db } from "./state.js";
import { EmbedBuilder, Colors } from "discord.js";

async function handlePCCMayorboard(key, mayorboard, sendMessageCallback) {
    const heading = mayorboard.heading;
    const status = mayorboard.status.message;
    const statusType = mayorboard.status.type;

    const previousStatus = await db.get(`${key}-Status`);
    if (!previousStatus) {
        await db.set(`${key}-Status`, { heading, status, statusType });
    } else if (previousStatus.status !== status || previousStatus.heading !== heading || previousStatus.statusType !== statusType) {
        await db.set(`${key}-Status`, { heading, status, statusType });
        await db.set(`${key}-LastUpdated`, new Date().toISOString());
    }

    let mayorboardKeys = [];

    const groups = mayorboard.groups[0].scorecards;
    for (const group of groups) {
        const winnerTitle = group.title; // Winner's Name or "Awaiting Result"
        const party = group.party; // Party Name
        const colour = group.accentColour;
        const name = group.contextLabel;
        const url = group.contextHref;
        const previousWinnerData = group.previousWinnerData

        mayorboardKeys.push(name);

        const currentData = {
            name,
            winner: winnerTitle,
            party: party,
            colour: colour,
            url, 
            previousWinnerData
        };

        const previousData = await db.get(`${key}-${name}`);
        if (!previousData) {
            await db.set(`${key}-${name}`, currentData);
            continue;
        }

        // There's been a change: update the database, or there is a winner which we can post
        if (currentData.winner !== previousData.winner || currentData.winner !== "Awaiting result") {
            await db.set(`${key}-${name}`, currentData);
            await db.set(`${key}-LastUpdated`, new Date().toISOString());

            if (currentData.winner === "Awaiting result" || currentData.party === "-") {
                console.log("\tWinner Changed but result is still pending: ", currentData);
                continue; // Don't send a message if the result is still pending.
            }

            if (!previousWinnerData) {
                console.log("\tWinner Changed but no previous data: ", currentData);
                sendMessageCallback(`# Result ${name}: ${winnerTitle} elected. ${party} win.\n${url}`);
                continue;
            }
            const gain = previousWinnerData.party === currentData.party ? "Hold" : "Gain from " + previousWinnerData.superTitle;
            console.log("\tWinner Changed: ", currentData, previousWinnerData, gain);
            sendMessageCallback(`# Result ${name}: ${winnerTitle} elected. ${party} ${gain} \n${url}`);
        }
    }

    await db.set(`${key}-Keys`, mayorboardKeys);
}

async function createMayorboardSummary(bkey) {
    const scoreboardKeys = await db.get(`${bkey}-Keys`) || [];
    const scoreboardData = {};
    for (const key of scoreboardKeys) {
        const data = await db.get(`${bkey}-${key}`);
        if (!scoreboardData[data.party]) {
            scoreboardData[data.party] = 1;
        } else {
            scoreboardData[data.party]++;
        }
    }
    // Sort scoreboard data by value
    const sortedData = Object.entries(scoreboardData).sort((a, b) => b[1] - a[1]);

    const lastUpdated = await db.get(`${bkey}-LastUpdated`) || "never";
    const status = await db.get(`${bkey}-Status`) || { heading: "No data", status: "No data", statusType: "No data" };
    let scoreboardSummary = `${status.status} (${status.statusType})\n\nLast updated: ${new Date(lastUpdated).toLocaleTimeString("en-GB")}\n\n`;

    for (const data of sortedData) {
        if (scoreboardSummary.length > 1900) {  break; }
        scoreboardSummary += `${data[0]} ${data[1]}; `;
    }

    return new EmbedBuilder()
        .setAuthor({
            name: "BBC News",
            url: "https://www.bbc.co.uk/news/election/2024/england/results"
        })
        .setTitle(`BBC News Election Scoreboard Update - ${status.heading}`)
        .setDescription(scoreboardSummary)
        .setColor(Colors.Aqua);
}

export { handlePCCMayorboard, createMayorboardSummary };