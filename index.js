/**
 * @file index.js
 * @description BEES: The BEcord Electoral results Service
 * 
 * There are a number of components to the service.
 * - Each has a cron schedule to run at a specific time.
 * - Each is called in an order and adds some data to be output at that time.
 * - The data is then output to the discord channel & then automatically published
 *  
 * We have a KV store for the data already published to avoid double posting. 
 * For each of the elections (read from DemocracyClub up on the day of the election) 
 * 
 */

/// We maintain a database of elections happening from DemocracyClub. 
/// We read this database on start-up. We have a key-value store for each election id to whether we've published a result
/// when a cron runs (democracyclub or britainelects map) we can try find the ballot id for this election and then
///     check if it's been published yet. If not, we publish it.
/// when a bbc cron runs we can check for councils that have had their flash results published or 
///     changed and then publish them.

// run a discord bot which can be used to publish results into a channel manually, 
// and then interrogate the state through commands? sure. 

// extension: parse the data we get an output a graph.

import "dotenv/config";
import { schedule } from "node-cron";

import { keyv as db, checkKeyvData } from "./state.js";
import { getAllElections, getAllBallots, runCron as dcCron } from "./democracyclub.js";
import { client, sendToChannel } from "./discord.js";
import { bbcCronJob } from "./bbc.js";
import { scoreboardEmbed } from "./messages.js";
import { createScoreboardSummary } from "./scoreboard.js";
import { createMayorboardSummary } from "./pccMayorboard.js";

const election_date = "2024-05-02";
let retry_count = 0;

async function sendToAllElectionChannels(msg) {
    const channel_list = await db.get("election_channels");
    for (const channel of channel_list) {
        sendToChannel(channel.channel, msg).catch(err => console.error("Error sending message to channel: ", err));
    }
}

async function initialiseKeyvData() {
    if (retry_count > 10) return false;
    try {
        await checkKeyvData(election_date);
        return true;
    } catch (err) {
        console.error("Error checking keyv data: ", err);
        retry_count++;
        setTimeout(() => { initialiseKeyvData(); }, 500);
        setTimeout(() => { retry_count--; }, 5000);
        return false;
    }
}
await initialiseKeyvData();

async function initialiseCronSchedule() {
    // "*/2 * * * *" => check democlub, bbc, every 2 minutes
    // "*/15 * * * *" => post results to discord quarter hour
    // "0 22 * * 4" => polls close at 10pm on a Thursday

    schedule("*/1 * * * *", async () => {
        // check for an update in the main counciller scoreboard and send if been updated in the last 15 minutes
        const last_update = await db.get("Scoreboard-LastUpdated");
        const current_time = new Date();
        const fifteen_minutes_ago = new Date(current_time.getTime() - 15 * 60000);
        if (last_update && new Date(last_update) > fifteen_minutes_ago) {
            console.log(new Date().toISOString() + "] Sending main scoreboard update");
            
            let embeds = [
                (await createScoreboardSummary()), 
                (await createMayorboardSummary("Mayorboard")),
                (await createMayorboardSummary("EnglandPCC")),
                (await createMayorboardSummary("WalesPCC"))
            ];
            try {
                await sendToAllElectionChannels({ embeds });
            } catch (err) {
                console.error("Error sending main scoreboard update: ", err);
            }
        } else {
            console.log(new Date().toISOString() + "] No main scoreboard update to send");
        }
    });

    schedule("*/2 * * * *", async () => {
        await dcCron(sendToChannel);
        await bbcCronJob(sendToAllElectionChannels);
    });

    // schedule("0 22 * * 4", async () => {
    //     // poll closed
    //     const channel_list = await db.get("election_channels");
    //     for (const channel of channel_list) {
    //         await sendToChannel(channel.channel, "# Polls Have Closed!.");
    //     }
    // });
}
await initialiseCronSchedule();

async function runDiscord() {
    if (retry_count > 20) return false;
    try {
        await client.login(process.env.DISCORD_TOKEN);
    } catch (err) {
        console.error("Error logging in to discord: ", err);
        retry_count++;
        setTimeout(() => { runDiscord(); }, 500);
        setTimeout(() => { retry_count--; }, 5000);
    }
}
await runDiscord();