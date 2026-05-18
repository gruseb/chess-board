import { supabase } from '$lib/supabaseClient';

export interface StudyPosition {
    id: string;
    fen: string;
    color_to_move: 'white' | 'black';
    correct_moves: string[] | null;
    explanation: string | null;
    title: string | null;
    study_id: string | null;
    study_title: string | null;
    created_at: string;
}

export async function load() {
    const { data: positions, error } = await supabase
        .from('position')
        .select('id, fen, color_to_move, correct_moves, explanation, title, study_id, study_title, created_at')
        .not('study_id', 'is', null)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error loading study positions:', error);
    }

    // Group by study_title
    const grouped: Record<string, StudyPosition[]> = {};
    for (const pos of positions ?? []) {
        const key = pos.study_title ?? pos.study_id ?? 'Unbekannte Studie';
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(pos as StudyPosition);
    }

    return {
        positions: (positions ?? []) as StudyPosition[],
        grouped
    };
}
