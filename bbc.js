import { fetchJson } from './network.js';
import { handlePCCMayorboard } from './pccMayorboard.js';
import { handleScoreboard } from './scoreboard.js';
import { keyv as db } from './state.js';

//const api_url = process.env.BBC_WEBSITE;

// get council calls from the BBC
async function getBBCCalls(sendMessageToElectionChannels, api_url) {
    const england = await fetchJson(api_url + "/england/councils");
    console.log("\t" + api_url + "/england/councils");

    const groups = england.groups;
    if (!groups) {
        console.log("\tNo council data from BBC");
        return;
    }

    for (const group of groups) {
        const councils = group.cards || [];
        for (const council of councils) { // has title: council name and winnerFlash: object of winner
            
            const title = council.title;
            const href = council.href;
            const winnerFlash = council.winnerFlash;

            const previousWinnerFlash = await db.get(`Council-${title}`);
            if (!previousWinnerFlash) {
                await db.set(`Council-${title}`, winnerFlash);
                continue;
            }

            if (winnerFlash) {
                // Check if the winner "flash" text has changed
                if (winnerFlash.flash !== previousWinnerFlash?.flash) {
                    await db.set(`Council-${title}`, winnerFlash);
                    console.log("\tCouncil winner changed: ", title, winnerFlash.flash, previousWinnerFlash?.flash);
                    if (!previousWinnerFlash) {
                        await sendMessageToElectionChannels(`# Result ${title}: ${winnerFlash.flash}\nhttps://www.bbc.co.uk${href}`);
                    } else {
                        await sendMessageToElectionChannels(`# Result ${title}: ${winnerFlash.flash} (previous ${previousWinnerFlash.flash})\nhttps://www.bbc.co.uk${href}`);
                    }
                }
            }
        }
    }
    
}

// get the scorecard for cllrs won & PCCs
async function getBBCScorecard(sendMessageToElectionChannels, api_url) {
    const england = await fetchJson(api_url + "/england/results");
    const wales = await fetchJson(api_url + "/wales/results");
    console.log("\t" + api_url + "/england/results");
    console.log("\t" + api_url + "/wales/results");

    const scoreboard = england?.scoreboard;
    if (scoreboard) {
        try {
            await handleScoreboard(scoreboard); 
            console.log("\tStandard scoreboard data from BBC updated");
        } catch (err) {
            console.error("Error handling scoreboard: ", err);
        }
    } else {
        console.log("\tNo standard scoreboard data from BBC");
    }
    
    const mayorScoreboard = england?.mayorScoreboard;
    if (mayorScoreboard) {
        try {
            await handlePCCMayorboard("Mayorboard", mayorScoreboard, sendMessageToElectionChannels);
            console.log("\tMayor scoreboard data from BBC updated");      
        } catch (err) {
            console.error("Error handling mayor scoreboard: ", err);
        }
    } else {
        console.log("\tNo mayor scoreboard data from BBC");
    }

    const pccScoreboard = england?.pccScoreboard;
    if (pccScoreboard) {
        try {
            await handlePCCMayorboard("EnglandPCC", pccScoreboard, sendMessageToElectionChannels);
            console.log("\tEnglish PCC scoreboard data from BBC updated");      
        } catch (err) {
            console.error("Error handling PCC scoreboard: ", err);
        }
    } else {
        console.log("\tNo PCC scoreboard data from BBC");
    }

    const walesScoreboard = wales.pccScoreboard;
    if (walesScoreboard) {
        try {
            await handlePCCMayorboard("WalesPCC", walesScoreboard, sendMessageToElectionChannels);
            console.log("\tWelsh PCC scoreboard data from BBC updated");      
        } catch (err) {
            console.error("Error handling Welsh PCC scoreboard: ", err);
        }
    } else {
        console.log("\tNo Wales scoreboard data from BBC");
    }
}

// scans the bbc website for latest election results
async function bbcCronJob(sendMessageToElectionChannels, api_url = process.env.BBC_WEBSITE) {
    console.log(new Date().toISOString() + "] Starting BBC cron job");
    await getBBCScorecard(sendMessageToElectionChannels, api_url);
    await getBBCCalls(sendMessageToElectionChannels, api_url);
    console.log(new Date().toISOString() + "] Finished BBC cron job");
}


export { bbcCronJob };