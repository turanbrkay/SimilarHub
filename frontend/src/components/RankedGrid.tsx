import React from 'react';
import type { Show } from '../services/api';
import '../styles/RankedGrid.css';

interface RankedGridProps {
    shows: Show[];
    onShowClick: (showId: number) => void;
    myList?: Show[];
    onToggleList?: (show: Show) => void;
}

const RankedGrid: React.FC<RankedGridProps> = ({ shows, onShowClick }) => {
    const topTenShows = shows.slice(0, 10);

    const getDisplayName = (show: Show): string => {
        return show.title || show.name || 'Unknown';
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
                    const rank = index + 1;

                    return (
                        <div
                            key={show.id}
                            className="ranked-grid-item"
                            onClick={() => onShowClick(show.id)}
                        >
                            <div className={`ranked-number ${rank === 10 ? 'ranked-number-double' : ''}`}>{rank}</div>
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
                    );
                })}
            </div>
        </div>
    );
};

export default RankedGrid;
