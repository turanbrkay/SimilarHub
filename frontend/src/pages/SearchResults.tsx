import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { searchShows, type Show } from '../services/api';
import '../styles/SimilarShows.css'; // Reusing existing styles for consistency

const SearchResults: React.FC = () => {
    const [searchParams] = useSearchParams();
    const query = searchParams.get('query') || '';
    const navigate = useNavigate();

    const [results, setResults] = useState<Show[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        const fetchResults = async () => {
            if (!query) {
                setResults([]);
                return;
            }

            setIsLoading(true);
            try {
                const data = await searchShows(query);
                setResults(data);
            } catch (error) {
                console.error("Failed to search shows", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchResults();
    }, [query]);

    const handleShowClick = (showId: number) => {
        navigate(`/details/${showId}`);
    };

    const getDisplayName = (show: Show): string => {
        return show.title || show.name || 'Unknown';
    };

    return (
        <div className="similar-detail-page" style={{ paddingTop: '80px', minHeight: '100vh' }}>
            <div className="page-content-width">
                <h1 className="similar-grid-title" style={{ marginTop: '2rem', marginBottom: '2rem' }}>
                    Results for "{query}"
                </h1>

                {isLoading ? (
                    <div style={{ padding: '2rem', textAlign: 'center', color: 'white' }}>
                        <h2>Loading...</h2>
                    </div>
                ) : results.length === 0 ? (
                    <div style={{ color: 'var(--color-text-muted)', padding: '2rem', textAlign: 'center' }}>
                        No results found for "{query}".
                    </div>
                ) : (
                    <div className="similar-grid-container">
                        {results.map((show) => {
                            const showDisplayName = getDisplayName(show);
                            // Mock similarity percent for visual consistency if needed, or omit badge
                            // For now, we'll omit the badge as it's a search result, not a similarity match

                            return (
                                <div
                                    key={show.id}
                                    className="similar-grid-card"
                                    onClick={() => handleShowClick(show.id)}
                                >
                                    <div className="similar-grid-card-poster">
                                        {show.poster_path ? (
                                            <img
                                                src={`https://image.tmdb.org/t/p/w500${show.poster_path}`}
                                                alt={showDisplayName}
                                            />
                                        ) : (
                                            <div style={{
                                                width: '100%',
                                                height: '100%',
                                                backgroundColor: '#333',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                color: '#aaa'
                                            }}>
                                                No Image
                                            </div>
                                        )}
                                    </div>

                                    <div className="similar-grid-card-info">
                                        <h3>{showDisplayName}</h3>
                                        <div className="similar-grid-card-meta">
                                            <span>{show.year || (show.first_air_date ? new Date(show.first_air_date).getFullYear() : '')}</span>
                                            {/* We might not have source_type from searchShows, so we can check properties or default */}
                                            <span>{show.title ? 'Movie' : 'TV Show'}</span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default SearchResults;
