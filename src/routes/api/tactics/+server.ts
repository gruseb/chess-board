import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

const DEFAULT_RATING = 1500;
const PUZZLE_POOL_SIZE = 12;

function getPuzzleId(puzzle: unknown): string | null {
    if (!puzzle || typeof puzzle !== 'object') {
        return null;
    }

    const record = puzzle as { puzzleid?: unknown; PuzzleId?: unknown };
    const puzzleId = record.puzzleid ?? record.PuzzleId;
    return typeof puzzleId === 'string' ? puzzleId : null;
}

export const GET: RequestHandler = async ({ url, fetch }) => {
    const ratingParam = url.searchParams.get('rating');
    const parsedRating = Number.parseInt(ratingParam ?? `${DEFAULT_RATING}`, 10);
    const rating = Number.isFinite(parsedRating) ? parsedRating : DEFAULT_RATING;
    const excludePuzzleId = url.searchParams.get('exclude');

    try {
        const response = await fetch(
            `https://chess-puzzles-api.vercel.app/puzzles?min_rating=${rating}&max_rating=${rating + 100}&limit=${PUZZLE_POOL_SIZE}`
        );

        if (!response.ok) {
            return json({ error: 'Upstream tactics service failed.' }, { status: response.status });
        }

        const data = await response.json();
        const puzzles = Array.isArray(data) ? data : [];
        const candidates = excludePuzzleId
            ? puzzles.filter((puzzle) => getPuzzleId(puzzle) !== excludePuzzleId)
            : puzzles;
        const pool = candidates.length > 0 ? candidates : puzzles;

        if (pool.length === 0) {
            return json([]);
        }

        const selectedPuzzle = pool[Math.floor(Math.random() * pool.length)];
        return json([selectedPuzzle]);
    } catch (error) {
        console.error('Failed to fetch tactics puzzle from upstream API:', error);
        return json({ error: 'Unable to load tactics puzzle.' }, { status: 502 });
    }
};