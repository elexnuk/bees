/**
 * @file democracyclub.js
 * @brief Loads data from the DemocracyClub API
 */

import { fetchJson } from './network.js';

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
    const url = getResultDataUrl({ allSince: last_date });
    try {
        return await fetchJson(url);
    } catch (err) {
        console.error(`Error fetching results: ${err}`);
        return [];
    }
}

/*

1. fetch all election resuts since LAST_RESULT_TIME
2. if there are new results => send them to the discord channel & update LAST_RESULT_TIME
3. no results => do nothing
- Runs every 2 minutes via cron

*/

export { getAllElections, getBallotInformation, getAllBallots, checkResultsSince };