/**
 * @file network.js
 * @brief Handles network requests
 */

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

export { fetchJson };