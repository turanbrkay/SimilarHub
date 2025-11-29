import React from 'react';
import type { Show } from '../services/api';
import '../styles/RankedGrid.css';

interface RankedGridProps {
    shows: Show[];
    onShowClick: (showId: number) => void;
    myList?: Show[];
    onToggleList?: (show: Show) => void;
}

const RankedGrid: React.FC<RankedGridProps> = ({ shows, onShowClick, myList = [], onToggleList }) => {
    const topTenShows = shows.slice(0, 10);

    const getDisplayName = (show: Show): string => {
        return show.title || show.name || 'Unknown';
    };

    const isInMyList = (show: Show): boolean => {
        return myList.some(s => String(s.id) === String(show.id));
    };

    const handleToggleList = (e: React.MouseEvent, show: Show) => {
        e.stopPropagation();
        if (onToggleList) {
            onToggleList(show);
        }
    };

    if (topTenShows.length === 0) {
        return null;
    }

    return (
        <div className="ranked-grid-section">
            <div className="ranked-grid-header">
                <div className="ranked-grid-bg-text">TODAY'S</div>
                <div className="ranked-grid-title">
                    <span>TOP</span>
                    <span>MOVIES</span>
                </div>
            </div>

            <div className="ranked-grid-container">
                {topTenShows.map((show, index) => {
                    const displayName = getDisplayName(show);
                    const inList = isInMyList(show);
                    const rank = index + 1;

                    return (
                        <div
                            key={show.id}
                            className="ranked-grid-item"
                            onClick={() => onShowClick(show.id)}
                        >
                            <div className="ranked-number">{rank}</div>
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

                                {onToggleList && (
                                    <div className="ranked-card-actions">
                                        <button
                                            className={`action-icon-btn ${inList ? 'active' : ''}`}
                                            onClick={(e) => handleToggleList(e, show)}
                                            aria-label={inList ? 'Remove from list' : 'Add to list'}
                                        >
                                            <svg viewBox="0 0 24 24">
                                                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                                            </svg>
                                        </button>
                                        <button
                                            className="action-icon-btn"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                            }}
                                            aria-label="Bookmark"
                                        >
                                            <svg viewBox="0 0 24 24">
                                                <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                                            </svg>
                                        </button>
                                    </div>
                                )}

                                <div className="ranked-card-info">
                                    <h3>{displayName}</h3>
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
