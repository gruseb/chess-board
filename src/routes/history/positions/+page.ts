import { supabase } from '$lib/supabaseClient';

export async function load() {
    const { data: positions, error } = await supabase
        .from('position')
        .select('*, partie(pgn)')
        .order('created_at', { ascending: false });

    if (error) {
        console.error("Error loading positions history:", error);
    }

    return {
        positions: positions ?? []
    };
}
