import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

const DEFAULT_RATING = 1500;

export const GET: RequestHandler = async ({ url, fetch }) => {
    const ratingParam = url.searchParams.get('rating');
    const parsedRating = Number.parseInt(ratingParam ?? `${DEFAULT_RATING}`, 10);
    const rating = Number.isFinite(parsedRating) ? parsedRating : DEFAULT_RATING;

    try {
        const response = await fetch(
            `https://chess-puzzles-api.vercel.app/puzzles?min_rating=${rating}&max_rating=${rating + 100}&limit=1`
        );

        if (!response.ok) {
            return json({ error: 'Upstream tactics service failed.' }, { status: response.status });
        }

        const data = await response.json();
        return json(Array.isArray(data) ? data : []);
    } catch (error) {
        console.error('Failed to fetch tactics puzzle from upstream API:', error);
        return json({ error: 'Unable to load tactics puzzle.' }, { status: 502 });
    }
};