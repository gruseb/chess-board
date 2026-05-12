const LICHESS_API_KEY = 'YOUR_API_KEY_HERE'; // Get from .env
const USERNAME = 'sebastianflorian2000';

async function test() {
    try {
        const response = await fetch(`https://lichess.org/api/games/user/${USERNAME}?max=10&perfType=rapid&pgnInJson=true`, {
            headers: {
                'Authorization': `Bearer ${LICHESS_API_KEY}`,
                'Accept': 'application/x-ndjson'
            }
        });

        console.log("Status:", response.status);
        if (response.ok) {
            const text = await response.text();
            console.log("Response length:", text.length);
            console.log("First line:", text.split('\n')[0]);
        } else {
            console.log("Error body:", await response.text());
        }
    } catch (e) {
        console.error("Fetch failed:", e);
    }
}

test();
