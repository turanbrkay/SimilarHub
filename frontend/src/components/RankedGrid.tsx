import React, { useState } from 'react';
import type { Show } from '../services/api';
import '../styles/RankedGrid.css';

interface RankedGridProps {
    shows: Show[];
    onShowClick: (showId: number) => void;
    myList?: Show[];
    onToggleList?: (show: Show) => void;
}

type ContentType = 'MOVIES' | 'TV SHOWS' | 'BOOKS';

const RankedGrid: React.FC<RankedGridProps> = ({ shows, onShowClick }) => {
    const [selectedType, setSelectedType] = useState<ContentType>('MOVIES');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const topTenShows = shows.slice(0, 10);

    const getDisplayName = (show: Show): string => {
        return show.title || show.name || 'Unknown';
    };

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
                    <span>{selectedType}</span>
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
                                    onClick={() => {
                                        setSelectedType(type);
                                        setIsDropdownOpen(false);
                                    }}
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
                            key={show.id}
                            className="ranked-grid-item"
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
