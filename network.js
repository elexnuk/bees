/**
 * @file network.js
 * @brief Handles network requests
 */

import fs from "fs";

async function fetchJson(url, method = "GET", body = null, headers = {}) {
    try {
        // Construct the fetch options
        const options = {
            method: method.toUpperCase(),
            headers: headers,
            body: body ? JSON.stringify(body) : null,
        };

        // Fetch the data
        const response = await fetch(url, options);

        // Check if the response is successful
        if (!response.ok) {
            throw new Error(`Failed to fetch data: ${response.status} ${response.statusText}`);
        }

        // Parse the response data
        const data = await response.json();

        return data;
    } catch (error) {
        throw new Error(`Error fetching data: ${error.message}`);
    }
}

function readJSONFileSync(filePath) {
    try {
        // Read the JSON file synchronously
        const jsonData = fs.readFileSync(filePath, 'utf8');
        // Parse the JSON data
        const parsedData = JSON.parse(jsonData);
        return parsedData;
    } catch (error) {
        // If an error occurs, log it and return null
        console.error('Error reading JSON file:', error);
        return null;
    }
}

export { fetchJson, readJSONFileSync };