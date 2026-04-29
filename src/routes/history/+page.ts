import { supabase } from '$lib/supabaseClient';

export async function load() {
    const { data: games, error } = await supabase
        .from('partie')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error("Error loading history:", error);
    }

    return {
        games: games ?? []
    };
}
