import React, { useState, useEffect } from 'react';
import * as api from '../services/api';
import type { Show } from '../services/api';
import '../styles/RankedGrid.css';

interface RankedGridProps {
    onShowClick: (showId: number) => void;
}

type ContentType = 'MOVIES' | 'TV SHOWS' | 'BOOKS';

const RankedGrid: React.FC<RankedGridProps> = ({ onShowClick }) => {
    const [selectedType, setSelectedType] = useState<ContentType>('MOVIES');
    const [shows, setShows] = useState<Show[]>([]);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

    useEffect(() => {
        fetchContentByType(selectedType);
    }, [selectedType]);

    const fetchContentByType = async (type: ContentType) => {
        try {
            let newShows: Show[] = [];

            if (type === 'MOVIES') {
                // Fetch by genre (simulate movies)
                newShows = await api.getByGenre('Action');
            } else if (type === 'TV SHOWS') {
                // Fetch popular (actual TV shows)
                newShows = await api.getPopularShows();
            } else if (type === 'BOOKS') {
                // Fetch different genre (simulate books)
                newShows = await api.getByGenre('Drama');
            }

            // Update shows after fetch completes
            setShows(newShows.slice(0, 10));

        } catch (error) {
            console.error('Failed to fetch content:', error);
        }
    };

    const handleTypeChange = (type: ContentType) => {
        if (type !== selectedType) {
            setSelectedType(type);
        }
        setIsDropdownOpen(false);
    };

    const getDisplayName = (show: Show): string => {
        return show.title || show.name || 'Unknown';
    };

    const topTenShows = shows.slice(0, 10);

    if (topTenShows.length === 0) {
        return null;
    }

    const contentTypes: ContentType[] = ['MOVIES', 'TV SHOWS', 'BOOKS'];

    return (
        <div className="ranked-grid-section">
            <div className="ranked-grid-header">
                <div className="ranked-grid-bg-text">TODAY'S</div>
                <div className="ranked-grid-title">
                    <span>TOP</span>
                    <span key={selectedType} className="ranked-grid-title-text">
                        {selectedType}
                    </span>
                </div>
            </div>

            <div className="ranked-grid-container">
                <div className="ranked-dropdown-wrapper">
                    <button
                        className="ranked-dropdown-button"
                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    >
                        {selectedType}
                        <svg
                            className={`ranked-dropdown-arrow ${isDropdownOpen ? 'open' : ''}`}
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                        >
                            <polyline points="6 9 12 15 18 9" />
                        </svg>
                    </button>
                    {isDropdownOpen && (
                        <div className="ranked-dropdown-menu">
                            {contentTypes.map((type) => (
                                <button
                                    key={type}
                                    className={`ranked-dropdown-item ${selectedType === type ? 'active' : ''}`}
                                    onClick={() => handleTypeChange(type)}
                                >
                                    {type}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {topTenShows.map((show, index) => {
                    const displayName = getDisplayName(show);
                    const rank = index + 1;

                    return (
                        <div
                            key={`${selectedType}-${show.id}`}
                            className="ranked-grid-item"
                            data-card="true"
                            style={{ '--stagger-index': index } as React.CSSProperties}
                            onClick={() => onShowClick(show.id)}
                        >
                            <div className="ranked-card-wrapper">
                                <div className={`ranked-number ${rank === 10 ? 'ranked-number-double' : ''}`}>
                                    {rank}
                                </div>
                                <div className="ranked-card">
                                    <div className="ranked-card-poster">
                                        {show.poster_path ? (
                                            <img
                                                src={`https://image.tmdb.org/t/p/w500${show.poster_path}`}
                                                alt={displayName}
                                            />
                                        ) : (
                                            <div className="ranked-card-no-image">
                                                No Image
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default RankedGrid;
