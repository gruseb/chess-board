import { supabase } from '$lib/supabaseClient';
import { env as privateEnv } from '$env/dynamic/private';
import { env as publicEnv } from '$env/dynamic/public';

export async function load() {
    let syncResult: { success: boolean, count: number, error: string | null } = { success: false, count: 0, error: null };
    const lichessApiKey = privateEnv.LICHESS_API_KEY;
    const lichessUsername = publicEnv.PUBLIC_LICHESS_USERNAME ?? privateEnv.LICHESS_USERNAME;

    if (!lichessApiKey || !lichessUsername) {
        syncResult.error = 'Lichess sync disabled: missing env vars.';
    }

    // 1. Fetch latest Lichess games
    try {
        if (!lichessApiKey || !lichessUsername) {
            throw new Error(syncResult.error ?? 'Missing Lichess env vars');
        }

        const response = await fetch(`https://lichess.org/api/games/user/${lichessUsername}?max=10&perfType=rapid&pgnInJson=true`, {
            headers: {
                'Authorization': `Bearer ${lichessApiKey}`,
                'Accept': 'application/x-ndjson'
            }
        });

        if (response.ok) {
            const text = await response.text();
            const lichessGames = text.split('\n')
                .filter(line => line.trim())
                .map(line => {
                    try {
                        const g = JSON.parse(line);
                        return {
                            external_id: g.id,
                            created_at: new Date(g.createdAt).toISOString(),
                            white_player: g.players.white.user?.name || 'AI',
                            black_player: g.players.black.user?.name || 'AI',
                            result: g.winner === 'white' ? 'white_won' : (g.winner === 'black' ? 'black_won' : 'draw'),
                            pgn: g.pgn,
                            source: 'lichess'
                        };
                    } catch (e) {
                        return null;
                    }
                })
                .filter(g => g !== null);

            // 2. Upsert into Supabase
            if (lichessGames.length > 0) {
                const { error: upsertError } = await supabase
                    .from('partie')
                    .upsert(lichessGames, { onConflict: 'external_id' });

                if (upsertError) {
                    syncResult.error = upsertError.message;
                    console.error("Supabase Upsert Error:", upsertError);
                } else {
                    syncResult.success = true;
                    syncResult.count = lichessGames.length;
                }
            } else {
                syncResult.error = "No games found in Lichess response";
            }
        } else {
            const errorBody = await response.text();
            syncResult.error = `Lichess API returned ${response.status}: ${errorBody}`;
            console.error("Lichess API Error:", response.status, errorBody);
        }
    } catch (e) {
        syncResult.error = e instanceof Error ? e.message : "Unknown error occurred";
        console.error("Sync Exception:", e);
    }

    // 3. Fetch all games
    const { data: allGames, error } = await supabase
        .from('partie')
        .select('*')
        .order('created_at', { ascending: false });

    return {
        games: allGames ?? [],
        syncResult
    };
}
