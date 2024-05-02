import Keyv from "keyv";
import { getAllElections, getAllBallots } from "./democracyclub.js";

const keyv = new Keyv("sqlite://data/db.sqlite");

keyv.on("error", err => console.error("Keyv connection error:", err));

async function checkKeyvData(election_date) {
    try {
        const present = await keyv.get("electionDataPopulated");
        if (present != election_date) {
            throw `Keyv data is not populated for this election date. Store has ${present} we have ${election_date}.`;
        }
    } catch (err) {
        console.error("keyv store doesn't contain election data: ", err);

        const elections = await getAllElections(election_date);
        const ballots = await getAllBallots(election_date);

        let election_ids = [];
        let ballot_ids = [];

        for (const election of elections) {
            await keyv.set(`${election.slug}`, election);
            election_ids.push(election.slug);
        }
        for (const ballot of ballots) {
            await keyv.set(`${ballot.ballot_paper_id}`, ballot);
            ballot_ids.push(ballot.ballot_paper_id);
        }

        await keyv.set("electionDataPopulated", election_date);
        await keyv.set("elections", election_ids);
        await keyv.set("ballots", ballot_ids);
    }
}

export { keyv, checkKeyvData };