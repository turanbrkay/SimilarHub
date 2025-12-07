import React, { useState, useEffect, useCallback } from 'react';
import { getSimilarMap, type Show } from '../services/api';
import DetailConnectionMap from './DetailConnectionMap';
import '../styles/SimilarShows.css';

interface SimilarShowsProps {
    showId: number;
    onBack: () => void;
    onShowClick: (showId: number) => void;
}

const ITEMS_PER_ROW = 7;
const INITIAL_ROWS = 1; // Reduced from 3 to 1 for faster initial load
const MAX_ROWS = 30;

const SimilarShows: React.FC<SimilarShowsProps> = ({ showId, onBack, onShowClick }) => {
    const [sourceShow, setSourceShow] = useState<Show | null>(null);

    // allSimilarShows holds the full list fetched from API (up to 210 items)
    const [allSimilarShows, setAllSimilarShows] = useState<Show[]>([]);

    // visibleRows controls how many rows (chunks of 7) are currently rendered
    const [visibleRows, setVisibleRows] = useState(INITIAL_ROWS);

    const [isLoading, setIsLoading] = useState(true);

    // Tab state for sidebar
    const [activeTab, setActiveTab] = useState<'overview' | 'casts' | 'reviews' | 'related'>('overview');

    // Deferred rendering for connection map to prevent initial CPU spike
    const [showConnectionMap, setShowConnectionMap] = useState(false);

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

                // Delay connection map rendering to allow grid to load first
                setShowConnectionMap(false);
                setTimeout(() => setShowConnectionMap(true), 1000); // 1 second delay
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

        // Check if we are near bottom of the page (within 1000px)
        const scrolledToBottom =
            window.innerHeight + window.scrollY >= document.documentElement.offsetHeight - 1000;

        if (scrolledToBottom) {
            // Append exactly one row
            setVisibleRows(prev => prev + 1);
        }
    }, [visibleRows, allSimilarShows.length]);

    // Attach scroll listener with debounce
    useEffect(() => {
        let timeoutId: ReturnType<typeof setTimeout>;

        const onScroll = () => {
            if (timeoutId) return;
            timeoutId = setTimeout(() => {
                handleScroll();
                timeoutId = undefined as any;
            }, 20); // Reduced from 100ms
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
        const date = show.release_date || show.first_air_date;
        return date ? new Date(date).getFullYear().toString() : '';
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

    // Render tab content
    const renderTabContent = () => {
        switch (activeTab) {
            case 'overview':
                return (
                    <div className="detail-sidebar-content">
                        {/* Overview */}
                        {sourceShow.overview && (
                            <div className="detail-metadata-group">
                                <div className="detail-metadata-label">Overview</div>
                                <div className="detail-metadata-value">{sourceShow.overview}</div>
                            </div>
                        )}

                        {/* Release Date */}
                        {(sourceShow.year || sourceShow.first_air_date) && (
                            <div className="detail-metadata-group">
                                <div className="detail-metadata-label">Release Date</div>
                                <div className="detail-metadata-value">
                                    {year || (sourceShow.first_air_date && new Date(sourceShow.first_air_date).toLocaleDateString())}
                                </div>
                            </div>
                        )}

                        {/* Rating */}
                        {sourceShow.vote_average && (
                            <div className="detail-metadata-group">
                                <div className="detail-metadata-label">Rating</div>
                                <div className="detail-metadata-value">
                                    ⭐ {sourceShow.vote_average.toFixed(1)} ({formatVoteCount(sourceShow.vote_count || 0)} votes)
                                </div>
                            </div>
                        )}

                        {/* Seasons/Episodes */}
                        {sourceShow.number_of_seasons && (
                            <div className="detail-metadata-group">
                                <div className="detail-metadata-label">Seasons & Episodes</div>
                                <div className="detail-metadata-value">
                                    {sourceShow.number_of_seasons} Season{sourceShow.number_of_seasons > 1 ? 's' : ''}
                                    {sourceShow.number_of_episodes && ` • ${sourceShow.number_of_episodes} Episodes`}
                                </div>
                            </div>
                        )}

                        {/* Genres */}
                        {sourceShow.genres && sourceShow.genres.length > 0 && (
                            <div className="detail-metadata-group">
                                <div className="detail-metadata-label">Genres</div>
                                <div className="detail-genre-list">
                                    {sourceShow.genres.map(genre => (
                                        <span key={genre} className="detail-genre-tag">{genre}</span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                );
            case 'casts':
            case 'reviews':
            case 'related':
                return (
                    <div className="detail-sidebar-content">
                        <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--color-text-muted)' }}>
                            <p>Coming soon...</p>
                        </div>
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <div className="similar-detail-page">
            {/* NEW: Split Hero Layout */}
            <div className="detail-hero-split-layout">
                <div className="detail-hero-card-wrapper">
                    {/* Inner Card Container (Rounded & Shadowed) */}
                    <div className="detail-hero-inner-card">
                        {/* Inner Content Wrapper for Clipping */}
                        <div className="detail-hero-inner-content">
                            {/* Left: Map Area */}
                            <div className="detail-hero-left">
                                {/* Connection Map - Only shown after initial load */}
                                {sourceShow && showConnectionMap && (
                                    <DetailConnectionMap
                                        sourceShow={sourceShow}
                                        similarShows={allSimilarShows}
                                        onShowClick={onShowClick}
                                    />
                                )}
                                {/* Dock Poster - Now inside detail-hero-left for alignment */}
                                <div
                                    className="detail-hero-dock-poster"
                                    onClick={() => onShowClick(sourceShow.id)}
                                >
                                    <div className="dock-poster-inner">
                                        <img
                                            src={
                                                sourceShow.poster_path?.startsWith('http')
                                                    ? sourceShow.poster_path
                                                    : `https://image.tmdb.org/t/p/w500${sourceShow.poster_path}`
                                            }
                                            alt={displayName}
                                            loading="lazy"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Right: Sidebar */}
                            <div className="detail-hero-right">
                                {/* Header with title */}
                                <div className="detail-sidebar-header">
                                    <h1 className="detail-sidebar-title">{displayName}</h1>
                                    <div className="detail-sidebar-meta">
                                        {year && <span>{year}</span>}
                                        {sourceShow.number_of_seasons && (
                                            <span>{sourceShow.number_of_seasons} Season{sourceShow.number_of_seasons > 1 ? 's' : ''}</span>
                                        )}
                                        {sourceShow.source_type && (
                                            <span>{sourceShow.source_type === 'movie' ? 'Movie' : 'TV Show'}</span>
                                        )}
                                    </div>
                                </div>

                                {/* Tabs */}
                                <div className="detail-sidebar-tabs">
                                    <button
                                        className={`detail-sidebar-tab ${activeTab === 'overview' ? 'active' : ''}`}
                                        onClick={() => setActiveTab('overview')}
                                    >
                                        Overview
                                    </button>
                                    <button
                                        className={`detail-sidebar-tab ${activeTab === 'casts' ? 'active' : ''}`}
                                        onClick={() => setActiveTab('casts')}
                                    >
                                        Casts
                                    </button>
                                    <button
                                        className={`detail-sidebar-tab ${activeTab === 'reviews' ? 'active' : ''}`}
                                        onClick={() => setActiveTab('reviews')}
                                    >
                                        Reviews
                                    </button>
                                    <button
                                        className={`detail-sidebar-tab ${activeTab === 'related' ? 'active' : ''}`}
                                        onClick={() => setActiveTab('related')}
                                    >
                                        Related
                                    </button>
                                </div>

                                {/* Tab Content */}
                                {renderTabContent()}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Section 4: "More Like This" Grid - Infinite Scroll Enabled */}
            <div className="similar-grid-section">
                <div className="page-content-width">
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
                                                        <div
                                                            className={`radial-progress ${show.similarity_percent >= 70 ? 'text-green' :
                                                                show.similarity_percent >= 40 ? 'text-yellow' :
                                                                    'text-red'
                                                                }`}
                                                            style={{
                                                                '--value': show.similarity_percent,
                                                                '--size': '36px',
                                                                '--thickness': '2.5px'
                                                            } as React.CSSProperties}
                                                        >
                                                            <span className="radial-progress-text">
                                                                {Math.round(show.similarity_percent)}%
                                                            </span>
                                                        </div>
                                                    </div>
                                                )}
                                                <img
                                                    src={
                                                        show.poster_path?.startsWith('http')
                                                            ? show.poster_path
                                                            : `https://image.tmdb.org/t/p/w500${show.poster_path}`
                                                    }
                                                    alt={showDisplayName}
                                                    loading="lazy"
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

                    {/* Loading Spacer / Buffer to prevent footer jump */}
                    {visibleRows < MAX_ROWS && (visibleRows * ITEMS_PER_ROW) < allSimilarShows.length && (
                        <div style={{
                            height: '100px',
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            color: 'var(--color-text-muted)',
                            opacity: 0.7
                        }}>
                            <span>Loading more...</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SimilarShows;