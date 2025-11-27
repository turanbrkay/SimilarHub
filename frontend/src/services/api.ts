// API Base URL
const API_BASE = '/api';

// Movie/Show interface matching backend
export interface Show {
    id: number;
    title: string;
    year: number;
    poster_path: string;
    overview?: string;
    genres?: string[];
    popularity?: number;
    similarity_percent?: number;
}

// Search for shows
export async function searchShows(query: string): Promise<Show[]> {
    if (query.length < 2) return [];

    try {
        const response = await fetch(`${API_BASE}/search?q=${encodeURIComponent(query)}`);
        if (!response.ok) throw new Error('Search failed');
        return await response.json();
    } catch (error) {
        console.error('Search error:', error);
        return [];
    }
}

// Get similar shows
export async function getSimilarShows(showId: number): Promise<{ source_item: Show, similar_items: Show[] }> {
    try {
        const response = await fetch(`${API_BASE}/simple-similar/${showId}`);
        if (!response.ok) throw new Error('Failed to get similar shows');
        return await response.json();
    } catch (error) {
        console.error('Similar shows error:', error);
        return { source_item: {} as Show, similar_items: [] };
    }
}

// Get all shows (for initial load)
export async function getAllShows(): Promise<Show[]> {
    try {
        // Backend doesn't have a "get all" endpoint, so we'll search with empty query
        // or common letters to get popular shows
        const response = await fetch(`${API_BASE}/search?q=`);
        if (!response.ok) {
            // If that fails, try searching for common term
            const fallback = await fetch(`${API_BASE}/search?q=the`);
            if (!fallback.ok) return [];
            return await fallback.json();
        }
        return await response.json();
    } catch (error) {
        console.error('Get all shows error:', error);
        return [];
    }
}
