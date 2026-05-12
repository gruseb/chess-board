import { supabase } from '$lib/supabaseClient';
import { LICHESS_API_KEY } from '$env/static/private';
import { PUBLIC_LICHESS_USERNAME } from '$env/static/public';

export async function load() {
    // Fetch local games from Supabase
    const { data: localGames, error } = await supabase
        .from('partie')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error("Error loading local history:", error);
    }

    // Fetch Lichess games
    let lichessGames = [];
    try {
        const response = await fetch(`https://lichess.org/api/games/user/${PUBLIC_LICHESS_USERNAME}?max=10&perfType=rapid&pgnInJson=true`, {
            headers: {
                'Authorization': `Bearer ${LICHESS_API_KEY}`,
                'Accept': 'application/x-ndjson'
            }
        });

        if (response.ok) {
            const text = await response.text();
            lichessGames = text.split('\n')
                .filter(line => line.trim())
                .map(line => {
                    const g = JSON.parse(line);
                    return {
                        id: `lichess-${g.id}`,
                        created_at: new Date(g.createdAt).toISOString(),
                        white_player: g.players.white.user?.name || 'AI',
                        black_player: g.players.black.user?.name || 'AI',
                        result: g.winner === 'white' ? 'white_won' : (g.winner === 'black' ? 'black_won' : 'draw'),
                        pgn: g.pgn,
                        source: 'lichess'
                    };
                });
        } else {
            console.error("Lichess API error:", response.status, await response.text());
        }
    } catch (e) {
        console.error("Failed to fetch Lichess games:", e);
    }

    // Combine and sort
    const allGames = [...(localGames || []), ...lichessGames].sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    return {
        games: allGames
    };
}
