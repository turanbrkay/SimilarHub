// API Base URL
const API_BASE = '/api';

// Movie/Show interface matching backend
export interface Show {
    id: number;
    title?: string;      // For compatibility with old data
    name?: string;       // Actual DB field
    year?: number;
    poster_path: string;
    overview?: string;
    genres?: string[];
    popularity?: number;
    similarity_percent?: number;
    vote_average?: number;
    vote_count?: number;
    number_of_seasons?: number;
    number_of_episodes?: number;
    first_air_date?: string;
    backdrop_path?: string;
}

// Search for shows or return popular if query is too short
export async function searchShows(query: string): Promise<Show[]> {
    // Boş string veya 2 karakterden kısa ise: popüler dizileri getir
    if (!query || query.trim().length < 2) {
        try {
            const response = await fetch(`${API_BASE}/shows/popular`);
            if (!response.ok) throw new Error('Popular fetch failed');
            return await response.json();
        } catch (error) {
            console.error('Popular fetch error:', error);
            return [];
        }
    }

    // Normal search
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

export async function getPopularShows(): Promise<Show[]> {
    const res = await fetch(`${API_BASE}/popular-tv`);
    if (!res.ok) {
        console.error('Failed to fetch popular shows');
        return [];
    }
    return res.json();
}

// Get similar items for visual similarity map with enhanced database fields
export async function getSimilarMap(itemId: number): Promise<{ source_item: Show, similar_items: Show[] }> {
    try {
        const response = await fetch(`${API_BASE}/similar-map/${itemId}`);
        if (!response.ok) throw new Error('Failed to get similar items');
        return await response.json();
    } catch (error) {
        console.error('Similar map error:', error);
        return { source_item: {} as Show, similar_items: [] };
    }
}
