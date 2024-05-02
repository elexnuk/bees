/**
 * @file democracyclub.js
 * @brief Loads data from the DemocracyClub API
 */

import { fetchJson } from './network.js';
import { keyv as db } from './state.js';
import { democracyClubResultEmbed } from './messages.js';

const api_url = process.env.DC_API_URL;
const api_headers = {
    "Authorization": `Token ${process.env.DC_API_KEY}`
};

function getResultDataUrl(electionOptions) {

    let queryString = "";
    
    if (electionOptions.electionId) {
        // Gets all ballots with a specific election ID
        queryString += `?election_id=${electionOptions.electionId}`;
    } else if (electionOptions.electionDate) {
        // Gets all ballots with a specific election date
        queryString += `?election_date=${electionOptions.electionDate}`;
    }
    
    if (electionOptions.allSince) {
        queryString += `&last_updated=${electionOptions.allSince}`;
    }

    if (electionOptions.page_size) {
        queryString += `&page_size=${electionOptions.page_size}`;
    }

    return api_url + `results/` + queryString;
}

function getBallotResultUrl(ballotId) {
    return api_url + `results/${ballotId}/`;
}

async function getBallotInformation(ballot_id) {
    try {
        const url = api_url + `ballots/${ballot_id}/`;
        return fetchJson(url);
    } catch (err) {
        console.error(`Error fetching ballot information ${ballot_id}: ${err}`);
        return {};
    }
}

async function getAllBallots(election_date) {
    const url = api_url + `ballots/?page_size=200&current=true&election_date=${election_date}`;
    try {
        let ballots = await fetchJson(url);
        let all_ballots = ballots.results;
        const count = ballots.count;

        while (ballots.next) {
            const next = ballots.next;
            ballots = await fetchJson(next);
            all_ballots.push(...ballots.results);
        }

        if (count !== all_ballots.length) {
            console.log(`Failed to get all ballots. Retrieved ${all_ballots.length} of ${count}`);
        }

        return all_ballots;
    } catch (err) {
        console.error(`Error fetching ballots: ${err}`);
        return [];
    }
}

async function getAllElections(election_date) {
    const url = api_url + "elections/?current=true&page_size=200";
    try {
        let elections = await fetchJson(url);
        let all_elections = elections.results;
        const count = elections.count;

        while (elections.next) {
            const next = elections.next;
            elections = await fetchJson(next);
            all_elections.push(...elections.results);
        }

        if (count !== all_elections.length) {
            console.log(`Failed to get all elections. Retrieved ${all_elections.length} of ${count}`);
        }

        all_elections = all_elections.filter(election => election.election_date !== election_date);

        return all_elections;
    } catch (err) {
        console.error(`Error fetching elections: ${err}`);
        return [];
    }
}

async function checkResultsSince(last_date) {
    const url = getResultDataUrl({ electionDate: "2024-05-02", allSince: last_date });
    try {
        const data = await fetchJson(url);
        const results = data.results;

        while (data.next) {
            const next = data.next;
            data = await fetchJson(next);
            results.push(...data.results);
        }

        return results;

    } catch (err) {
        console.error(`Error fetching results: ${err}`);
        return [];
    }
}

async function runCron(sendToChannel) {
    
    const last_date = await db.get("LAST_DC_RESULT_TIME");
    if (!last_date) {
        last_date = (new Date()).toISOString();
        console.log(`No last date found. Setting to ${last_date}`);
        await db.set("LAST_DC_RESULT_TIME", last_date);
    }

    console.log(`Performing DemocracyClub cron. Last date: ${last_date}`);

    const results = await checkResultsSince(last_date);
    if (results.length > 0) {
        const new_date = new Date().toISOString();

        console.log(`Found ${results.length} new results at ${new_date}`);
        await db.set("LAST_DC_RESULT_TIME", new_date);

        for (const result of results) {
            const ballot_paper_id = result.ballot.ballot_paper_id;
            const ballot_information = await db.get(ballot_paper_id);
            const election_information = await db.get(ballot_information.election.election_id);

            let embed = democracyClubResultEmbed(result, ballot_information, election_information);

            const channel_list = await db.get("election_channels");
            for (const channel of channel_list) {
                // const channel_id = channel.channel;
                // const channel_obj = await client.channels.fetch(channel_id);
                //await channel_obj.send({ embeds: [embed] });
                await sendToChannel(channel.channel, { embeds: [embed] });
            }
        }
    } else {
        console.log("DemocracyClub cron: No new results found");
    }
}

export { getAllElections, getBallotInformation, getAllBallots, checkResultsSince, runCron };