import React, { useState, useEffect } from 'react';
import { getSimilarMap, type Show } from '../services/api';
import SimilarMap from './SimilarMap';
import '../styles/SimilarShows.css';

interface SimilarShowsProps {
    showId: number;
    onBack: () => void;
    onShowClick: (showId: number) => void;
    myList: Show[];
    onToggleList: (show: Show) => void;
}

const SimilarShows: React.FC<SimilarShowsProps> = ({ showId, onBack, onShowClick, myList, onToggleList }) => {
    const [sourceShow, setSourceShow] = useState<Show | null>(null);
    const [similarShows, setSimilarShows] = useState<Show[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const loadSimilar = async () => {
            setIsLoading(true);
            const data = await getSimilarMap(showId);
            setSourceShow(data.source_item);
            setSimilarShows(data.similar_items || []);
            setIsLoading(false);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        };
        loadSimilar();
    }, [showId]);

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
            return `${(count / 1000).toFixed(1)}K`;
        }
        return String(count);
    };

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

                <div className="detail-hero-content">
                    {/* Left: Poster */}
                    <div className="detail-hero-poster">
                        <img
                            src={`https://image.tmdb.org/t/p/w500${sourceShow.poster_path}`}
                            alt={displayName}
                        />
                    </div>

                    {/* Right: Metadata */}
                    <div className="detail-hero-metadata">
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
                        <div className="detail-hero-badges">
                            {sourceShow.vote_average && (
                                <div className="detail-hero-badge score">
                                    <span className="detail-hero-badge-icon">⭐</span>
                                    <span>{sourceShow.vote_average.toFixed(1)}</span>
                                </div>
                            )}
                            {sourceShow.vote_count && (
                                <div className="detail-hero-badge">
                                    <span>{formatVoteCount(sourceShow.vote_count)} votes</span>
                                </div>
                            )}
                            {sourceShow.number_of_episodes && (
                                <div className="detail-hero-badge">
                                    <span>{sourceShow.number_of_episodes} Episodes</span>
                                </div>
                            )}
                        </div>

                        {/* Overview */}
                        {sourceShow.overview && (
                            <p className="detail-hero-overview">{sourceShow.overview}</p>
                        )}
                    </div>
                </div>
            </div>

            {/* Section 3: Visual Similarity Map */}
            {similarShows.length > 0 && (
                <SimilarMap
                    sourceShow={sourceShow}
                    similarShows={similarShows}
                    onShowClick={onShowClick}
                />
            )}

            {/* Section 4: "More Like This" Grid */}
            <div className="similar-grid-section">
                <h2 className="similar-grid-title">More Like This</h2>

                {similarShows.length === 0 ? (
                    <div style={{ color: 'var(--color-text-muted)', padding: '2rem', textAlign: 'center' }}>
                        No similar shows found.
                    </div>
                ) : (
                    <div className="similar-grid-container">
                        {similarShows.map((show) => {
                            const showDisplayName = getDisplayName(show);
                            const showYear = getYear(show);

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
                )}
            </div>
        </div>
    );
};

export default SimilarShows;
