import React, { useState, useEffect, useCallback } from 'react';
import { getSimilarMap, type Show } from '../services/api';
import SimilarMap from './SimilarMap';
import '../styles/SimilarShows.css';

interface SimilarShowsProps {
    showId: number;
    onBack: () => void;
    onShowClick: (showId: number) => void;
}

const ITEMS_PER_ROW = 7;
const INITIAL_ROWS = 3;
const MAX_ROWS = 30;

const SimilarShows: React.FC<SimilarShowsProps> = ({ showId, onBack, onShowClick }) => {
    const [sourceShow, setSourceShow] = useState<Show | null>(null);

    // allSimilarShows holds the full list fetched from API (up to 210 items)
    const [allSimilarShows, setAllSimilarShows] = useState<Show[]>([]);

    // visibleRows controls how many rows (chunks of 7) are currently rendered
    const [visibleRows, setVisibleRows] = useState(INITIAL_ROWS);

    const [isLoading, setIsLoading] = useState(true);

    // Initial Data Fetch
    useEffect(() => {
        const loadSimilar = async () => {
            setIsLoading(true);
            try {
                const data = await getSimilarMap(showId);
                setSourceShow(data.source_item);
                // Set full list and reset view to initial 3 rows
                setAllSimilarShows(data.similar_items || []);
                setVisibleRows(INITIAL_ROWS);
            } catch (error) {
                console.error("Failed to load similar shows", error);
            } finally {
                setIsLoading(false);
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        };
        loadSimilar();
    }, [showId]);

    // Infinite Scroll Handler (Throttled)
    const handleScroll = useCallback(() => {
        // Return early if we've reached max rows or ran out of items
        if (visibleRows >= MAX_ROWS || (visibleRows * ITEMS_PER_ROW) >= allSimilarShows.length) {
            return;
        }

        // Check if we are near bottom of the page (within 400px)
        const scrolledToBottom =
            window.innerHeight + window.scrollY >= document.documentElement.offsetHeight - 400;

        if (scrolledToBottom) {
            // Append exactly one row
            setVisibleRows(prev => prev + 1);
        }
    }, [visibleRows, allSimilarShows.length]);

    // Attach scroll listener with debounce
    useEffect(() => {
        let timeoutId: NodeJS.Timeout;

        const onScroll = () => {
            if (timeoutId) return;
            timeoutId = setTimeout(() => {
                handleScroll();
                timeoutId = undefined as any;
            }, 100);
        };

        window.addEventListener('scroll', onScroll);
        return () => {
            window.removeEventListener('scroll', onScroll);
            if (timeoutId) clearTimeout(timeoutId);
        };
    }, [handleScroll]);

    // Helper functions
    const getDisplayName = (show: Show): string => {
        return show.title || show.name || 'Unknown';
    };

    const getYear = (show: Show): string => {
        if (show.year) return String(show.year);
        if (show.first_air_date) {
            return show.first_air_date.substring(0, 4);
        }
        return '';
    };

    const formatVoteCount = (count: number): string => {
        if (count >= 1000) {
            return `${(count / 1000).toFixed(1)} K`;
        }
        return String(count);
    };

    if (isLoading) {
        return (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'white' }}>
                <h2>Loading...</h2>
            </div>
        );
    }

    if (!sourceShow) {
        return (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'white' }}>
                <h2>Show not found</h2>
                <button onClick={onBack}>Back to Home</button>
            </div>
        );
    }

    // Slice the master list based on current row count
    // This ensures sorting (from API) is preserved and no duplicates occur
    const visibleShows = allSimilarShows.slice(0, visibleRows * ITEMS_PER_ROW);

    const displayName = getDisplayName(sourceShow);
    const year = getYear(sourceShow);
    const backgroundImage = sourceShow.backdrop_path || sourceShow.poster_path;

    return (
        <div className="similar-detail-page">
            {/* Section 2: Detail Hero */}
            <div className="detail-hero">
                <div
                    className="detail-hero-background"
                    style={{
                        backgroundImage: backgroundImage
                            ? `url(https://image.tmdb.org/t/p/original${backgroundImage})`
                            : 'none',
                    }}
                />

                < div className="detail-hero-content" >
                    {/* Left: Poster */}
                    < div className="detail-hero-poster" >
                        <img
                            src={`https://image.tmdb.org/t/p/w500${sourceShow.poster_path}`}
                            alt={displayName}
                        />
                    </div >

                    {/* Right: Metadata */}
                    < div className="detail-hero-metadata" >
                        <h1 className="detail-hero-title">{displayName}</h1>

                        <div className="detail-hero-subtitle">
                            {year && <span>{year}</span>}
                            {sourceShow.number_of_seasons && (
                                <span>{sourceShow.number_of_seasons} Season{sourceShow.number_of_seasons > 1 ? 's' : ''}</span>
                            )}
                            {sourceShow.genres && sourceShow.genres.length > 0 && (
                                <span>{sourceShow.genres.join(', ')}</span>
                            )}
                        </div>

                        {/* Badges */}
                        < div className="detail-hero-badges" >
                            {
                                sourceShow.vote_average && (
                                    <div className="detail-hero-badge score">
                                        <span className="detail-hero-badge-icon">⭐</span>
                                        <span>{sourceShow.vote_average.toFixed(1)}</span>
                                    </div>
                                )
                            }
                            {
                                sourceShow.vote_count && (
                                    <div className="detail-hero-badge">
                                        <span>{formatVoteCount(sourceShow.vote_count)} votes</span>
                                    </div>
                                )
                            }
                            {
                                sourceShow.number_of_episodes && (
                                    <div className="detail-hero-badge">
                                        <span>{sourceShow.number_of_episodes} Episodes</span>
                                    </div>
                                )
                            }
                        </div >

                        {/* Overview */}
                        {
                            sourceShow.overview && (
                                <p className="detail-hero-overview">{sourceShow.overview}</p>
                            )
                        }
                    </div >
                </div >
            </div >

            {/* Section 3: Visual Similarity Map - Uses top 40 from allSimilarShows for the visualization */}
            {
                allSimilarShows.length > 0 && (
                    <SimilarMap
                        sourceShow={sourceShow}
                        similarShows={allSimilarShows.slice(0, 40)}
                        onShowClick={onShowClick}
                    />
                )
            }

            {/* Section 4: "More Like This" Grid - Infinite Scroll Enabled */}
            < div className="similar-grid-section" >
                <h2 className="similar-grid-title">More Like This</h2>

                {
                    visibleShows.length === 0 ? (
                        <div style={{ color: 'var(--color-text-muted)', padding: '2rem', textAlign: 'center' }}>
                            No similar shows found.
                        </div>
                    ) : (
                        <div className="similar-grid-container">
                            {visibleShows.map((show) => {
                                const showDisplayName = getDisplayName(show);

                                return (
                                    <div
                                        key={show.id}
                                        className="similar-grid-card"
                                        onClick={() => onShowClick(show.id)}
                                    >
                                        <div className="similar-grid-card-poster">
                                            {show.similarity_percent && (
                                                <div className="similar-grid-card-badge">
                                                    {show.similarity_percent}%
                                                </div>
                                            )}
                                            <img
                                                src={`https://image.tmdb.org/t/p/w500${show.poster_path}`}
                                                alt={showDisplayName}
                                            />
                                        </div>

                                        <div className="similar-grid-card-info">
                                            <h3>{showDisplayName}</h3>
                                            <div className="similar-grid-card-meta">
                                                <span>{show.source_type === 'movie' ? 'Movie' : 'TV Show'}</span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )
                }
            </div >
        </div >
    );
};

export default SimilarShows;