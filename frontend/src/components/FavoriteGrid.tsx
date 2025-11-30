import React, { useState, useEffect } from 'react';
import * as api from '../services/api';
import type { Show } from '../services/api';
import '../styles/FavoriteGrid.css';

interface FavoriteGridProps {
    onShowClick: (showId: number) => void;
}

type ContentType = 'MOVIES' | 'TV SHOWS' | 'BOOKS';

const FavoriteGrid: React.FC<FavoriteGridProps> = ({ onShowClick }) => {
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
                newShows = await api.getByGenre('Action', 'movie');
            } else if (type === 'TV SHOWS') {
                newShows = await api.getPopularShows();
            } else if (type === 'BOOKS') {
                newShows = await api.getPopularBooks();
            }

            setShows(newShows.slice(0, 5));
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

    const getYear = (show: Show): string => {
        if (show.year) return String(show.year);
        if (show.first_air_date) {
            return show.first_air_date.substring(0, 4);
        }
        return '';
    };

    const featuredShow = shows.length > 0 ? shows[0] : null;
    const regularShows = shows.slice(1, 5);

    if (shows.length === 0) {
        return null;
    }

    const contentTypes: ContentType[] = ['MOVIES', 'TV SHOWS', 'BOOKS'];

    return (
        <div className="favorite-grid-section">
            <div className="favorite-grid-header">
                <div className="favorite-grid-bg-text">FAVORITE</div>
                <div className="favorite-grid-title">
                    <span>ALL TIME</span>
                    <span key={selectedType} className="favorite-grid-title-text">
                        {selectedType}
                    </span>
                </div>

                <div className="favorite-dropdown-wrapper">
                    <button
                        className="favorite-dropdown-button"
                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    >
                        {selectedType}
                        <svg
                            className={`favorite-dropdown-arrow ${isDropdownOpen ? 'open' : ''}`}
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
                        <div className="favorite-dropdown-menu">
                            {contentTypes.map((type) => (
                                <button
                                    key={type}
                                    className={`favorite-dropdown-item ${selectedType === type ? 'active' : ''}`}
                                    onClick={() => handleTypeChange(type)}
                                >
                                    {type}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <div className="favorite-grid-container">
                {featuredShow && (
                    <div
                        className="favorite-grid-item favorite-grid-item-featured"
                        onClick={() => onShowClick(featuredShow.id)}
                    >
                        <img
                            className="favorite-featured-backdrop"
                            src={featuredShow.backdrop_path
                                ? `https://image.tmdb.org/t/p/w780${featuredShow.backdrop_path}`
                                : featuredShow.poster_path
                                    ? `https://image.tmdb.org/t/p/w780${featuredShow.poster_path}`
                                    : ''}
                            alt=""
                        />

                        <div className="favorite-featured-overlay" />

                        <div className="favorite-featured-content">
                            <div className="favorite-featured-poster">
                                {featuredShow.poster_path ? (
                                    <img
                                        src={`https://image.tmdb.org/t/p/w342${featuredShow.poster_path}`}
                                        alt={getDisplayName(featuredShow)}
                                    />
                                ) : (
                                    <div className="favorite-no-image">No Image</div>
                                )}
                            </div>

                            <div className="favorite-featured-info">
                                <h2 className="favorite-featured-title">
                                    {getDisplayName(featuredShow)}
                                </h2>

                                <div className="favorite-featured-meta">
                                    {featuredShow.vote_average && (
                                        <div className="favorite-featured-rating">
                                            <svg stroke="currentColor" fill="yellow" strokeWidth="0" viewBox="0 0 24 24" height="20" width="20" xmlns="http://www.w3.org/2000/svg">
                                                <path fill="none" d="M0 0h24v24H0z"></path>
                                                <path d="M14.43 10 12 2l-2.43 8H2l6.18 4.41L5.83 22 12 17.31 18.18 22l-2.35-7.59L22 10z"></path>
                                            </svg>
                                            <span>{featuredShow.vote_average.toFixed(1)}</span>
                                        </div>
                                    )}
                                    <span className="favorite-featured-year">{getYear(featuredShow)}</span>
                                </div>

                                {featuredShow.overview && (
                                    <p className="favorite-featured-description">
                                        {featuredShow.overview}
                                    </p>
                                )}

                                <button className="favorite-featured-button">
                                    <span className="favorite-button-icon">
                                        <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 384 512" height="18" width="18" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M73 39c-14.8-9.1-33.4-9.4-48.5-.9S0 62.6 0 80L0 432c0 17.4 9.4 33.4 24.5 41.9s33.7 8.1 48.5-.9L361 297c14.3-8.7 23-24.2 23-41s-8.7-32.2-23-41L73 39z"></path>
                                        </svg>
                                    </span>
                                    <span className="favorite-button-text">Start Watching</span>
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {regularShows.map((show) => (
                    <div
                        key={show.id}
                        className="favorite-grid-item"
                        onClick={() => onShowClick(show.id)}
                    >
                        <img
                            className="favorite-card-backdrop"
                            src={show.backdrop_path
                                ? `https://image.tmdb.org/t/p/w780${show.backdrop_path}`
                                : show.poster_path
                                    ? `https://image.tmdb.org/t/p/w780${show.poster_path}`
                                    : ''}
                            alt=""
                        />

                        <div className="favorite-card-overlay" />

                        <div className="favorite-card-content">
                            <h3 className="favorite-card-title">
                                {getDisplayName(show)}
                            </h3>
                            <div className="favorite-card-meta">
                                {show.vote_average && (
                                    <div className="favorite-card-rating">
                                        <svg stroke="currentColor" fill="yellow" strokeWidth="0" viewBox="0 0 24 24" height="20" width="20" xmlns="http://www.w3.org/2000/svg">
                                            <path fill="none" d="M0 0h24v24H0z"></path>
                                            <path d="M14.43 10 12 2l-2.43 8H2l6.18 4.41L5.83 22 12 17.31 18.18 22l-2.35-7.59L22 10z"></path>
                                        </svg>
                                        <span>{show.vote_average.toFixed(1)}</span>
                                    </div>
                                )}
                                <span>{getYear(show)}</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default FavoriteGrid;
