import { supabase } from '$lib/supabaseClient';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ url }) => {
    const positionId = url.searchParams.get('position');
    const studyId = url.searchParams.get('study');

    if (positionId) {
        // Load a single specific position
        const { data, error } = await supabase
            .from('position')
            .select('id, fen, color_to_move, correct_moves, explanation, title, study_id, study_title')
            .eq('id', positionId)
            .single();

        if (error || !data) {
            return { positions: [], studyTitle: 'Studien-Training', studyId: null };
        }

        return {
            positions: [data],
            studyTitle: data.study_title ?? 'Studien-Training',
            studyId: data.study_id
        };
    }

    if (studyId) {
        // Load all positions for this study
        const { data, error } = await supabase
            .from('position')
            .select('id, fen, color_to_move, correct_moves, explanation, title, study_id, study_title')
            .eq('study_id', studyId)
            .order('created_at', { ascending: true });

        if (error || !data || data.length === 0) {
            return { positions: [], studyTitle: 'Studien-Training', studyId };
        }

        return {
            positions: data,
            studyTitle: data[0].study_title ?? 'Studien-Training',
            studyId
        };
    }

    // No params: load all study positions
    const { data, error } = await supabase
        .from('position')
        .select('id, fen, color_to_move, correct_moves, explanation, title, study_id, study_title')
        .not('study_id', 'is', null)
        .order('created_at', { ascending: true });

    if (error || !data || data.length === 0) {
        return { positions: [], studyTitle: 'Studien-Training', studyId: null };
    }

    return {
        positions: data,
        studyTitle: 'Alle Studien',
        studyId: null
    };
};
