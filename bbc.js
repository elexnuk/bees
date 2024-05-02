import { fetchJson } from './network.js';
import { keyv as db } from './state.js';

//const api_url = process.env.BBC_WEBSITE;

// get council calls from the BBC
async function getBBCCalls(sendMessageToElectionChannels, api_url) {
    const england = await fetchJson(api_url + "/england/councils");
    const groups = england.groups || [];
    for (const group of groups) {
        const councils = group.cards || [];
        for (const council of councils) { // has title: council name and winnerFlash: object of winner
            
            const previousWinnerFlash = await db.get(council.title);

            //console.log(council.title, council.winnerFlash === null, previousWinnerFlash === null);
            //console.log(council.title, council.winnerFlash?.flash, previousWinnerFlash?.flash);

            if (!council.winnerFlash || !council.winnerFlash.flash) {
                await db.set(council.title, null);
                return;
            }

            if (previousWinnerFlash === null && council.winnerFlash !== null && council.winnerFlash.flash) {
                await db.set(council.title, council.winnerFlash);
                
                await sendMessageToElectionChannels(`# Result ${council.title}: ${council.winnerFlash?.flash}\nhttps://www.bbc.co.uk${council.href}`);
            } else if (previousWinnerFlash && previousWinnerFlash?.flash !== council.winnerFlash?.flash) {
                await db.set(council.title, council.winnerFlash);
                
                await sendMessageToElectionChannels(`# Result ${council.title}: ${council.winnerFlash?.flash} (previous ${previousWinnerFlash})\nhttps://www.bbc.co.uk${council.href}`);
            } else if (council.winnerFlash === null) {
                await db.set(council.title, council.winnerFlash);
            }
        }
    }
    
}

function compareScoreboards(newBoard, oldBoard, dataBoard = true) {
    const headingDiff = newBoard?.heading !== oldBoard?.heading;
    const statusDiff = newBoard?.status?.type !== oldBoard?.status?.type;
    const messageDiff = newBoard?.status?.message !== oldBoard?.status?.message;

    const newScorecardKeys = Object.keys(newBoard?.groups[0]?.scorecards || {});
    const oldScorecardKeys = Object.keys(oldBoard?.groups[0]?.scorecards || {});
    const keyDiff = newScorecardKeys.length !== oldScorecardKeys.length;

    const dataDiff = false;
    let differingKeys = [];
    if (dataBoard) {
        for (const newCard of (newBoard?.groups[0]?.scorecards || [])) {
            for (const oldCard of (oldBoard?.groups[0]?.scorecards || [])) {
                if (newCard.title === oldCard.title) {
                    let columnCount = newCard.columnHeadings.length;
                    let rowCount = newCard.rows.length;

                    for (let i = 0; i < columnCount; i++) {
                        for (let j = 0; j < rowCount; j++) {
                            if (newCard.dataColumns[i][j] !== oldCard.dataColumns[i][j]) {
                                dataDiff = true;
                                differingKeys.push(newCard.title);
                            }
                        }
                    }
                } else {
                    continue;
                }
            }
        }
    } else {
        for (const newCard of (newBoard?.groups[0]?.scorecards || [])) {
            for (const oldCard of (oldBoard?.groups[0]?.scorecards || [])) {
                if (newCard.contextLabel === oldCard.contextLabel) {
                    if (newCard.title !== oldCard.title) {
                        dataDiff = true;
                        differingKeys.push(newCard.contextLabel);
                    }
                } else {
                    continue;
                }
            }
        }
    }

    return {
        diff: headingDiff || statusDiff || messageDiff || keyDiff || dataDiff,
        headingDiff,
        statusDiff,
        messageDiff,
        keyDiff,
        dataDiff,
        differingKeys,
        newBoard
    };
}

// get the scorecard for cllrs won & PCCs
async function getBBCScorecard(sendMessageToElectionChannels, api_url) {
    const england = fetchJson(api_url + "/england/results");
    const wales = fetchJson(api_url + "/wales/results");

    const scoreboard = england.scoreboard;
    const mayorScoreboard = england.mayorScoreboard;
    const pccScoreboard = england.pccScoreboard;
    const walesScoreboard = wales.scoreboard;

    const previousScoreboard = await db.get("previous_scoreboard");
    const previousMayorScoreboard = await db.get("previous_mayor_scoreboard");
    const previousPccScoreboard = await db.get("previous_pcc_scoreboard");
    const previousWalesScoreboard = await db.get("previous_wales_scoreboard");

    let mainScoreboardDiff = compareScoreboards(scoreboard, previousScoreboard);
    let mayorScoreboardDiff = compareScoreboards(mayorScoreboard, previousMayorScoreboard, false);
    let pccScoreboardDiff = compareScoreboards(pccScoreboard, previousPccScoreboard, false);
    let walesScoreboardDiff = compareScoreboards(walesScoreboard, previousWalesScoreboard, false);

    // console.log(mainScoreboardDiff, mayorScoreboardDiff, pccScoreboardDiff, walesScoreboardDiff);

    // compare the scoreboards
    // if the scoreboards are different, update the db and send a message to discord
    // if the scoreboards are the same, do nothing
    if (mainScoreboardDiff.diff) {
        await db.set("previous_scoreboard", scoreboard);
        await db.set("previous_scoreboard_lastUpdated", new Date().toISOString());
    }

    if (mayorScoreboardDiff.diff) {
        await db.set("previous_mayor_scoreboard", mayorScoreboard);
        await db.set("previous_mayor_scoreboard_lastUpdated", new Date().toISOString());
        for (let key of mayorScoreboardDiff.differingKeys) {
            // send a message to discord
            const info = mayorScoreboardDiff.newBoard.groups[0].scorecards.find(card => card.contextLabel === key);
            const flip = info.superTitle !== info.previousWinner.superTitle;
            await sendMessageToElectionChannels(`# Result: ${info.superTitle} ${flip ? "gains" : "holds"} ${key} (previous ${info.previousWinner.superTitle})`);
        }
    }

    if (pccScoreboardDiff.diff) {
        await db.set("previous_pcc_scoreboard", pccScoreboard);
        await db.set("previous_pcc_scoreboard_lastUpdated", new Date().toISOString());
        for (let key of mayorScoreboardDiff.differingKeys) {
            // send a message to discord
            const info = mayorScoreboardDiff.newBoard.groups[0].scorecards.find(card => card.contextLabel === key);
            const flip = info.superTitle !== info.previousWinner.superTitle;
            await sendMessageToElectionChannels(`# Result: ${info.superTitle} ${flip ? "gains" : "holds"} ${key} (previous ${info.previousWinner.superTitle})`);
        }
    }

    if (walesScoreboardDiff.diff) {
        await db.set("previous_wales_scoreboard", walesScoreboard);
        await db.set("previous_wales_scoreboard_lastUpdated", new Date().toISOString());
        for (let key of mayorScoreboardDiff.differingKeys) {
            // send a message to discord
            const info = mayorScoreboardDiff.newBoard.groups[0].scorecards.find(card => card.contextLabel === key);
            const flip = info.superTitle !== info.previousWinner.superTitle;
            await sendMessageToElectionChannels(`# Result: ${info.superTitle} ${flip ? "gains" : "holds"} ${key} (previous ${info.previousWinner.superTitle})`);
        }
    }
}

// scans the bbc website for latest election results
async function bbcCronJob(sendMessageToElectionChannels, api_url = process.env.BBC_WEBSITE) {
    console.log("Starting BBC cron job");
    await getBBCScorecard(sendMessageToElectionChannels, api_url);
    await getBBCCalls(sendMessageToElectionChannels, api_url);
    console.log("Finished BBC cron job");
}


export { bbcCronJob };