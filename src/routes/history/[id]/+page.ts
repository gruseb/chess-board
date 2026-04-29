import { supabase } from '$lib/supabaseClient';
import { error } from '@sveltejs/kit';

export async function load({ params }) {
    const { data: game, error: dbError } = await supabase
        .from('partie')
        .select('*')
        .eq('id', params.id)
        .single();

    if (dbError || !game) {
        throw error(404, 'Partie nicht gefunden');
    }

    return { game };
}
